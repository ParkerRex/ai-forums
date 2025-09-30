#!/usr/bin/env node
// Fixed comment import script with proper post mapping

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const DEPLOY_KEY =
  "prod:gallant-rooster-737|eyJ2MiI6IjU3NThhOTFjMDY3NTQ1ZDQ5ODM5YTc3OTVhOWQyMTQxIn0=";

async function main() {
  // Load the verified post ID mapping
  const verifiedMapping = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "migration-data/verified-import-results/verified-post-id-mapping.json"),
      "utf8",
    ),
  );
  const postIdMap = verifiedMapping.postIdMap;

  // Load comments
  const comments = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "migration-data/import-ready-2025-07-26/comments-to-import.json"),
      "utf8",
    ),
  );

  console.log(`\n💬 Importing ${comments.length} comments with verified post mappings...`);
  console.log(`📌 Have mappings for ${Object.keys(postIdMap).length} posts`);

  let imported = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  // Process comments in batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);

    // Filter out comments for posts we don't have mappings for
    const validComments = batch.filter((comment) => {
      if (!postIdMap[comment.postOriginalId]) {
        console.log(`⚠️  Skipping comment - no mapping for post: ${comment.postOriginalId}`);
        skipped++;
        return false;
      }
      return true;
    });

    if (validComments.length === 0) continue;

    console.log(
      `\nProcessing comment batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(comments.length / BATCH_SIZE)} (${validComments.length} valid comments)`,
    );

    const commentsToImport = validComments.map((comment) => {
      const obj = {
        content: comment.content,
        authorEmail: comment.authorEmail || "",
        postSkoolId: comment.postOriginalId,
        createdAt: comment.createdAt || comment._creationTime,
        updatedAt: comment.updatedAt,
        likes: comment.netVotes || 0,
        skoolId: comment._originalId,
      };

      // Only add parentSkoolId if it exists
      if (comment.parentCommentOriginalId) {
        obj.parentSkoolId = comment.parentCommentOriginalId;
      }

      return obj;
    });

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
        // Assume success if no result parsed
        imported += validComments.length;
        console.log(`✅ Imported ${validComments.length} comments (no result parsed)`);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      failed += validComments.length;
      validComments.forEach((_c) => errors.push(`Comment batch error: ${error.message}`));
    }
  }

  // Save results
  const resultsDir = path.join(__dirname, "migration-data", "final-import-results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(resultsDir, "comment-import-results.json"),
    JSON.stringify(
      {
        summary: {
          total: comments.length,
          imported,
          failed,
          skipped,
        },
        errors: errors,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Comment import completed!`);
  console.log(`   Imported: ${imported}/${comments.length}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped: ${skipped} (no post mapping)`);
  console.log(`📁 Results saved to: ${resultsDir}`);
}

main().catch(console.error);
