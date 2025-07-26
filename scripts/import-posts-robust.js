#!/usr/bin/env node
// Robust post import script for production

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEPLOY_KEY = "prod:gallant-rooster-737|eyJ2MiI6IjU3NThhOTFjMDY3NTQ1ZDQ5ODM5YTc3OTVhOWQyMTQxIn0=";

function runConvexCommand(args) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, CONVEX_DEPLOY_KEY: DEPLOY_KEY };
    const proc = spawn('npx', ['convex', 'run', 'importPostsComments:importPostsBatch', JSON.stringify(args)], {
      env,
      cwd: path.join(__dirname, '..'),
      shell: true
    });
    
    let output = '';
    let error = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}: ${error}`));
      } else {
        // Parse the output
        try {
          const lines = output.trim().split('\n');
          let result = null;
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith('{')) {
              result = JSON.parse(lines[i]);
              break;
            }
          }
          resolve(result || {});
        } catch (e) {
          reject(new Error(`Failed to parse output: ${e.message}`));
        }
      }
    });
  });
}

async function main() {
  // Load the prepared posts
  const importDir = path.join(__dirname, 'migration-data', 'import-ready-2025-07-26');
  const posts = JSON.parse(fs.readFileSync(path.join(importDir, 'posts-to-import.json'), 'utf8'));
  
  console.log(`\n📝 Importing ${posts.length} posts to production...`);
  
  let imported = 0;
  let failed = 0;
  const postIdMap = {};
  const errors = [];
  
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\nImporting post ${i + 1}/${posts.length}: "${post.title.substring(0, 50)}..."`);
    
    const args = {
      posts: [{
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
        skoolId: post._originalId
      }]
    };
    
    try {
      const result = await runConvexCommand(args);
      
      if (result.postIdMap) {
        Object.assign(postIdMap, result.postIdMap);
        imported += result.importedCount || 0;
        console.log(`✅ Success: Post imported with ID ${Object.values(result.postIdMap)[0]}`);
      } else if (result.errors && result.errors.length > 0) {
        failed++;
        const error = result.errors[0];
        errors.push(`Post "${post.title}": ${error}`);
        console.log(`❌ Failed: ${error}`);
      } else {
        failed++;
        errors.push(`Post "${post.title}": Unknown error`);
        console.log(`❌ Failed: Unknown error`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      errors.push(`Post "${post.title}": ${error.message}`);
      failed++;
    }
  }
  
  // Save the post ID mapping
  const resultsDir = path.join(__dirname, '..', 'migration-data', 'post-import-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(resultsDir, 'post-id-mapping.json'),
    JSON.stringify({
      postIdMap,
      summary: {
        total: posts.length,
        imported,
        failed
      },
      errors: errors,
      timestamp: new Date().toISOString()
    }, null, 2)
  );
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Post import completed!`);
  console.log(`   Imported: ${imported}/${posts.length}`);
  console.log(`   Failed: ${failed}`);
  console.log(`📁 ID mapping saved to: ${resultsDir}`);
  
  // Now prepare for comment import if we have posts
  if (imported > 0) {
    console.log('\n💬 Preparing to import comments...');
    
    const comments = JSON.parse(fs.readFileSync(path.join(importDir, 'comments-to-import.json'), 'utf8'));
    console.log(`Found ${comments.length} comments to import`);
    
    // Save the mapping for comment import
    fs.writeFileSync(
      path.join(resultsDir, 'post-id-map-for-comments.json'),
      JSON.stringify(postIdMap, null, 2)
    );
    
    console.log('\n🎯 Next: Run import-comments-robust.js to import the comments');
  }
}

main().catch(console.error);