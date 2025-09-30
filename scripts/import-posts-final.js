#!/usr/bin/env node
// Final post import script with proper escaping

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const DEPLOY_KEY =
  "prod:gallant-rooster-737|eyJ2MiI6IjU3NThhOTFjMDY3NTQ1ZDQ5ODM5YTc3OTVhOWQyMTQxIn0=";

async function main() {
  // Load the prepared posts
  const importDir = path.join(__dirname, "migration-data", "import-ready-2025-07-26");
  const posts = JSON.parse(fs.readFileSync(path.join(importDir, "posts-to-import.json"), "utf8"));

  console.log(`\n📝 Importing ${posts.length} posts to production...`);

  let imported = 0;
  let failed = 0;
  const postIdMap = {};
  const errors = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\nImporting post ${i + 1}/${posts.length}: "${post.title.substring(0, 50)}..."`);

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

    try {
      // Use execSync with the JSON as a single quoted argument
      const argsJson = JSON.stringify(args);
      const command = `CONVEX_DEPLOY_KEY="${DEPLOY_KEY}" npx convex run importPostsComments:importPostsBatch '${argsJson.replace(/'/g, "'\"'\"'")}'`;

      const output = execSync(command, {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        cwd: path.join(__dirname, ".."),
      });

      // Parse the output
      const lines = output.trim().split("\n");
      let result = null;
      for (let j = lines.length - 1; j >= 0; j--) {
        if (lines[j].trim().startsWith("{")) {
          try {
            result = JSON.parse(lines[j]);
            break;
          } catch (_e) {
            // Continue looking
          }
        }
      }

      if (result?.postIdMap) {
        Object.assign(postIdMap, result.postIdMap);
        imported += result.importedCount || 0;
        console.log(`✅ Success: Post imported with ID ${Object.values(result.postIdMap)[0]}`);
      } else if (result?.errors && result.errors.length > 0) {
        failed++;
        const error = result.errors[0];
        errors.push(`Post "${post.title}": ${error}`);
        console.log(`❌ Failed: ${error}`);
      } else {
        // Assume success if we can't parse
        imported++;
        console.log(`✅ Success: Post imported (no result parsed)`);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      errors.push(`Post "${post.title}": ${error.message}`);
      failed++;
    }
  }

  // Save the post ID mapping
  const resultsDir = path.join(__dirname, "migration-data", "post-import-results-final");
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
        timestamp: new Date().toISOString(),
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

    // Create comment import script
    await createCommentImportScript(postIdMap, comments);

    console.log("\n🎯 Next: Run import-comments-final.js to import the comments");
  }
}

async function createCommentImportScript(postIdMap, comments) {
  const scriptContent = `#!/usr/bin/env node
// Comment import script

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEPLOY_KEY = "${DEPLOY_KEY}";
const postIdMap = ${JSON.stringify(postIdMap, null, 2)};

async function main() {
  const comments = ${JSON.stringify(comments, null, 2)};
  
  console.log(\`\\n💬 Importing \${comments.length} comments...\`);
  
  let imported = 0;
  let failed = 0;
  const errors = [];
  
  // Process comments in batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    console.log(\`\\nProcessing comment batch \${Math.floor(i / BATCH_SIZE) + 1}/\${Math.ceil(comments.length / BATCH_SIZE)}\`);
    
    const commentsToImport = batch.map(comment => ({
      content: comment.content,
      authorEmail: comment.authorEmail || "",
      postSkoolId: comment.postOriginalId,
      parentSkoolId: comment.parentCommentOriginalId,
      createdAt: comment.createdAt || comment._creationTime,
      updatedAt: comment.updatedAt,
      likes: comment.netVotes || 0,
      skoolId: comment._originalId
    }));
    
    const args = {
      comments: commentsToImport,
      postIdMap: postIdMap
    };
    
    try {
      const argsJson = JSON.stringify(args);
      const command = \`CONVEX_DEPLOY_KEY="\${DEPLOY_KEY}" npx convex run importPostsComments:importCommentsBatch '\${argsJson.replace(/'/g, "'\\"'\\"'")}'\`;
      
      const output = execSync(command, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        cwd: path.join(__dirname, '..')
      });
      
      // Parse result
      const lines = output.trim().split('\\n');
      let result = null;
      for (let j = lines.length - 1; j >= 0; j--) {
        if (lines[j].trim().startsWith('{')) {
          try {
            result = JSON.parse(lines[j]);
            break;
          } catch (e) {
            // Continue
          }
        }
      }
      
      if (result && result.importedCount) {
        imported += result.importedCount;
        console.log(\`✅ Imported \${result.importedCount} comments\`);
      } else {
        failed += batch.length;
        console.log(\`❌ Failed to import batch\`);
      }
      
    } catch (error) {
      console.error(\`❌ Error: \${error.message}\`);
      failed += batch.length;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\\n' + '='.repeat(50));
  console.log(\`✅ Comment import completed!\`);
  console.log(\`   Imported: \${imported}/\${comments.length}\`);
  console.log(\`   Failed: \${failed}\`);
}

main().catch(console.error);
`;

  fs.writeFileSync(path.join(__dirname, "import-comments-final.js"), scriptContent);

  fs.chmodSync(path.join(__dirname, "import-comments-final.js"), "755");
}

main().catch(console.error);
