#!/usr/bin/env node

const { exec } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const util = require("node:util");
const execPromise = util.promisify(exec);

// Read the prepared data
const postBatches = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/post-batches-ready.json"), "utf8"),
);
const commentBatches = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/comment-batches.json"), "utf8"),
);

// Store post ID mappings
const postIdMapping = new Map();

async function runConvexFunction(functionName, args) {
  const argsString = JSON.stringify(args).replace(/"/g, '\\"');
  const command = `npx convex run ${functionName} '${argsString}'`;

  try {
    console.log(`Running: ${functionName}`);
    const { stdout, stderr } = await execPromise(command);
    if (stderr) console.error("Error:", stderr);
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`Failed to run ${functionName}:`, error.message);
    throw error;
  }
}

async function importPosts() {
  console.log("🚀 Starting post import...\n");

  for (let i = 0; i < postBatches.length; i++) {
    const batch = postBatches[i];
    console.log(
      `📦 Importing post batch ${i + 1}/${postBatches.length} (${batch.length} posts)...`,
    );

    try {
      const result = await runConvexFunction("importPostsComments:importPostsBatch", {
        posts: batch,
      });

      // Store the mapping
      if (result.mapping) {
        result.mapping.forEach(({ postId, skoolId }) => {
          postIdMapping.set(skoolId, postId);
        });
      }

      console.log(`✅ Imported ${result.imported} posts, skipped ${result.skipped}\n`);
    } catch (error) {
      console.error(`❌ Failed to import batch ${i + 1}:`, error.message);
      // Continue with next batch
    }
  }

  // Save the mapping
  const mappingArray = Array.from(postIdMapping.entries());
  fs.writeFileSync(
    path.join(__dirname, "../migration-data/post-id-mapping.json"),
    JSON.stringify(mappingArray, null, 2),
  );

  console.log(`✅ Post import complete! Imported ${postIdMapping.size} posts total\n`);
  return postIdMapping;
}

async function importComments(postIdMapping) {
  console.log("🚀 Starting comment import...\n");

  let totalImported = 0;
  let totalSkipped = 0;

  for (let i = 0; i < commentBatches.length; i++) {
    const batch = commentBatches[i];
    console.log(
      `📦 Processing comment batch ${i + 1}/${commentBatches.length} (${batch.length} comments)...`,
    );

    // Map comments to use Convex post IDs
    const mappedComments = [];
    const skippedComments = [];

    for (const comment of batch) {
      const postId = postIdMapping.get(comment.postSkoolId);
      if (!postId) {
        skippedComments.push(comment.skoolId);
        continue;
      }

      // Map parent comment IDs if they exist
      let parentCommentId;
      if (comment.parentCommentSkoolId) {
        // This is tricky - we need to import comments in order by depth
        // For now, we'll skip parent mapping and do a second pass
      }

      mappedComments.push({
        ...comment,
        postId,
        parentCommentId,
      });
    }

    if (mappedComments.length > 0) {
      console.log(
        `  Importing ${mappedComments.length} comments (${skippedComments.length} skipped)...`,
      );

      // Import comments one by one to handle parent-child relationships
      for (const comment of mappedComments) {
        try {
          await runConvexFunction("importPostsComments:importComment", comment);
          totalImported++;
        } catch (error) {
          console.error(`  ❌ Failed to import comment ${comment.skoolId}:`, error.message);
          totalSkipped++;
        }
      }
    }

    console.log(`  ✅ Batch complete\n`);
  }

  console.log(
    `✅ Comment import complete! Imported ${totalImported} comments, skipped ${totalSkipped}\n`,
  );
}

async function main() {
  console.log("=== CONVEX DATA IMPORT ===\n");
  console.log("This will import:");
  console.log(`  - ${postBatches.reduce((sum, b) => sum + b.length, 0)} posts`);
  console.log(`  - ${commentBatches.reduce((sum, b) => sum + b.length, 0)} comments\n`);

  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    // Import posts first
    const mapping = await importPosts();

    // Then import comments
    await importComments(mapping);

    console.log("🎉 Import complete!");
    console.log("Check your Convex dashboard to verify the data.");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the import
main().catch(console.error);
