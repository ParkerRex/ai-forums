#!/usr/bin/env node
// Direct import of posts and comments using standard Convex mutations

const { ConvexClient } = require("convex/browser");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

// Read the prepared data
const postBatches = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../migration-data/post-batches-ready.json"),
    "utf8",
  ),
);
const commentBatches = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../migration-data/comment-batches.json"),
    "utf8",
  ),
);

// Store post ID mappings
const postIdMapping = new Map();

async function importPosts() {
  console.log("🚀 Starting post import...\n");

  for (let i = 0; i < postBatches.length; i++) {
    const batch = postBatches[i];
    console.log(
      `📦 Importing post batch ${i + 1}/${postBatches.length} (${batch.length} posts)...`,
    );

    for (const post of batch) {
      try {
        // Get member ID from email
        const member = await client.query("members:getMemberByEmail", {
          email: post.authorEmail,
        });
        if (!member) {
          console.error(`❌ Member not found for email: ${post.authorEmail}`);
          continue;
        }

        // Create the post
        const postId = await client.mutation("posts:createPost", {
          title: post.title,
          content: post.content,
          categoryId: post.categoryId,
          type: post.type || "text",
          preview: post.content.substring(0, 150) + "...",
        });

        // Store the mapping
        postIdMapping.set(post.skoolId, postId);
        console.log(`✅ Created post: ${post.title.substring(0, 50)}...`);
      } catch (error) {
        console.error(
          `❌ Failed to create post "${post.title}":`,
          error.message,
        );
      }
    }
  }

  // Save the mapping
  const mappingArray = Array.from(postIdMapping.entries());
  fs.writeFileSync(
    path.join(__dirname, "../migration-data/post-id-mapping.json"),
    JSON.stringify(mappingArray, null, 2),
  );

  console.log(
    `\n✅ Post import complete! Imported ${postIdMapping.size} posts total\n`,
  );
  return postIdMapping;
}

async function importComments(postIdMapping) {
  console.log("🚀 Starting comment import...\n");

  // Sort all comments by depth to ensure parents are imported before children
  const allComments = commentBatches.flat();
  const sortedComments = allComments.sort(
    (a, b) => (a.depth || 0) - (b.depth || 0),
  );

  let totalImported = 0;
  let totalSkipped = 0;
  const commentIdMapping = new Map();

  for (const comment of sortedComments) {
    try {
      // Get the post ID from our mapping
      const postId = postIdMapping.get(comment.postSkoolId);
      if (!postId) {
        console.log(
          `⚠️  Skipping comment - post not found: ${comment.postSkoolId}`,
        );
        totalSkipped++;
        continue;
      }

      // Get member ID from email
      const member = await client.query("members:getMemberByEmail", {
        email: comment.authorEmail,
      });
      if (!member) {
        console.error(`❌ Member not found for email: ${comment.authorEmail}`);
        totalSkipped++;
        continue;
      }

      // Get parent comment ID if exists
      let parentCommentId = undefined;
      if (comment.parentCommentSkoolId) {
        parentCommentId = commentIdMapping.get(comment.parentCommentSkoolId);
      }

      // Create the comment
      const commentId = await client.mutation("comments:createComment", {
        postId: postId,
        content: comment.content,
        parentCommentId: parentCommentId,
      });

      commentIdMapping.set(comment.skoolId, commentId);
      totalImported++;

      if (totalImported % 10 === 0) {
        process.stdout.write(`  ✅ ${totalImported} imported...\r`);
      }
    } catch (error) {
      console.error(`\n❌ Failed to import comment: ${error.message}`);
      totalSkipped++;
    }
  }

  // Save comment mapping
  const mappingArray = Array.from(commentIdMapping.entries());
  fs.writeFileSync(
    path.join(__dirname, "../migration-data/comment-id-mapping.json"),
    JSON.stringify(mappingArray, null, 2),
  );

  console.log(
    `\n✅ Comment import complete! Imported ${totalImported} comments, skipped ${totalSkipped}\n`,
  );
}

async function main() {
  console.log("=== CONVEX DATA IMPORT (DIRECT) ===\n");
  console.log("This will import:");
  console.log(`  - ${postBatches.reduce((sum, b) => sum + b.length, 0)} posts`);
  console.log(
    `  - ${commentBatches.reduce((sum, b) => sum + b.length, 0)} comments\n`,
  );

  console.log("Starting in 3 seconds...\n");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    // Import posts first
    const mapping = await importPosts();

    if (mapping.size === 0) {
      console.log("⚠️  No posts were imported. Please check the errors above.");
      return;
    }

    // Then import comments
    await importComments(mapping);

    console.log("🎉 Import complete!");
    console.log("Check your Convex dashboard to verify the data.");

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    await client.close();
    process.exit(1);
  }
}

// Run the import
main().catch(console.error);
