import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Simple mutation to delete a duplicate post after transferring its data
export const deleteDuplicatePost = mutation({
  args: {
    keeperId: v.id("posts"),
    duplicateId: v.id("posts"),
  },
  handler: async (ctx, { keeperId, duplicateId }) => {
    const keeper = await ctx.db.get(keeperId);
    const duplicate = await ctx.db.get(duplicateId);
    
    if (!keeper || !duplicate) {
      throw new Error("Post not found");
    }
    
    // Transfer all comments from duplicate to keeper
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_postId", q => q.eq("postId", duplicateId))
      .collect();
    
    console.log(`Transferring ${comments.length} comments from ${duplicateId} to ${keeperId}`);
    
    for (const comment of comments) {
      await ctx.db.patch(comment._id, { postId: keeperId });
    }
    
    // Update keeper's comment count
    const allKeeperComments = await ctx.db
      .query("comments")
      .withIndex("by_postId", q => q.eq("postId", keeperId))
      .collect();
    
    await ctx.db.patch(keeperId, {
      commentCount: allKeeperComments.length,
      updatedAt: Date.now(),
    });
    
    // Delete the duplicate
    await ctx.db.delete(duplicateId);
    
    return {
      transferred: comments.length,
      finalCommentCount: allKeeperComments.length,
      deleted: duplicateId,
    };
  },
});

// Delete duplicate comments
export const deleteDuplicateComments = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, { postId }) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_postId", q => q.eq("postId", postId))
      .collect();
    
    // Group by content + timestamp
    const commentGroups = new Map<string, typeof comments>();
    
    comments.forEach(comment => {
      const key = `${comment.createdAt}_${comment.content.substring(0, 100)}`;
      if (!commentGroups.has(key)) {
        commentGroups.set(key, []);
      }
      commentGroups.get(key)!.push(comment);
    });
    
    let deleted = 0;
    
    // Delete duplicates
    commentGroups.forEach((group) => {
      if (group.length > 1) {
        // Keep first, delete rest
        const sorted = group.sort((a, b) => a._id.localeCompare(b._id));
        const toDelete = sorted.slice(1);
        
        toDelete.forEach(async (comment) => {
          await ctx.db.delete(comment._id);
          deleted++;
        });
      }
    });
    
    // Update post comment count
    const finalComments = await ctx.db
      .query("comments")
      .withIndex("by_postId", q => q.eq("postId", postId))
      .collect();
    
    await ctx.db.patch(postId, {
      commentCount: finalComments.length,
      updatedAt: Date.now(),
    });
    
    return {
      checked: comments.length,
      deleted,
      finalCount: finalComments.length,
    };
  },
});

// Fix all comment counts
export const fixCommentCounts = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    const posts = await ctx.db.query("posts").take(limit);
    
    const results = {
      fixed: 0,
      errors: 0,
    };
    
    for (const post of posts) {
      try {
        const actualComments = await ctx.db
          .query("comments")
          .withIndex("by_postId", q => q.eq("postId", post._id))
          .collect();
        
        if (post.commentCount !== actualComments.length) {
          await ctx.db.patch(post._id, {
            commentCount: actualComments.length,
            updatedAt: Date.now(),
          });
          results.fixed++;
        }
      } catch (error) {
        console.error(`Error fixing post ${post._id}:`, error);
        results.errors++;
      }
    }
    
    return results;
  },
});

// Batch delete duplicate posts
export const batchDeleteDuplicatePosts = mutation({
  args: {
    duplicatePairs: v.array(v.object({
      keeperId: v.id("posts"),
      duplicateId: v.id("posts"),
    })),
  },
  handler: async (ctx, { duplicatePairs }) => {
    const results = {
      processed: 0,
      commentsTransferred: 0,
      deleted: 0,
      errors: [] as string[],
    };
    
    for (const pair of duplicatePairs) {
      try {
        const keeper = await ctx.db.get(pair.keeperId);
        const duplicate = await ctx.db.get(pair.duplicateId);
        
        if (!keeper || !duplicate) {
          results.errors.push(`Post not found: ${pair.keeperId} or ${pair.duplicateId}`);
          continue;
        }
        
        // Transfer comments
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_postId", q => q.eq("postId", pair.duplicateId))
          .collect();
        
        for (const comment of comments) {
          await ctx.db.patch(comment._id, { postId: pair.keeperId });
          results.commentsTransferred++;
        }
        
        // Update keeper's comment count
        const allKeeperComments = await ctx.db
          .query("comments")
          .withIndex("by_postId", q => q.eq("postId", pair.keeperId))
          .collect();
        
        await ctx.db.patch(pair.keeperId, {
          commentCount: allKeeperComments.length,
          updatedAt: Date.now(),
        });
        
        // Delete the duplicate
        await ctx.db.delete(pair.duplicateId);
        results.deleted++;
        results.processed++;
        
        console.log(`Processed ${pair.duplicateId}: transferred ${comments.length} comments`);
        
      } catch (error) {
        console.error(`Error processing ${pair.duplicateId}:`, error);
        results.errors.push(`${pair.duplicateId}: ${error}`);
      }
    }
    
    return results;
  },
}); 