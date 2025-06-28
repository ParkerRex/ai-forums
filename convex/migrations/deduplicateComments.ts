import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const deduplicateComments = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting comment deduplication migration...");
    
    // Track statistics
    let totalComments = 0;
    let duplicatesDeleted = 0;
    let postsUpdated = 0;
    const affectedPosts = new Set<Id<"posts">>();
    
    // Get all comments
    const allComments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    totalComments = allComments.length;
    console.log(`Found ${totalComments} total active comments`);
    
    // Group comments by postId for efficient processing
    const commentsByPost = new Map<Id<"posts">, typeof allComments>();
    for (const comment of allComments) {
      const postComments = commentsByPost.get(comment.postId) || [];
      postComments.push(comment);
      commentsByPost.set(comment.postId, postComments);
    }
    
    // Process each post's comments
    for (const [postId, postComments] of commentsByPost) {
      console.log(`Processing post ${postId} with ${postComments.length} comments`);
      
      // Group by unique key: authorId + content + createdAt (within 1 second tolerance)
      const uniqueComments = new Map<string, typeof postComments>();
      const commentsToDelete: Id<"comments">[] = [];
      
      for (const comment of postComments) {
        // Create a unique key - use 1 second tolerance for createdAt
        const createdAtBucket = Math.floor(comment.createdAt / 1000); // Round to nearest second
        const uniqueKey = `${comment.authorId}|${comment.content.trim()}|${createdAtBucket}`;
        
        const existing = uniqueComments.get(uniqueKey);
        if (existing) {
          // Keep the one with the earliest _id (lexicographically)
          const existingComment = existing[0];
          if (comment._id < existingComment._id) {
            // This comment is earlier, delete the existing one
            commentsToDelete.push(existingComment._id);
            uniqueComments.set(uniqueKey, [comment]);
          } else {
            // The existing one is earlier, delete this one
            commentsToDelete.push(comment._id);
          }
        } else {
          uniqueComments.set(uniqueKey, [comment]);
        }
      }
      
      // Delete duplicates for this post
      if (commentsToDelete.length > 0) {
        console.log(`Found ${commentsToDelete.length} duplicate comments for post ${postId}`);
        affectedPosts.add(postId);
        
        for (const commentId of commentsToDelete) {
          await ctx.db.delete(commentId);
          duplicatesDeleted++;
        }
      }
    }
    
    console.log(`Deleted ${duplicatesDeleted} duplicate comments`);
    console.log(`Affected posts: ${affectedPosts.size}`);
    
    // Phase 2: Fix comment counts on affected posts
    console.log("Updating comment counts on affected posts...");
    
    for (const postId of affectedPosts) {
      const post = await ctx.db.get(postId);
      if (!post) continue;
      
      // Count actual comments for this post
      const actualCommentCount = await ctx.db
        .query("comments")
        .withIndex("by_postId", (q) => q.eq("postId", postId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect()
        .then(comments => comments.length);
      
      if (post.commentCount !== actualCommentCount) {
        console.log(`Updating post ${postId} comment count from ${post.commentCount} to ${actualCommentCount}`);
        await ctx.db.patch(postId, {
          commentCount: actualCommentCount,
          updatedAt: Date.now(),
        });
        postsUpdated++;
      }
    }
    
    // Phase 3: Fix parent-child relationships
    console.log("Fixing parent-child comment counts...");
    let parentChildFixed = 0;
    
    // Get all parent comments that might have been affected
    const parentComments = await ctx.db
      .query("comments")
      .filter((q) => q.gt(q.field("childCount"), 0))
      .collect();
    
    for (const parent of parentComments) {
      // Count actual children
      const actualChildCount = await ctx.db
        .query("comments")
        .withIndex("by_parentCommentId", (q) => q.eq("parentCommentId", parent._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect()
        .then(children => children.length);
      
      if (parent.childCount !== actualChildCount) {
        console.log(`Updating parent comment ${parent._id} child count from ${parent.childCount} to ${actualChildCount}`);
        await ctx.db.patch(parent._id, {
          childCount: actualChildCount,
          updatedAt: Date.now(),
        });
        parentChildFixed++;
      }
    }
    
    // Return summary
    const summary = {
      totalComments,
      duplicatesDeleted,
      postsUpdated,
      parentChildFixed,
      affectedPosts: affectedPosts.size,
      duplicateRate: totalComments > 0 ? (duplicatesDeleted / totalComments * 100).toFixed(2) + '%' : '0%',
    };
    
    console.log("Migration completed successfully!");
    console.log("Summary:", JSON.stringify(summary, null, 2));
    
    return summary;
  },
}); 