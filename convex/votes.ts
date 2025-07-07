/**
 * @fileoverview Votes Module - Content voting and ranking system
 * 
 * This module manages the voting system that powers content ranking and community
 * engagement metrics. It handles upvotes and downvotes on posts, comments, and
 * resources with vote switching, deduplication, and real-time score updates.
 * 
 * Key features:
 * - Upvote/downvote functionality for all content types
 * - Vote switching (change from upvote to downvote and vice versa)
 * - One vote per user per content item enforcement
 * - Real-time score calculation and caching
 * - Vote history tracking and analytics
 * - Integration with ranking algorithms
 * - Performance optimization for high-traffic content
 * 
 * The system ensures data integrity while providing fast vote lookups
 * and real-time updates for community-driven content curation.
 * 
 * @author VAI Development Team
 * @version 1.0.0
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedMember } from "./auth";

/**
 * Retrieves the current user's vote on a specific piece of content.
 * 
 * Returns the user's vote type (upvote/downvote) for the specified content,
 * or null if not voted. Used to show vote state in UI components and
 * enable vote switching functionality.
 * 
 * @param targetId - ID of the content being checked
 * @param targetType - Type of content (post, comment, or resource)
 * @returns Vote type ("upvote" or "downvote") or null if not voted
 * 
 * @example
 * ```typescript
 * const userVote = await getUserVote({
 *   targetId: "post123",
 *   targetType: "post"
 * });
 * // Returns: "upvote", "downvote", or null
 * ```
 */
export const getUserVote = query({
  args: {
    targetId: v.string(),
    targetType: v.union(v.literal("post"), v.literal("comment"), v.literal("resource")),
  },
  handler: async (ctx, { targetId, targetType }) => {
    // Optional auth - return null if not authenticated
    let member;
    try {
      member = await getAuthenticatedMember(ctx);
    } catch {
      return null;
    }

    const vote = await ctx.db
      .query("votes")
      .withIndex("by_user_and_target", (q) =>
        q.eq("userId", member._id)
          .eq("targetId", targetId)
          .eq("targetType", targetType)
      )
      .first();

    return vote?.voteType || null;
  },
});

// Get vote counts for a target
export const getVoteCounts = query({
  args: {
    targetId: v.string(),
    targetType: v.union(v.literal("post"), v.literal("comment"), v.literal("resource")),
  },
  handler: async (ctx, { targetId, targetType }) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_target_and_type", (q) =>
        q.eq("targetId", targetId).eq("targetType", targetType)
      )
      .collect();

    const upvotes = votes.filter(vote => vote.voteType === "upvote").length;
    const downvotes = votes.filter(vote => vote.voteType === "downvote").length;

    return {
      upvotes,
      downvotes,
      netVotes: upvotes - downvotes,
    };
  },
});

/**
 * Casts or removes a vote on a post with real-time score updates.
 * 
 * Handles upvoting and vote removal with automatic score recalculation.
 * Prevents duplicate votes and manages vote switching. Updates both the
 * votes table and the post's cached vote counts for performance.
 * 
 * @param postId - ID of the post to vote on
 * @param voteType - "upvote" to vote positively, "remove" to remove vote
 * @returns Success status and updated vote counts
 * 
 * @example
 * ```typescript
 * await voteOnPost({
 *   postId: "post123",
 *   voteType: "upvote"
 * });
 * // Post score increases and UI updates reflect new state
 * ```
 */
export const voteOnPost = mutation({
  args: {
    postId: v.id("posts"),
    voteType: v.union(v.literal("upvote"), v.literal("remove")),
  },
  handler: async (ctx, { postId, voteType }) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    // Verify post exists and is active
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "active") {
      throw new Error("Post not found or inactive");
    }

    const targetId = postId;

    // Check for existing vote
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_user_and_target", (q) =>
        q.eq("userId", member._id)
          .eq("targetId", targetId)
          .eq("targetType", "post")
      )
      .first();

    const now = Date.now();
    let upvoteDelta = 0;

    if (voteType === "remove") {
      // Remove existing vote
      if (existingVote) {
        await ctx.db.delete(existingVote._id);
        upvoteDelta = existingVote.voteType === "upvote" ? -1 : 0;
      }
    } else {
      // Add or update vote
      if (existingVote) {
        // Update existing vote
        if (existingVote.voteType !== voteType) {
          await ctx.db.patch(existingVote._id, {
            voteType,
            updatedAt: now,
          });
          upvoteDelta = voteType === "upvote" ? 1 : -1;
        }
        // If same vote type, do nothing (no change)
      } else {
        // Create new vote
        await ctx.db.insert("votes", {
          userId: member._id,
          targetId,
          targetType: "post",
          voteType,
          createdAt: now,
          updatedAt: now,
        });
        upvoteDelta = voteType === "upvote" ? 1 : 0;
      }
    }

    // Update post vote counts
    if (upvoteDelta !== 0) {
      const newUpvotes = Math.max(0, (post.upvotes || 0) + upvoteDelta);
      const newNetVotes = newUpvotes - (post.downvotes || 0);

      await ctx.db.patch(postId, {
        upvotes: newUpvotes,
        netVotes: newNetVotes,
        updatedAt: now,
      });
    }

    return {
      success: true,
      newVoteType: voteType === "remove" ? null : voteType,
      upvotes: Math.max(0, (post.upvotes || 0) + upvoteDelta),
      netVotes: Math.max(0, (post.upvotes || 0) + upvoteDelta) - (post.downvotes || 0),
    };
  },
});

// Vote on a comment
export const voteOnComment = mutation({
  args: {
    commentId: v.id("comments"),
    voteType: v.union(v.literal("upvote"), v.literal("remove")),
  },
  handler: async (ctx, { commentId, voteType }) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    // Verify comment exists and is active
    const comment = await ctx.db.get(commentId);
    if (!comment || comment.status !== "active") {
      throw new Error("Comment not found or inactive");
    }

    const targetId = commentId;

    // Check for existing vote
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_user_and_target", (q) =>
        q.eq("userId", member._id)
          .eq("targetId", targetId)
          .eq("targetType", "comment")
      )
      .first();

    const now = Date.now();
    let upvoteDelta = 0;

    if (voteType === "remove") {
      // Remove existing vote
      if (existingVote) {
        await ctx.db.delete(existingVote._id);
        upvoteDelta = existingVote.voteType === "upvote" ? -1 : 0;
      }
    } else {
      // Add or update vote
      if (existingVote) {
        // Update existing vote
        if (existingVote.voteType !== voteType) {
          await ctx.db.patch(existingVote._id, {
            voteType,
            updatedAt: now,
          });
          upvoteDelta = voteType === "upvote" ? 1 : -1;
        }
        // If same vote type, do nothing (no change)
      } else {
        // Create new vote
        await ctx.db.insert("votes", {
          userId: member._id,
          targetId,
          targetType: "comment",
          voteType,
          createdAt: now,
          updatedAt: now,
        });
        upvoteDelta = voteType === "upvote" ? 1 : 0;
      }
    }

    // Update comment vote counts
    if (upvoteDelta !== 0) {
      const newUpvotes = Math.max(0, (comment.upvotes || 0) + upvoteDelta);
      const newNetVotes = newUpvotes - (comment.downvotes || 0);

      await ctx.db.patch(commentId, {
        upvotes: newUpvotes,
        netVotes: newNetVotes,
        updatedAt: now,
      });
    }

    return {
      success: true,
      newVoteType: voteType === "remove" ? null : voteType,
      upvotes: Math.max(0, (comment.upvotes || 0) + upvoteDelta),
      netVotes: Math.max(0, (comment.upvotes || 0) + upvoteDelta) - (comment.downvotes || 0),
    };
  },
});

// Get user's voting activity
export const getUserVotingActivity = query({
  args: {
    userId: v.id("members"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 20 }) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    // Enrich with target data
    const enrichedVotes = await Promise.all(
      votes.map(async (vote) => {
        if (vote.targetType === "post") {
          const post = await ctx.db.get(vote.targetId as Id<"posts">);
          return {
            ...vote,
            target: post ? {
              _id: post._id,
              title: post.title,
              type: "post" as const,
            } : null,
          };
        } else {
          const comment = await ctx.db.get(vote.targetId as Id<"comments">);
          return {
            ...vote,
            target: comment ? {
              _id: comment._id,
              content: comment.content.substring(0, 100) + "...",
              type: "comment" as const,
            } : null,
          };
        }
      })
    );

    return enrichedVotes.filter(vote => vote.target !== null);
  },
});

export const getPostVoters = query({
  args: {
    postId: v.id("posts"),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    voters: v.array(v.object({
      _id: v.id("members"),
      firstName: v.string(),
      lastName: v.string(),
      avatarUrl: v.optional(v.string()),
      slug: v.string(),
    })),
    hasMore: v.boolean(),
    total: v.number(),
  }),
  handler: async (ctx, { postId, limit = 10 }) => {
    // Fetch the post first so we can use the authoritative upvote count
    const post = await ctx.db.get(postId);

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_target_and_type", (q) =>
        q.eq("targetId", postId).eq("targetType", "post")
      )
      .filter((q) => q.eq(q.field("voteType"), "upvote"))
      .order("desc")
      .take(limit + 1);
    
    const hasMore = votes.length > limit;
    const voters = await Promise.all(
      votes.slice(0, limit).map(async (vote) => {
        const member = await ctx.db.get(vote.userId);
        return member ? {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          avatarUrl: member.avatarUrl,
          slug: member.slug,
        } : null;
      })
    );
    
    const validVoters = voters.filter((voter): voter is NonNullable<typeof voter> => voter !== null);
    
    // Use the post's upvotes field as the total count if available, otherwise fall back to the fetched length.
    const totalUpvotes = post?.upvotes ?? votes.length;
    
    return {
      voters: validVoters,
      hasMore,
      total: totalUpvotes,
    };
  },
});

export const voteOnResource = mutation({
  args: {
    resourceId: v.id("resources"),
    voteType: v.union(v.literal("upvote"), v.literal("remove")),
  },
  returns: v.object({
    success: v.boolean(),
    newVoteType: v.union(v.string(), v.null()),
    upvotes: v.number(),
    netVotes: v.number(),
  }),
  handler: async (ctx, { resourceId, voteType }) => {
    const member = await getAuthenticatedMember(ctx);

    const resource = await ctx.db.get(resourceId);
    if (!resource || resource.status !== "active") {
      throw new Error("Resource not found or inactive");
    }

    const targetId = resourceId;

    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_user_and_target", (q) =>
        q.eq("userId", member._id)
          .eq("targetId", targetId)
          .eq("targetType", "resource")
      )
      .first();

    const now = Date.now();
    let upvoteDelta = 0;

    if (voteType === "remove") {
      if (existingVote) {
        await ctx.db.delete(existingVote._id);
        upvoteDelta = existingVote.voteType === "upvote" ? -1 : 0;
      }
    } else {
      if (existingVote) {
        if (existingVote.voteType !== voteType) {
          await ctx.db.patch(existingVote._id, {
            voteType,
            updatedAt: now,
          });
          upvoteDelta = voteType === "upvote" ? 1 : -1;
        }
      } else {
        await ctx.db.insert("votes", {
          userId: member._id,
          targetId,
          targetType: "resource",
          voteType,
          createdAt: now,
          updatedAt: now,
        });
        upvoteDelta = voteType === "upvote" ? 1 : 0;
      }
    }

    if (upvoteDelta !== 0) {
      const newUpvotes = Math.max(0, (resource.upvotes || 0) + upvoteDelta);
      const newNetVotes = newUpvotes - (resource.downvotes || 0);

      await ctx.db.patch(resourceId, {
        upvotes: newUpvotes,
        netVotes: newNetVotes,
        updatedAt: now,
      });
    }

    return {
      success: true,
      newVoteType: voteType === "remove" ? null : voteType,
      upvotes: Math.max(0, (resource.upvotes || 0) + upvoteDelta),
      netVotes: Math.max(0, (resource.upvotes || 0) + upvoteDelta) - (resource.downvotes || 0),
    };
  },
});   