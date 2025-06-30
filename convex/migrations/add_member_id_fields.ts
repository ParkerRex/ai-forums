import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration: Add memberId fields to posts and comments
 * 
 * This migration populates the new memberId fields with the values from
 * the existing authorId fields to maintain data consistency during the
 * auth unification transition.
 * 
 * Steps:
 * 1. Update all posts: set memberId = authorId
 * 2. Update all comments: set memberId = authorId
 * 
 * This migration is idempotent and can be run multiple times safely.
 */
export const addMemberIdFields = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { batchSize = 100 }) => {
    console.log("Starting migration: add_member_id_fields");
    
    let postsUpdated = 0;
    let commentsUpdated = 0;
    
    // Migrate posts table
    console.log("Migrating posts table...");
    
    // Process posts in batches to avoid timeout
    let postsCursor: string | null = null;
    let postsHasMore = true;
    
    while (postsHasMore) {
      const postsResult = await ctx.db
        .query("posts")
        .paginate({
          cursor: postsCursor,
          numItems: batchSize,
        });
      
      for (const post of postsResult.page) {
        // Only update if memberId is not already set
        if (!post.memberId) {
          await ctx.db.patch(post._id, {
            memberId: post.authorId,
          });
          postsUpdated++;
        }
      }
      
      postsCursor = postsResult.continueCursor;
      postsHasMore = !postsResult.isDone;
      
      console.log(`Processed ${postsResult.page.length} posts, updated ${postsUpdated} so far`);
    }
    
    // Migrate comments table
    console.log("Migrating comments table...");
    
    // Process comments in batches to avoid timeout
    let commentsCursor: string | null = null;
    let commentsHasMore = true;
    
    while (commentsHasMore) {
      const commentsResult = await ctx.db
        .query("comments")
        .paginate({
          cursor: commentsCursor,
          numItems: batchSize,
        });
      
      for (const comment of commentsResult.page) {
        // Only update if memberId is not already set
        if (!comment.memberId) {
          await ctx.db.patch(comment._id, {
            memberId: comment.authorId,
          });
          commentsUpdated++;
        }
      }
      
      commentsCursor = commentsResult.continueCursor;
      commentsHasMore = !commentsResult.isDone;
      
      console.log(`Processed ${commentsResult.page.length} comments, updated ${commentsUpdated} so far`);
    }
    
    console.log(`Migration completed successfully!`);
    console.log(`Posts updated: ${postsUpdated}`);
    console.log(`Comments updated: ${commentsUpdated}`);
    
    return {
      success: true,
      postsUpdated,
      commentsUpdated,
      message: `Successfully migrated ${postsUpdated} posts and ${commentsUpdated} comments`,
    };
  },
});

/**
 * Helper mutation to check migration status
 * Returns counts of records with and without memberId fields
 */
export const checkMigrationStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Count posts
    const allPosts = await ctx.db.query("posts").collect();
    const postsWithMemberId = allPosts.filter(p => p.memberId !== undefined).length;
    const postsWithoutMemberId = allPosts.length - postsWithMemberId;
    
    // Count comments
    const allComments = await ctx.db.query("comments").collect();
    const commentsWithMemberId = allComments.filter(c => c.memberId !== undefined).length;
    const commentsWithoutMemberId = allComments.length - commentsWithMemberId;
    
    return {
      posts: {
        total: allPosts.length,
        withMemberId: postsWithMemberId,
        withoutMemberId: postsWithoutMemberId,
        migrationComplete: postsWithoutMemberId === 0,
      },
      comments: {
        total: allComments.length,
        withMemberId: commentsWithMemberId,
        withoutMemberId: commentsWithoutMemberId,
        migrationComplete: commentsWithoutMemberId === 0,
      },
    };
  },
}); 