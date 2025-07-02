import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedMember } from "./auth";

export const getNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("notifications"),
    _creationTime: v.number(),
    recipientId: v.id("members"),
    type: v.union(
      v.literal("mention"),
      v.literal("reply"),
      v.literal("upvote"),
      v.literal("follow")
    ),
    entityType: v.union(
      v.literal("post"),
      v.literal("comment")
    ),
    entityId: v.string(),
    actorId: v.id("members"),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
    actor: v.union(v.object({
      _id: v.id("members"),
      firstName: v.string(),
      lastName: v.string(),
      slug: v.string(),
    }), v.null()),
    timeAgo: v.string(),
  })),
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

        return {
          ...notification,
          actor: actor ? {
            _id: actor._id,
            firstName: actor.firstName,
            lastName: actor.lastName,
            slug: actor.slug,
          } : null,
          timeAgo,
        };
      })
    );

    return enrichedNotifications;
  },
});

export const getUnreadNotificationCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx, args) => {
    const member = await getAuthenticatedMember(ctx);
    if (!member) {
      return 0;
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_and_read", (q) => 
        q.eq("recipientId", member._id).eq("read", false)
      )
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
      v.literal("follow")
    ),
    entityType: v.union(
      v.literal("post"),
      v.literal("comment")
    ),
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
          q.eq(q.field("actorId"), args.actorId)
        )
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
  handler: async (ctx, args) => {
    const member = await getAuthenticatedMember(ctx);
    if (!member) {
      throw new Error("Not authenticated");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_and_read", (q) => 
        q.eq("recipientId", member._id).eq("read", false)
      )
      .collect();

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { read: true })
      )
    );

    return null;
  },
});

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
