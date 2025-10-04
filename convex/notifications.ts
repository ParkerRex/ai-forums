/**
 * @fileoverview Notifications Module - Real-time user engagement and alert system
 *
 * This module manages the notification system that keeps users engaged and informed
 * about community activity. It handles mentions, replies, votes, reports, and other
 * social interactions with intelligent deduplication and delivery optimization.
 *
 * Key features:
 * - Real-time notification delivery
 * - Intelligent deduplication to prevent spam
 * - Multiple notification types (mentions, replies, votes, etc.)
 * - Read/unread state management
 * - Batch operations for performance
 * - Self-notification suppression
 * - Notification cleanup and archival
 * - Integration with all social features
 *
 * The system is designed for high throughput and provides the foundation
 * for building notification centers and real-time engagement features.
 *
 * @author VAI Development Team
 * @version 1.0.0
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthenticatedMember } from "./auth";

/**
 * Creates a new notification with intelligent deduplication and validation.
 *
 * This internal helper is called by other modules (posts, comments, votes) to
 * create notifications. It handles deduplication to prevent spam, suppresses
 * self-notifications, and manages the notification lifecycle.
 *
 * @param ctx - Mutation context for database operations
 * @param args - Notification parameters
 * @param args.recipientId - Member receiving the notification
 * @param args.type - Type of notification (mention, reply, upvote, etc.)
 * @param args.entityType - Type of entity (post or comment)
 * @param args.entityId - ID of the related entity
 * @param args.actorId - Member who triggered the notification
 * @param args.message - Human-readable notification message
 * @returns Notification ID if created, null if suppressed
 *
 * @example
 * ```typescript
 * const notificationId = await insertNotification(ctx, {
 *   recipientId: "user123",
 *   type: "mention",
 *   entityType: "post",
 *   entityId: "post456",
 *   actorId: "user789",
 *   message: "John mentioned you in a post"
 * });
 * ```
 */
export async function insertNotification(
  ctx: MutationCtx,
  args: {
    recipientId: Id<"members">;
    type: "mention" | "reply" | "upvote" | "follow" | "comment_report";
    entityType: "post" | "comment";
    entityId: string;
    actorId: Id<"members">;
    message: string;
  },
): Promise<Id<"notifications"> | null> {
  // Suppress self-notifications
  if (args.recipientId === args.actorId) {
    return null;
  }

  // Check for existing notification to avoid duplicates
  const existingNotification = await ctx.db
    .query("notifications")
    .withIndex("by_recipient", (q) => q.eq("recipientId", args.recipientId))
    .filter((q) =>
      q.and(
        q.eq(q.field("type"), args.type),
        q.eq(q.field("entityType"), args.entityType),
        q.eq(q.field("entityId"), args.entityId),
        q.eq(q.field("actorId"), args.actorId),
      ),
    )
    .first();

  if (existingNotification) {
    // Update existing notification with new message and mark as unread
    await ctx.db.patch(existingNotification._id, {
      message: args.message,
      read: false,
      createdAt: Date.now(),
    });
    return existingNotification._id;
  }

  // Create new notification
  return await ctx.db.insert("notifications", {
    recipientId: args.recipientId,
    type: args.type,
    entityType: args.entityType,
    entityId: args.entityId,
    actorId: args.actorId,
    message: args.message,
    read: false,
    createdAt: Date.now(),
  });
}

/**
 * Retrieves paginated notifications for the current authenticated user.
 *
 * Returns notifications sorted by creation time (newest first) with complete
 * context including actor information and related content references.
 * Used for building notification centers and activity feeds.
 *
 * @param limit - Maximum number of notifications to return (default: 50)
 * @returns Array of enriched notification objects with actor details
 *
 * @example
 * ```typescript
 * const notifications = await getNotifications({ limit: 20 });
 * // Returns notifications with actor names and content context
 * ```
 */
export const getNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("notifications"),
      _creationTime: v.number(),
      recipientId: v.id("members"),
      type: v.union(
        v.literal("mention"),
        v.literal("reply"),
        v.literal("upvote"),
        v.literal("follow"),
        v.literal("comment_report"),
      ),
      entityType: v.union(v.literal("post"), v.literal("comment")),
      entityId: v.string(),
      actorId: v.id("members"),
      message: v.string(),
      read: v.boolean(),
      createdAt: v.number(),
      actor: v.union(
        v.object({
          _id: v.id("members"),
          firstName: v.string(),
          lastName: v.string(),
          slug: v.string(),
          avatarUrl: v.optional(v.string()),
        }),
        v.null(),
      ),
      timeAgo: v.string(),
      // Additional fields for link construction
      postId: v.union(v.id("posts"), v.null()),
      postSlug: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const member = await getAuthenticatedMember(ctx);
    if (!member) {
      return [];
    }

    const limit = args.limit || 20;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", member._id))
      .order("desc")
      .take(limit);

    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const actor = await ctx.db.get(notification.actorId);
        const timeAgo = getTimeAgo(notification.createdAt);

        // Get post information for link construction
        let postId: Id<"posts"> | null = null;
        let postSlug: string | null = null;

        if (notification.entityType === "post") {
          // For post notifications, entityId is the post ID
          postId = notification.entityId as Id<"posts">;
          const post = await ctx.db.get(postId);
          postSlug = post?.slug || null;
        } else if (notification.entityType === "comment") {
          // For comment notifications, entityId is the comment ID, we need to get the post
          const comment = await ctx.db.get(notification.entityId as Id<"comments">);
          if (comment) {
            postId = comment.postId;
            const post = await ctx.db.get(comment.postId);
            postSlug = post?.slug || null;
          }
        }

        return {
          ...notification,
          actor: actor
            ? {
                _id: actor._id,
                firstName: actor.firstName,
                lastName: actor.lastName,
                slug: actor.slug,
                avatarUrl: actor.avatarUrl,
              }
            : null,
          timeAgo,
          postId,
          postSlug,
        };
      }),
    );

    return enrichedNotifications;
  },
});

export const getUnreadNotificationCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx, _args) => {
    const member = await getAuthenticatedMember(ctx);
    if (!member) {
      return 0;
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_and_read", (q) => q.eq("recipientId", member._id).eq("read", false))
      .collect();

    return unreadNotifications.length;
  },
});

export const createNotification = mutation({
  args: {
    recipientId: v.id("members"),
    type: v.union(
      v.literal("mention"),
      v.literal("reply"),
      v.literal("upvote"),
      v.literal("follow"),
      v.literal("comment_report"),
    ),
    entityType: v.union(v.literal("post"), v.literal("comment")),
    entityId: v.string(),
    actorId: v.id("members"),
    message: v.string(),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    if (args.recipientId === args.actorId) {
      throw new Error("Cannot create notification for self");
    }

    const existingNotification = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", args.recipientId))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), args.type),
          q.eq(q.field("entityType"), args.entityType),
          q.eq(q.field("entityId"), args.entityId),
          q.eq(q.field("actorId"), args.actorId),
        ),
      )
      .first();

    if (existingNotification) {
      await ctx.db.patch(existingNotification._id, {
        message: args.message,
        read: false,
        createdAt: Date.now(),
      });
      return existingNotification._id;
    }

    return await ctx.db.insert("notifications", {
      recipientId: args.recipientId,
      type: args.type,
      entityType: args.entityType,
      entityId: args.entityId,
      actorId: args.actorId,
      message: args.message,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      read: true,
    });
    return null;
  },
});

export const markAllNotificationsAsRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx, _args) => {
    const member = await getAuthenticatedMember(ctx);
    if (!member) {
      throw new Error("Not authenticated");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_and_read", (q) => q.eq("recipientId", member._id).eq("read", false))
      .collect();

    await Promise.all(
      unreadNotifications.map((notification) => ctx.db.patch(notification._id, { read: true })),
    );

    return null;
  },
});

// TODO: Re-implement when payment system is integrated
// export const sendRenewalReminder = internalMutation({
//   args: {
//     memberId: v.id("members"),
//     daysUntilRenewal: v.number(),
//     subscriptionEndDate: v.number(),
//   },
//   handler: async (ctx, args) => {
//     const member = await ctx.db.get(args.memberId);
//     if (!member) return;
//
//     // Check if we already sent a reminder for this period
//     const existingReminder = await ctx.db
//       .query("notifications")
//       .withIndex("by_recipient", (q) => q.eq("recipientId", args.memberId))
//       .filter((q) =>
//         q.and(
//           q.eq(q.field("type"), "payment_reminder"),
//           q.eq(q.field("entityType"), "payment"),
//           q.gte(q.field("createdAt"), Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
//         ),
//       )
//       .first();
//
//     if (existingReminder) {
//       return; // Don't send duplicate reminders
//     }
//
//     const formattedDate = new Date(args.subscriptionEndDate).toLocaleDateString("en-US", {
//       month: "long",
//       day: "numeric",
//       year: "numeric",
//     });
//
//     let message: string;
//     if (args.daysUntilRenewal === 7) {
//       message = `Your subscription will renew in 7 days on ${formattedDate}`;
//     } else if (args.daysUntilRenewal === 3) {
//       message = `Your subscription will renew in 3 days on ${formattedDate}`;
//     } else if (args.daysUntilRenewal === 1) {
//       message = `Your subscription will renew tomorrow on ${formattedDate}`;
//     } else {
//       message = `Your subscription will renew on ${formattedDate}`;
//     }
//
//     await ctx.db.insert("notifications", {
//       recipientId: args.memberId,
//       type: "payment_reminder",
//       entityType: "payment",
//       entityId: member.stripeSubscriptionId || "subscription",
//       actorId: args.memberId, // System notification, use member as actor
//       message,
//       read: false,
//       createdAt: Date.now(),
//     });
//   },
// });

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return "now";
  }
}
