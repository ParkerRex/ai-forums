const { ConvexClient } = require("convex/browser");
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL not found in environment variables");
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

async function runImport() {
  try {
    console.log("Starting import process...");
    
    // Read the prepared import files
    const postsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../migration-data/posts-import.json'), 'utf8')
    );
    const commentsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../migration-data/comments-import.json'), 'utf8')
    );
    
    console.log(`Found ${postsData.length} posts and ${commentsData.length} comments to import`);
    
    // First, create a default category if needed
    console.log("Checking for default category...");
    let defaultCategory = await client.query("importPostsComments:getCategoryByName", { 
      name: "general" 
    });
    
    if (!defaultCategory) {
      console.log("Creating default category...");
      const categoryId = await client.mutation("importPostsComments:createDefaultCategory", {
        name: "general",
        displayName: "General Discussion",
        description: "General discussion and announcements"
      });
      defaultCategory = { _id: categoryId };
    }
    
    // Import posts in batches
    console.log("Importing posts...");
    const postBatchSize = 50;
    const postIdMap = new Map(); // Map skoolId to convexId
    
    for (let i = 0; i < postsData.length; i += postBatchSize) {
      const batch = postsData.slice(i, i + postBatchSize);
      console.log(`Importing posts ${i + 1} to ${Math.min(i + postBatchSize, postsData.length)}...`);
      
      // Prepare posts with category ID
      const postsToImport = batch.map(post => ({
        ...post,
        categoryId: defaultCategory._id,
        status: post.status || "active",
        isPinned: post.isPinned || false,
        isLocked: post.isLocked || false,
        viewCount: post.viewCount || 0
      }));
      
      try {
        const results = await client.mutation("importPostsComments:importPostsBatch", {
          posts: postsToImport
        });
        
        // Store the mapping
        results.forEach(result => {
          postIdMap.set(result.skoolId, result.postId);
        });
        
        console.log(`Successfully imported ${results.length} posts`);
      } catch (error) {
        console.error(`Error importing posts batch starting at ${i}:`, error);
        // Continue with next batch
      }
    }
    
    console.log(`Total posts imported: ${postIdMap.size}`);
    
    // Import comments
    console.log("Importing comments...");
    const commentIdMap = new Map();
    const commentBatchSize = 100;
    
    // Sort comments by depth to ensure parents are imported before children
    const sortedComments = [...commentsData].sort((a, b) => a.depth - b.depth);
    
    for (let i = 0; i < sortedComments.length; i += commentBatchSize) {
      const batch = sortedComments.slice(i, i + commentBatchSize);
      console.log(`Importing comments ${i + 1} to ${Math.min(i + commentBatchSize, sortedComments.length)}...`);
      
      for (const comment of batch) {
        try {
          // Get the post ID from our mapping
          const postId = postIdMap.get(comment.postSkoolId);
          if (!postId) {
            console.warn(`Skipping comment - post not found: ${comment.postSkoolId}`);
            continue;
          }
          
          // Get parent comment ID if exists
          let parentCommentId = undefined;
          if (comment.parentCommentSkoolId) {
            parentCommentId = commentIdMap.get(comment.parentCommentSkoolId);
            if (!parentCommentId) {
              console.warn(`Parent comment not found: ${comment.parentCommentSkoolId}`);
            }
          }
          
          const result = await client.mutation("importPostsComments:importComment", {
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            authorEmail: comment.authorEmail,
            postId: postId,
            parentCommentId: parentCommentId,
            status: comment.status || "active",
            upvotes: comment.upvotes,
            downvotes: comment.downvotes,
            netVotes: comment.netVotes,
            depth: comment.depth,
            childCount: comment.childCount,
            skoolId: comment.skoolId
          });
          
          commentIdMap.set(comment.skoolId, result.commentId);
        } catch (error) {
          console.error(`Error importing comment ${comment.skoolId}:`, error.message);
        }
      }
    }
    
    console.log(`Total comments imported: ${commentIdMap.size}`);
    
    // Save the ID mappings for reference
    const mappings = {
      posts: Array.from(postIdMap.entries()),
      comments: Array.from(commentIdMap.entries()),
      importedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../migration-data/import-mappings.json'),
      JSON.stringify(mappings, null, 2)
    );
    
    console.log("Import complete! ID mappings saved to migration-data/import-mappings.json");
    
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

// Run the import
runImport().then(() => {
  console.log("Import process finished");
  process.exit(0);
}).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});