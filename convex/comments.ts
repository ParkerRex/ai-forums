/**
 * @fileoverview Comments Module - Threaded discussion system with rich content support
 * 
 * This module manages the hierarchical comment system that enables threaded discussions
 * on posts. It supports unlimited nesting depth, rich media attachments, edit history,
 * voting, moderation, and real-time collaboration features.
 * 
 * Key features:
 * - Threaded comment system with unlimited nesting
 * - Rich media attachments (images, documents, GIFs)
 * - Edit history tracking and transparency
 * - Vote/reputation system for comments
 * - Mention notifications and social features
 * - Comment reordering and moderation tools
 * - Duplicate detection and spam prevention
 * - Content reporting and safety features
 * 
 * The system is designed for high-performance rendering of large comment threads
 * with efficient database queries and optimized data structures.
 * 
 * @author VAI Development Team
 * @version 1.0.0
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedMember } from "./auth";
import { insertNotification } from "./notifications";
import { api } from "./_generated/api";

/**
 * Checks if a member is the author of a comment for authorization purposes.
 * 
 * @param comment - Comment object containing memberId
 * @param memberId - Member ID to check against
 * @returns True if the member is the comment author
 */
function isCommentAuthor(comment: { memberId: Id<"members"> }, memberId: Id<"members">): boolean {
  return comment.memberId === memberId;
}

/**
 * Retrieves and builds hierarchical comment tree for a post.
 * 
 * Fetches all comments for a post and constructs a nested tree structure
 * with proper parent-child relationships. Comments are enriched with author
 * information and sorted by creation time and custom order.
 * 
 * @param postId - ID of the post to get comments for
 * @param limit - Maximum number of comments to retrieve (default: 50)
 * @returns Nested array of comments with replies as children
 * 
 * @example
 * ```typescript
 * const comments = await getCommentsByPost({ 
 *   postId: "post123",
 *   limit: 100
 * });
 * // Returns tree structure: [{ comment, replies: [{ comment, replies: [...] }] }]
 * ```
 */
export const getCommentsByPost = query({
  args: {
    postId: v.id("posts"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { postId, limit = 50 }) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post_and_createdAt", (q) => q.eq("postId", postId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("asc")
      .take(limit);

    // Enrich comments with member data and reply-to information
    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        const member = await ctx.db.get(comment.memberId);
        
        // Get reply-to member information if this is a reply
        let replyToMember = null;
        if (comment.replyToMemberId) {
          const replyTo = await ctx.db.get(comment.replyToMemberId);
          if (replyTo) {
            replyToMember = {
              _id: replyTo._id,
              firstName: replyTo.firstName,
              lastName: replyTo.lastName,
              email: replyTo.email,
              username: replyTo.email.split('@')[0],
              slug: replyTo.slug,
            };
          }
        }
        
        return {
          ...comment,
          member: member ? {
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            username: member.email.split('@')[0],
            slug: member.slug,
            avatarUrl: member.avatarUrl,
          } : null,
          replyToMember,
          // For backward compatibility, we'll include an empty replies array
          replies: [],
        };
      })
    );

    // Return flat list sorted by creation time (GitHub-style)
    return enrichedComments;
  },
});

// Get single comment by ID
export const getCommentById = query({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    const comment = await ctx.db.get(commentId);
    if (!comment || comment.status !== "active") {
      return null;
    }

    const member = await ctx.db.get(comment.memberId);
    return {
      ...comment,
      member: member ? {
        _id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        username: member.email.split('@')[0],
        slug: member.slug,
        avatarUrl: member.avatarUrl,
      } : null,
    };
  },
});

/**
 * Creates a new comment with threading and notification support.
 * 
 * Handles comment creation with validation, duplicate detection, threading logic,
 * and notification delivery. Supports rich content including attachments, link
 * previews, and mentions. Updates parent comment counts and triggers notifications.
 * 
 * @param content - Comment text content
 * @param postId - ID of post being commented on
 * @param parentCommentId - Optional parent comment for replies
 * @param attachments - Optional array of media attachments
 * @param linkPreviews - Optional link preview data
 * @param mentions - Optional array of mentioned member IDs
 * @returns ID of the created comment
 * 
 * @example
 * ```typescript
 * const commentId = await createComment({
 *   content: "Great post! @username what do you think?",
 *   postId: "post123",
 *   parentCommentId: "comment456", // Reply to existing comment
 *   mentions: ["user789"]
 * });
 * ```
 */
export const createComment = mutation({
  args: {
    content: v.string(),
    postId: v.id("posts"),
    parentCommentId: v.optional(v.id("comments")),
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      type: v.union(v.literal("image"), v.literal("document"), v.literal("gif")),
      url: v.string(),
      fileName: v.string(),
      fileSize: v.number(),
      mimeType: v.string(),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
    }))),
    linkPreviews: v.optional(v.record(v.string(), v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
      url: v.string(),
    }))),
    mentions: v.optional(v.array(v.id("members"))),
  },
  handler: async (ctx, { content, postId, parentCommentId, attachments, linkPreviews, mentions }) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    // Verify post exists and is active
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "active") {
      throw new Error("Post not found or inactive");
    }

    // If replying to a comment, verify it exists
    let depth = 0;
    let replyToMemberId: Id<"members"> | undefined = undefined;
    let replyToCommentId: Id<"comments"> | undefined = undefined;
    
    if (parentCommentId) {
      const parentComment = await ctx.db.get(parentCommentId);
      if (!parentComment || parentComment.status !== "active") {
        throw new Error("Parent comment not found or inactive");
      }
      if (parentComment.postId !== postId) {
        throw new Error("Parent comment belongs to different post");
      }
      
      // For GitHub-style flat comments, we track who we're replying to
      // but keep depth at 0 for all comments
      replyToMemberId = parentComment.memberId;
      replyToCommentId = parentCommentId;
      depth = 0; // All comments are at the same level in flat structure
    }

    const now = Date.now();
    const trimmedContent = content.trim();

    let order = 0;
    if (parentCommentId) {
      const existingReplies = await ctx.db
        .query("comments")
        .withIndex("by_parent_and_order", (q) => 
          q.eq("parentCommentId", parentCommentId)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      order = existingReplies.length;
    }

    // Check for duplicate comment before creating
    // Look for comments from the same author on the same post with the same content
    // within the last minute (60 seconds)
    const oneMinuteAgo = now - 60000;
    const existingComments = await ctx.db
      .query("comments")
      .withIndex("by_post_and_createdAt", (q) => q.eq("postId", postId))
      .filter((q) => 
        q.and(
          q.eq(q.field("memberId"), member._id),
          q.eq(q.field("status"), "active"),
          q.gte(q.field("createdAt"), oneMinuteAgo)
        )
      )
      .collect();

    // Check if any existing comment has the same content
    const duplicateComment = existingComments.find(
      comment => comment.content === trimmedContent && 
                 comment.parentCommentId === parentCommentId
    );

    if (duplicateComment) {
      console.log(`Duplicate comment detected, returning existing comment ID: ${duplicateComment._id}`);
      return duplicateComment._id;
    }

    // Create the comment
    const commentId = await ctx.db.insert("comments", {
      content: trimmedContent,
      createdAt: now,
      updatedAt: now,
      memberId: member._id,
      postId,
      parentCommentId,
      status: "active",
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      depth,
      childCount: 0,
      order,
      attachments,
      linkPreviews,
      mentions,
      replyToMemberId,
      replyToCommentId,
    });

    // Update post comment count
    await ctx.db.patch(postId, {
      commentCount: (post.commentCount || 0) + 1,
      updatedAt: now,
    });

    // Update parent comment child count
    if (parentCommentId) {
      const parentComment = await ctx.db.get(parentCommentId);
      if (parentComment) {
        await ctx.db.patch(parentCommentId, {
          childCount: (parentComment.childCount || 0) + 1,
          updatedAt: now,
        });
      }
    }

    // Create notifications
    try {
      // 1. Reply notification - notify the parent comment author
      if (parentCommentId) {
        const parentComment = await ctx.db.get(parentCommentId);
        if (parentComment && parentComment.memberId !== member._id) {
          const parentAuthor = await ctx.db.get(parentComment.memberId);
          if (parentAuthor) {
            await insertNotification(ctx, {
              recipientId: parentComment.memberId,
              type: "reply",
              entityType: "comment",
              entityId: commentId,
              actorId: member._id,
              message: `${member.firstName} ${member.lastName} replied to your comment`,
            });
          }
        }
      }

      // 2. Mention notifications - notify mentioned users
      if (mentions && mentions.length > 0) {
        for (const mentionedMemberId of mentions) {
          // Skip if mentioning self
          if (mentionedMemberId === member._id) continue;

          // Verify the mentioned member exists
          const mentionedMember = await ctx.db.get(mentionedMemberId);
          if (mentionedMember) {
            await insertNotification(ctx, {
              recipientId: mentionedMemberId,
              type: "mention",
              entityType: "comment",
              entityId: commentId,
              actorId: member._id,
              message: `${member.firstName} ${member.lastName} mentioned you in a comment`,
            });
          }
        }
      }
    } catch (error) {
      // Log notification errors but don't fail the comment creation
      console.error("Failed to create notifications for comment:", error);
    }

    return commentId;
  },
});

// Update comment (edit) with history tracking
export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
    editReason: v.optional(v.string()),
  },
  handler: async (ctx, { commentId, content, editReason }) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Check if user is the author
    if (!isCommentAuthor(comment, member._id)) {
      throw new Error("Only the author can edit this comment");
    }

    const now = Date.now();
    
    // Create edit history entry
    const editHistory = comment.editHistory || [];
    editHistory.push({
      content: comment.content, // Save the previous content
      editedAt: comment.editedAt || comment.createdAt, // Use previous edit time or creation time
    });

    await ctx.db.patch(commentId, {
      content: content.trim(),
      updatedAt: now,
      editedAt: now,
      editReason: editReason?.trim(),
      editHistory,
    });
    
    return commentId;
  },
});

/**
 * Edits an existing comment with history tracking and attachment management.
 * 
 * Allows comment authors to edit their comments while preserving edit history
 * for transparency. Handles attachment updates including cleanup of removed
 * files from storage. Only the comment author can edit their own comments.
 * 
 * @param commentId - ID of comment to edit
 * @param content - Updated comment content
 * @param attachments - Updated attachment array (replaces existing)
 * @returns ID of the edited comment
 * 
 * @example
 * ```typescript
 * await editComment({
 *   commentId: "comment123",
 *   content: "Updated comment text",
 *   attachments: [{ id: "new-attachment", ... }]
 * });
 * ```
 */
export const editComment = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      type: v.union(v.literal("image"), v.literal("document"), v.literal("gif")),
      url: v.string(),
      fileName: v.string(),
      fileSize: v.number(),
      mimeType: v.string(),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
    }))),
  },
  handler: async (ctx, args) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Check if user is the author
    if (!isCommentAuthor(comment, member._id)) {
      throw new Error("Only the author can edit this comment");
    }

    const now = Date.now();
    
    // Create edit history entry
    const editHistory = comment.editHistory || [];
    editHistory.push({
      content: comment.content, // Save the previous content
      attachments: comment.attachments, // Save previous attachments
      editedAt: comment.editedAt || comment.createdAt, // Use previous edit time or creation time
    });

    // Handle attachment deletions
    if (args.attachments !== undefined && comment.attachments) {
      const newAttachmentUrls = new Set(args.attachments.map(a => a.url));
      const removedAttachments = comment.attachments.filter(
        oldAttachment => !newAttachmentUrls.has(oldAttachment.url)
      );

      // Delete removed attachments from storage
      for (const attachment of removedAttachments) {
        // Extract objectKey from the URL
        // URL format: https://account.r2.cloudflarestorage.com/bucket/uploads/timestamp-id.ext
        // or: https://custom.r2.dev/uploads/timestamp-id.ext
        const urlParts = attachment.url.split('/');
        const uploadsIndex = urlParts.indexOf('uploads');
        if (uploadsIndex !== -1 && uploadsIndex < urlParts.length - 1) {
          const objectKey = urlParts.slice(uploadsIndex).join('/');
          try {
            await ctx.scheduler.runAfter(0, api.storage.deleteObject, { objectKey });
            console.log(`Deleted attachment: ${objectKey}`);
          } catch (error) {
            console.error(`Failed to delete attachment: ${objectKey}`, error);
            // Continue with the edit even if deletion fails
          }
        }
      }
    }

    await ctx.db.patch(args.commentId, {
      content: args.content.trim(),
      attachments: args.attachments,
      updatedAt: now,
      editedAt: now,
      editHistory,
    });
    
    return args.commentId;
  },
});

/**
 * Soft deletes a comment by changing its status to "deleted".
 * 
 * Only the comment author can delete their own comments. The comment data
 * is preserved but hidden from public view. Updates post and parent comment
 * counts while maintaining thread structure for remaining comments.
 * 
 * @param commentId - ID of comment to delete
 * @returns ID of the deleted comment
 * @throws Error if user is not the comment author or comment not found
 * 
 * @example
 * ```typescript
 * await deleteComment({ commentId: "comment123" });
 * // Comment is now hidden but thread structure preserved
 * ```
 */
export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Check if user is the author
    if (!isCommentAuthor(comment, member._id)) {
      throw new Error("Only the author can delete this comment");
    }

    // Soft delete the comment
    await ctx.db.patch(commentId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    // Update post comment count
    const post = await ctx.db.get(comment.postId);
    if (post) {
      await ctx.db.patch(comment.postId, {
        commentCount: Math.max(0, (post.commentCount || 0) - 1),
        updatedAt: Date.now(),
      });
    }

    // Update parent comment child count
    if (comment.parentCommentId) {
      const parentComment = await ctx.db.get(comment.parentCommentId);
      if (parentComment) {
        await ctx.db.patch(comment.parentCommentId, {
          childCount: Math.max(0, (parentComment.childCount || 0) - 1),
          updatedAt: Date.now(),
        });
      }
    }

    return commentId;
  },
});

// Get comments by member (new unified function)
export const getCommentsByMember = query({
  args: {
    memberId: v.id("members"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { memberId, limit = 20 }) => {
    // Use new unified index
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_memberId", (q) => q.eq("memberId", memberId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .take(limit);

    // Enrich with post data
    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        const post = await ctx.db.get(comment.postId);
        return {
          ...comment,
          post: post ? {
            _id: post._id,
            title: post.title,
            categoryId: post.categoryId,
          } : null,
        };
      })
    );

    return enrichedComments;
  },
});


// Get comment count for a post
export const getCommentCount = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_postId", (q) => q.eq("postId", postId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return comments.length;
  },
});

// Report a comment
export const reportComment = mutation({
  args: {
    commentId: v.id("comments"),
    reason: v.union(
      v.literal("spam"),
      v.literal("inappropriate"),
      v.literal("harassment"),
      v.literal("other")
    ),
    reasonText: v.optional(v.string()),
  },
  handler: async (ctx, { commentId, reason, reasonText }) => {
    // Get authenticated member
    const member = await getAuthenticatedMember(ctx);

    // Verify comment exists
    const comment = await ctx.db.get(commentId);
    if (!comment || comment.status !== "active") {
      throw new Error("Comment not found or already removed");
    }

    // Check if user already reported this comment
    const existingReport = await ctx.db
      .query("commentReports")
      .withIndex("by_reporter_and_comment", (q) =>
        q.eq("reporterId", member._id).eq("commentId", commentId)
      )
      .filter((q) => q.neq(q.field("status"), "dismissed"))
      .first();

    if (existingReport) {
      throw new Error("You have already reported this comment");
    }

    // Create the report
    const reportId = await ctx.db.insert("commentReports", {
      commentId,
      reporterId: member._id,
      reason,
      reasonText: reason === "other" && reasonText ? reasonText.trim() : undefined,
      status: "pending",
      createdAt: Date.now(),
    });

    try {
      const admins = await ctx.db
        .query("members")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();
      
      const comment = await ctx.db.get(commentId);
      const post = comment ? await ctx.db.get(comment.postId) : null;
      
      for (const admin of admins) {
        await insertNotification(ctx, {
          recipientId: admin._id,
          type: "comment_report",
          entityType: "comment",
          entityId: commentId,
          actorId: member._id,
          message: `A comment has been reported for: ${reason}`,
        });
      }
    } catch (error) {
      console.error("Failed to send admin notifications for comment report:", error);
    }

    return reportId;
  },
});
export const reorderCommentReplies = mutation({
  args: {
    parentCommentId: v.id("comments"),
    commentId: v.id("comments"),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const member = await getAuthenticatedMember(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.parentCommentId !== args.parentCommentId) {
      throw new Error("Invalid comment");
    }

    const parentComment = await ctx.db.get(args.parentCommentId);
    if (!parentComment) throw new Error("Parent comment not found");

    if (comment.memberId !== member._id && parentComment.memberId !== member._id) {
      throw new Error("Unauthorized to reorder this comment");
    }

    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent_and_order", (q) =>
        q.eq("parentCommentId", args.parentCommentId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const sortedReplies = replies
      .filter(r => r._id !== args.commentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedReplies.splice(args.newOrder, 0, comment);

    // Update order for all affected replies
    const updates = sortedReplies.map((reply, index) => ({
      id: reply._id,
      order: index,
    }));

    for (const update of updates) {
      await ctx.db.patch(update.id, { order: update.order });
    }

    return { success: true };
  },
});
