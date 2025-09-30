/**
 * @fileoverview Votes Module - Content voting and ranking system
 *
 * This module manages the voting system that powers content ranking and community
 * engagement metrics. It handles upvotes on posts, comments, and resources with
 * vote removal, deduplication, and real-time score updates.
 *
 * Key features:
 * - Upvote-only functionality for all content types
 * - Vote removal (toggle upvote on/off)
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

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedMember } from "./auth";

/**
 * Retrieves the current user's vote on a specific piece of content.
 *
 * Returns the user's vote type (upvote) for the specified content,
 * or null if not voted. Used to show vote state in UI components and
 * enable vote removal functionality.
 *
 * @deprecated Use getUserVotesBatch for better performance when checking multiple votes.
 * This function makes individual queries which can lead to N+1 query problems.
 *
 * @param targetId - ID of the content being checked
 * @param targetType - Type of content (post, comment, or resource)
 * @returns Vote type ("upvote") or null if not voted
 *
 * @example
 * ```typescript
 * const userVote = await getUserVote({
 *   targetId: "post123",
 *   targetType: "post"
 * });
 * // Returns: "upvote" or null
 * ```
 */
export const getUserVote = query({
  args: {
    targetId: v.string(),
    targetType: v.union(v.literal("post"), v.literal("comment"), v.literal("resource")),
  },
  handler: async (ctx, { targetId, targetType }) => {
    // Log deprecation warning in development
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "⚠️ getUserVote is deprecated. Use getUserVotesBatch for better performance when checking multiple votes.",
      );
    }

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
        q.eq("userId", member._id).eq("targetId", targetId).eq("targetType", targetType),
      )
      .first();

    return vote?.voteType || null;
  },
});

/**
 * Batch retrieves the current user's votes on multiple pieces of content.
 *
 * Optimized for performance by fetching all votes in a single query rather than
 * N individual queries. Returns a map of targetId to vote type for efficient lookups.
 *
 * @param targetIds - Array of content IDs to check
 * @param targetType - Type of all content (must be homogeneous - all posts or all comments)
 * @returns Map of targetId to vote type ("upvote") or empty object if not authenticated
 *
 * @example
 * ```typescript
 * const userVotes = await getUserVotesBatch({
 *   targetIds: ["post123", "post456", "post789"],
 *   targetType: "post"
 * });
 * // Returns: { "post123": "upvote", "post789": "upvote" }
 * // Note: post456 is not in the result, meaning no vote
 * ```
 */
export const getUserVotesBatch = query({
  args: {
    targetIds: v.array(v.string()),
    targetType: v.union(v.literal("post"), v.literal("comment"), v.literal("resource")),
  },
  handler: async (ctx, { targetIds, targetType }) => {
    // Return empty object for empty input
    if (targetIds.length === 0) {
      return {};
    }

    // Optional auth - return empty object if not authenticated
    let member;
    try {
      member = await getAuthenticatedMember(ctx);
    } catch {
      return {};
    }

    // Fetch all votes for this user
    const userVotes = await ctx.db
      .query("votes")
      .withIndex("by_userId", (q) => q.eq("userId", member._id))
      .collect();

    // Filter for the requested targets and build the result map
    const voteMap: Record<string, "upvote"> = {};

    for (const vote of userVotes) {
      if (vote.targetType === targetType && targetIds.includes(vote.targetId)) {
        if (vote.voteType === "upvote") {
          voteMap[vote.targetId] = "upvote";
        }
      }
    }

    return voteMap;
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
        q.eq("targetId", targetId).eq("targetType", targetType),
      )
      .collect();

    const upvotes = votes.filter((vote) => vote.voteType === "upvote").length;

    return {
      upvotes,
      netVotes: upvotes,
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
        q.eq("userId", member._id).eq("targetId", targetId).eq("targetType", "post"),
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
      const newNetVotes = newUpvotes;

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
      netVotes: Math.max(0, (post.upvotes || 0) + upvoteDelta),
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
        q.eq("userId", member._id).eq("targetId", targetId).eq("targetType", "comment"),
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
      const newNetVotes = newUpvotes;

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
      netVotes: Math.max(0, (comment.upvotes || 0) + upvoteDelta),
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
            target: post
              ? {
                  _id: post._id,
                  title: post.title,
                  type: "post" as const,
                }
              : null,
          };
        } else {
          const comment = await ctx.db.get(vote.targetId as Id<"comments">);
          return {
            ...vote,
            target: comment
              ? {
                  _id: comment._id,
                  content: `${comment.content.substring(0, 100)}...`,
                  type: "comment" as const,
                }
              : null,
          };
        }
      }),
    );

    return enrichedVotes.filter((vote) => vote.target !== null);
  },
});

export const getPostVoters = query({
  args: {
    postId: v.id("posts"),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    voters: v.array(
      v.object({
        _id: v.id("members"),
        firstName: v.string(),
        lastName: v.string(),
        avatarUrl: v.optional(v.string()),
        slug: v.string(),
      }),
    ),
    hasMore: v.boolean(),
    total: v.number(),
  }),
  handler: async (ctx, { postId, limit = 10 }) => {
    // Fetch the post first so we can use the authoritative upvote count
    const post = await ctx.db.get(postId);

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_target_and_type", (q) => q.eq("targetId", postId).eq("targetType", "post"))
      .filter((q) => q.eq(q.field("voteType"), "upvote"))
      .order("desc")
      .take(limit + 1);

    const hasMore = votes.length > limit;
    const voters = await Promise.all(
      votes.slice(0, limit).map(async (vote) => {
        const member = await ctx.db.get(vote.userId);
        return member
          ? {
              _id: member._id,
              firstName: member.firstName,
              lastName: member.lastName,
              avatarUrl: member.avatarUrl,
              slug: member.slug,
            }
          : null;
      }),
    );

    const validVoters = voters.filter(
      (voter): voter is NonNullable<typeof voter> => voter !== null,
    );

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
        q.eq("userId", member._id).eq("targetId", targetId).eq("targetType", "resource"),
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
      const newNetVotes = newUpvotes;

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
      netVotes: Math.max(0, (resource.upvotes || 0) + upvoteDelta),
    };
  },
});
