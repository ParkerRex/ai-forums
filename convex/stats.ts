import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Recalculate and cache member stats
 * Run as cron job nightly to keep stats fresh
 */
export const recalcMemberStats = internalMutation({
  handler: async (ctx) => {
    const members = await ctx.db.query("members").collect();
    
    let updatedCount = 0;
    
    for (const member of members) {
      // Calculate stats for this member
      const [posts, comments] = await Promise.all([
        ctx.db
          .query("posts")
          .withIndex("by_authorId", (q) => q.eq("authorId", member._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect(),
        ctx.db
          .query("comments")
          .withIndex("by_authorId", (q) => q.eq("authorId", member._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect(),
      ]);

      const postCount = posts.length;
      const commentCount = comments.length;

      // Calculate net votes received on member's content (posts + comments)
      const postIds = posts.map(p => p._id);
      const commentIds = comments.map(c => c._id);
      
      const [postVotes, commentVotes] = await Promise.all([
        // Get votes on member's posts
        postIds.length > 0 ? 
          Promise.all(postIds.map(postId => 
            ctx.db.query("votes")
              .withIndex("by_target_and_type", (q) => q.eq("targetId", postId.toString()).eq("targetType", "post"))
              .collect()
          )).then(results => results.flat()) : [],
        // Get votes on member's comments  
        commentIds.length > 0 ?
          Promise.all(commentIds.map(commentId =>
            ctx.db.query("votes")
              .withIndex("by_target_and_type", (q) => q.eq("targetId", commentId.toString()).eq("targetType", "comment"))
              .collect()
          )).then(results => results.flat()) : [],
      ]);

      const allVotes = [...postVotes, ...commentVotes];
      const netVoteCount = allVotes.filter(v => v.voteType === "upvote").length - 
                          allVotes.filter(v => v.voteType === "downvote").length;

      // Update member with cached stats
      await ctx.db.patch(member._id, {
        postCount,
        commentCount,
        netVoteCount,
        updatedAt: Date.now(),
      });
      
      updatedCount++;
    }
    
    console.log(`Stats recalculation completed: updated ${updatedCount} members`);
    return { updatedMembers: updatedCount };
  },
});

/**
 * Recalculate stats for a single member (for real-time updates)
 */
export const recalcSingleMemberStats = internalMutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const member = await ctx.db.get(memberId);
    if (!member) {
      return null;
    }

    // Calculate stats for this member
    const [posts, comments] = await Promise.all([
      ctx.db
        .query("posts")
        .withIndex("by_authorId", (q) => q.eq("authorId", memberId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect(),
      ctx.db
        .query("comments")
        .withIndex("by_authorId", (q) => q.eq("authorId", memberId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect(),
    ]);

    const postCount = posts.length;
    const commentCount = comments.length;

    // Calculate net votes received on member's content (posts + comments)
    const postIds = posts.map(p => p._id);
    const commentIds = comments.map(c => c._id);
    
    const [postVotes, commentVotes] = await Promise.all([
      // Get votes on member's posts
      postIds.length > 0 ? 
        Promise.all(postIds.map(postId => 
          ctx.db.query("votes")
            .withIndex("by_target_and_type", (q) => q.eq("targetId", postId.toString()).eq("targetType", "post"))
            .collect()
        )).then(results => results.flat()) : [],
      // Get votes on member's comments  
      commentIds.length > 0 ?
        Promise.all(commentIds.map(commentId =>
          ctx.db.query("votes")
            .withIndex("by_target_and_type", (q) => q.eq("targetId", commentId.toString()).eq("targetType", "comment"))
            .collect()
        )).then(results => results.flat()) : [],
    ]);

    const allVotes = [...postVotes, ...commentVotes];
    const netVoteCount = allVotes.filter(v => v.voteType === "upvote").length - 
                        allVotes.filter(v => v.voteType === "downvote").length;

    // Update member with cached stats
    await ctx.db.patch(memberId, {
      postCount,
      commentCount,
      netVoteCount,
      updatedAt: Date.now(),
    });

    return { postCount, commentCount, netVoteCount };
  },
});

// Note: Cron job can be set up later via Convex dashboard
// For now, stats can be recalculated manually using recalcMemberStats 