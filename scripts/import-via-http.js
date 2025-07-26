#!/usr/bin/env node
// Import posts and comments using Convex HTTP Actions

const fs = require("fs");
const path = require("path");

// Configuration
const CONVEX_URL =
  process.env.CONVEX_URL || "https://your-deployment.convex.site";
const IMPORT_TOKEN = process.env.IMPORT_SECRET_TOKEN;
const BATCH_SIZE = 50;

if (!IMPORT_TOKEN) {
  console.error("Please set IMPORT_SECRET_TOKEN environment variable");
  process.exit(1);
}

async function importBatch(type, data) {
  const response = await fetch(`${CONVEX_URL}/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${IMPORT_TOKEN}`,
    },
    body: JSON.stringify({ type, data }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

async function main() {
  try {
    // Read the prepared data
    const posts = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../migration-data/posts-import-fixed.json"),
        "utf8",
      ),
    );
    const comments = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../migration-data/comments-import-fixed.json"),
        "utf8",
      ),
    );

    console.log(
      `Preparing to import ${posts.length} posts and ${comments.length} comments`,
    );

    // Import posts in batches
    const allPostIdMaps = {};
    const categoryId = "jh789zhr5zyev7h79b6kjxzv3n7mbv3f"; // Your skool category ID

    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
      const batch = posts.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing posts batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(posts.length / BATCH_SIZE)}`,
      );

      const postsWithCategory = batch.map((post, index) => ({
        ...post,
        categoryId: categoryId,
        skoolId: post.id || `post-${i + index}`,
      }));

      try {
        const result = await importBatch("posts", { posts: postsWithCategory });
        Object.assign(allPostIdMaps, result.postIdMap);
        console.log(
          `Imported ${result.importedCount} of ${result.totalCount} posts`,
        );

        if (result.errors?.length > 0) {
          console.warn("Import warnings:", result.errors);
        }
      } catch (error) {
        console.error(`Failed to import posts batch:`, error.message);
      }
    }

    console.log(`\nTotal posts imported: ${Object.keys(allPostIdMaps).length}`);

    // Import comments in batches
    if (comments.length > 0) {
      console.log("\nImporting comments...");

      const commentsWithIds = comments.map((comment, index) => ({
        ...comment,
        skoolId: comment.id || `comment-${index}`,
        postSkoolId: comment.postId || Object.keys(allPostIdMaps)[0],
        parentSkoolId: comment.parentId,
      }));

      for (let i = 0; i < commentsWithIds.length; i += BATCH_SIZE) {
        const batch = commentsWithIds.slice(i, i + BATCH_SIZE);
        console.log(
          `Processing comments batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(commentsWithIds.length / BATCH_SIZE)}`,
        );

        try {
          const result = await importBatch("comments", {
            comments: batch,
            postIdMap: allPostIdMaps,
          });
          console.log(`Imported ${result.importedCount} comments`);
        } catch (error) {
          console.error(`Failed to import comments batch:`, error.message);
        }
      }
    }

    console.log("\nImport completed!");
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

// Run the main function
main();
