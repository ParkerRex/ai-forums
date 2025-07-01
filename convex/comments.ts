import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedMember } from "./auth";

// Helper function to check if a member is the author of a comment
function isCommentAuthor(comment: { memberId: Id<"members"> }, memberId: Id<"members">): boolean {
  return comment.memberId === memberId;
}

// Get comments for a post with nested structure
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

    // Enrich comments with member data
    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
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
          } : null,
        };
      })
    );

    // Build nested comment structure
    type CommentWithReplies = typeof enrichedComments[0] & { replies: CommentWithReplies[] };
    const commentMap = new Map<Id<"comments">, CommentWithReplies>();
    const rootComments: CommentWithReplies[] = [];

    // First pass: create map of all comments
    enrichedComments.forEach(comment => {
      commentMap.set(comment._id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    enrichedComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment._id);
      if (commentWithReplies) {
        if (comment.parentCommentId) {
          const parent = commentMap.get(comment.parentCommentId);
          if (parent) {
            parent.replies.push(commentWithReplies);
          }
        } else {
          rootComments.push(commentWithReplies);
        }
      }
    });

    return rootComments;
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
      } : null,
    };
  },
});

// Create new comment
export const createComment = mutation({
  args: {
    content: v.string(),
    postId: v.id("posts"),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, { content, postId, parentCommentId }) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    // Verify post exists and is active
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "active") {
      throw new Error("Post not found or inactive");
    }

    // If replying to a comment, verify it exists
    let depth = 0;
    if (parentCommentId) {
      const parentComment = await ctx.db.get(parentCommentId);
      if (!parentComment || parentComment.status !== "active") {
        throw new Error("Parent comment not found or inactive");
      }
      if (parentComment.postId !== postId) {
        throw new Error("Parent comment belongs to different post");
      }
      depth = parentComment.depth + 1;

      // Limit nesting depth to prevent infinite threading
      if (depth > 5) {
        throw new Error("Maximum comment depth exceeded");
      }
    }

    const now = Date.now();
    const trimmedContent = content.trim();

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

    return commentId;
  },
});

// Update comment (edit)
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
    const updates: {
      content: string;
      updatedAt: number;
      editedAt: number;
      editReason?: string;
    } = {
      content: content.trim(),
      updatedAt: now,
      editedAt: now,
    };

    if (editReason !== undefined) {
      updates.editReason = editReason.trim();
    }

    await ctx.db.patch(commentId, updates);
    return commentId;
  },
});

// Delete comment (soft delete)
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