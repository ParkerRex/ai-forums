#!/usr/bin/env node
// Verify the imported posts and get their IDs

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DEPLOY_KEY =
  "prod:gallant-rooster-737|eyJ2MiI6IjU3NThhOTFjMDY3NTQ1ZDQ5ODM5YTc3OTVhOWQyMTQxIn0=";

async function main() {
  // Get all posts from production
  const command = `CONVEX_DEPLOY_KEY="${DEPLOY_KEY}" npx convex run posts:getPosts '{}'`;
  const output = execSync(command, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });

  const posts = JSON.parse(output);

  // Filter posts created after June 26, 2024
  const cutoffDate = new Date("2024-06-26").getTime();
  const recentPosts = posts.filter((post) => {
    const createdAt = post.createdAt || post._creationTime;
    return createdAt > cutoffDate;
  });

  console.log(`Found ${recentPosts.length} posts created after June 26, 2024`);

  // Create a mapping of titles to IDs
  const postIdMap = {};
  recentPosts.forEach((post) => {
    // Use title as key since we don't have skoolId preserved
    const titleKey = post.title.substring(0, 50);
    postIdMap[titleKey] = post._id;
    console.log(`- "${titleKey}..." -> ${post._id}`);
  });

  // Load the original posts to match
  const importDir = path.join(__dirname, "migration-data", "import-ready-2025-07-26");
  const originalPosts = JSON.parse(
    fs.readFileSync(path.join(importDir, "posts-to-import.json"), "utf8"),
  );

  // Create mapping by matching titles
  const finalMapping = {};
  originalPosts.forEach((original) => {
    const titleKey = original.title.substring(0, 50);
    const prodId = postIdMap[titleKey];
    if (prodId) {
      finalMapping[original._originalId] = prodId;
    }
  });

  // Save the mapping
  const resultsDir = path.join(__dirname, "migration-data", "verified-import-results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(resultsDir, "verified-post-id-mapping.json"),
    JSON.stringify(
      {
        postIdMap: finalMapping,
        summary: {
          totalImported: Object.keys(finalMapping).length,
          totalExpected: originalPosts.length,
        },
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  console.log(`\n✅ Verified ${Object.keys(finalMapping).length} posts imported successfully`);
  console.log(`📁 Mapping saved to: ${resultsDir}`);

  // Now import comments with the verified mapping
  if (Object.keys(finalMapping).length > 0) {
    await importComments(finalMapping);
  }
}

async function importComments(postIdMap) {
  const importDir = path.join(__dirname, "migration-data", "import-ready-2025-07-26");
  const comments = JSON.parse(
    fs.readFileSync(path.join(importDir, "comments-to-import.json"), "utf8"),
  );

  console.log(`\n💬 Importing ${comments.length} comments...`);

  let imported = 0;
  let failed = 0;
  const _errors = [];

  // Process comments in batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    console.log(
      `\nProcessing comment batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(comments.length / BATCH_SIZE)}`,
    );

    const commentsToImport = batch.map((comment) => ({
      content: comment.content,
      authorEmail: comment.authorEmail || "",
      postSkoolId: comment.postOriginalId,
      parentSkoolId: comment.parentCommentOriginalId,
      createdAt: comment.createdAt || comment._creationTime,
      updatedAt: comment.updatedAt,
      likes: comment.netVotes || 0,
      skoolId: comment._originalId,
    }));

    const args = {
      comments: commentsToImport,
      postIdMap: postIdMap,
    };

    try {
      const argsJson = JSON.stringify(args);
      const command = `CONVEX_DEPLOY_KEY="${DEPLOY_KEY}" npx convex run importPostsComments:importCommentsBatch '${argsJson.replace(/'/g, "'\"'\"'")}'`;

      const output = execSync(command, {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        cwd: path.join(__dirname, ".."),
      });

      // Parse result
      const lines = output.trim().split("\n");
      let result = null;
      for (let j = lines.length - 1; j >= 0; j--) {
        if (lines[j].trim().startsWith("{")) {
          try {
            result = JSON.parse(lines[j]);
            break;
          } catch (_e) {
            // Continue
          }
        }
      }

      if (result?.importedCount) {
        imported += result.importedCount;
        console.log(`✅ Imported ${result.importedCount} comments`);
      } else {
        failed += batch.length;
        console.log(`❌ Failed to import batch`);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      failed += batch.length;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Comment import completed!`);
  console.log(`   Imported: ${imported}/${comments.length}`);
  console.log(`   Failed: ${failed}`);
}

main().catch(console.error);
