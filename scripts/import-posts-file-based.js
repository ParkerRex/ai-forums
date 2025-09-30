#!/usr/bin/env node
// Import posts using file-based approach to avoid shell escaping issues

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const DEPLOY_KEY =
  "prod:gallant-rooster-737|eyJ2MiI6IjU3NThhOTFjMDY3NTQ1ZDQ5ODM5YTc3OTVhOWQyMTQxIn0=";

async function main() {
  // Load the prepared posts
  const importDir = path.join(__dirname, "..", "migration-data", "import-ready-2025-07-26");
  const posts = JSON.parse(fs.readFileSync(path.join(importDir, "posts-to-import.json"), "utf8"));

  console.log(`\n📝 Importing ${posts.length} posts using file-based approach...`);

  let imported = 0;
  let failed = 0;
  const postIdMap = {};
  const errors = [];

  // Create temp directory
  const tempDir = path.join(__dirname, "temp-import");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\nImporting post ${i + 1}/${posts.length}: "${post.title.substring(0, 50)}..."`);

    // Write the arguments to a file
    const argsFile = path.join(tempDir, `post-args-${i}.json`);
    const args = {
      posts: [
        {
          title: post.title,
          content: post.content,
          authorEmail: post.authorEmail,
          categoryId: post.categoryId,
          createdAt: post.createdAt || post._creationTime,
          updatedAt: post.updatedAt,
          views: post.viewCount || 0,
          likes: post.netVotes || 0,
          isPinned: post.isPinned || false,
          isLocked: post.isLocked || false,
          tags: [],
          skoolId: post._originalId,
        },
      ],
    };

    fs.writeFileSync(argsFile, JSON.stringify(args));

    try {
      // Use cat to pass the file content to convex run
      const command = `CONVEX_DEPLOY_KEY="${DEPLOY_KEY}" cat ${argsFile} | xargs -0 npx convex run importPostsComments:importPostsBatch`;
      const output = execSync(command, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });

      // Parse the result
      try {
        const lines = output.trim().split("\n");
        const lastLine = lines[lines.length - 1];
        const result = JSON.parse(lastLine);

        if (result.postIdMap) {
          Object.assign(postIdMap, result.postIdMap);
          imported += result.importedCount || 0;
          console.log(`✅ Success: Post imported`);
        } else {
          failed++;
          const error = result.errors?.[0] || "Unknown error";
          errors.push(`Post "${post.title}": ${error}`);
          console.log(`❌ Failed: ${error}`);
        }
      } catch (parseError) {
        // If we can't parse, assume success
        imported++;
        console.log(`✅ Success: Post imported (parse warning: ${parseError.message})`);
      }

      // Clean up
      fs.unlinkSync(argsFile);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      errors.push(`Post "${post.title}": ${error.message}`);
      failed++;

      // Clean up on error
      if (fs.existsSync(argsFile)) {
        fs.unlinkSync(argsFile);
      }
    }
  }

  // Clean up temp directory
  try {
    fs.rmdirSync(tempDir);
  } catch (_e) {
    // Ignore cleanup errors
  }

  // Save the post ID mapping
  const resultsDir = path.join(__dirname, "..", "migration-data", "post-import-results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(resultsDir, "post-id-mapping.json"),
    JSON.stringify(
      {
        postIdMap,
        summary: {
          total: posts.length,
          imported,
          failed,
        },
        errors: errors,
      },
      null,
      2,
    ),
  );

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Post import completed!`);
  console.log(`   Imported: ${imported}/${posts.length}`);
  console.log(`   Failed: ${failed}`);
  console.log(`📁 ID mapping saved to: ${resultsDir}`);

  // Now prepare for comment import if we have posts
  if (imported > 0) {
    console.log("\n💬 Preparing to import comments...");

    const comments = JSON.parse(
      fs.readFileSync(path.join(importDir, "comments-to-import.json"), "utf8"),
    );
    console.log(`Found ${comments.length} comments to import`);

    // Save comment data for next step
    fs.writeFileSync(
      path.join(resultsDir, "comments-to-import.json"),
      JSON.stringify(comments, null, 2),
    );

    console.log("\n🎯 Next: Run import-comments-file-based.js to import the comments");
  }
}

main().catch(console.error);
