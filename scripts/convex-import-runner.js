#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Read the prepared data
const postBatches = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-data/post-batches-ready.json'), 'utf8'));
const commentBatches = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-data/comment-batches.json'), 'utf8'));

// Store post ID mappings
const postIdMapping = new Map();

async function runConvexFunction(functionName, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${functionName}`);
    
    // Write args to temp file to avoid shell escaping issues
    const tempFile = path.join(__dirname, `../migration-data/temp-args-${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(args));
    
    const process = spawn('npx', ['convex', 'run', functionName, `@${tempFile}`], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      
      if (code !== 0) {
        console.error('Error:', stderr);
        reject(new Error(`Process exited with code ${code}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          // If not JSON, return raw output
          resolve(stdout);
        }
      }
    });
  });
}

async function importPosts() {
  console.log('🚀 Starting post import...\n');
  
  for (let i = 0; i < postBatches.length; i++) {
    const batch = postBatches[i];
    console.log(`📦 Importing post batch ${i + 1}/${postBatches.length} (${batch.length} posts)...`);
    
    try {
      const result = await runConvexFunction('importPostsComments:importPostsBatch', { posts: batch });
      
      // Store the mapping
      if (result && result.mapping) {
        result.mapping.forEach(({ postId, skoolId }) => {
          postIdMapping.set(skoolId, postId);
        });
        console.log(`✅ Imported ${result.imported} posts, skipped ${result.skipped}\n`);
      } else {
        console.log('✅ Batch processed (check Convex dashboard for details)\n');
      }
    } catch (error) {
      console.error(`❌ Failed to import batch ${i + 1}: ${error.message}\n`);
      // Continue with next batch
    }
  }
  
  // Save the mapping
  const mappingArray = Array.from(postIdMapping.entries());
  fs.writeFileSync(
    path.join(__dirname, '../migration-data/post-id-mapping.json'),
    JSON.stringify(mappingArray, null, 2)
  );
  
  console.log(`✅ Post import complete! Imported ${postIdMapping.size} posts total\n`);
  return postIdMapping;
}

async function importComments(postIdMapping) {
  console.log('🚀 Starting comment import...\n');
  
  // First, sort comments by depth to ensure parents are imported before children
  const allComments = commentBatches.flat();
  const sortedComments = allComments.sort((a, b) => a.depth - b.depth);
  
  // Re-batch sorted comments
  const sortedBatches = [];
  const batchSize = 50; // Smaller batches for comments
  for (let i = 0; i < sortedComments.length; i += batchSize) {
    sortedBatches.push(sortedComments.slice(i, i + batchSize));
  }
  
  let totalImported = 0;
  let totalSkipped = 0;
  const commentIdMapping = new Map();
  
  for (let i = 0; i < sortedBatches.length; i++) {
    const batch = sortedBatches[i];
    console.log(`📦 Processing comment batch ${i + 1}/${sortedBatches.length} (${batch.length} comments)...`);
    
    for (const comment of batch) {
      const postId = postIdMapping.get(comment.postSkoolId);
      if (!postId) {
        console.log(`  ⚠️  Skipping comment - post not found: ${comment.postSkoolId}`);
        totalSkipped++;
        continue;
      }
      
      // Map parent comment ID if exists
      let parentCommentId = undefined;
      if (comment.parentCommentSkoolId) {
        parentCommentId = commentIdMapping.get(comment.parentCommentSkoolId);
      }
      
      const mappedComment = {
        ...comment,
        postId,
        parentCommentId
      };
      
      try {
        const result = await runConvexFunction('importPostsComments:importComment', mappedComment);
        if (result && result.commentId) {
          commentIdMapping.set(comment.skoolId, result.commentId);
        }
        totalImported++;
        
        // Show progress every 10 comments
        if (totalImported % 10 === 0) {
          process.stdout.write(`  ✅ ${totalImported} imported...\\r`);
        }
      } catch (error) {
        console.error(`\\n  ❌ Failed to import comment: ${error.message}`);
        totalSkipped++;
      }
    }
    
    console.log(`\\n  ✅ Batch ${i + 1} complete\\n`);
  }
  
  console.log(`✅ Comment import complete! Imported ${totalImported} comments, skipped ${totalSkipped}\\n`);
}

async function main() {
  console.log('=== CONVEX DATA IMPORT ===\\n');
  console.log('This will import:');
  console.log(`  - ${postBatches.reduce((sum, b) => sum + b.length, 0)} posts`);
  console.log(`  - ${commentBatches.reduce((sum, b) => sum + b.length, 0)} comments\\n`);
  
  console.log('Starting in 3 seconds...\\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Import posts first
    const mapping = await importPosts();
    
    if (mapping.size === 0) {
      console.log('⚠️  No posts were imported. Please check:');
      console.log('  1. Members exist in the database with matching emails');
      console.log('  2. The Convex backend is running (npx convex dev)');
      console.log('  3. The category ID is correct\\n');
      return;
    }
    
    // Then import comments
    await importComments(mapping);
    
    console.log('🎉 Import complete!');
    console.log('Check your Convex dashboard to verify the data.');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
main().catch(console.error);