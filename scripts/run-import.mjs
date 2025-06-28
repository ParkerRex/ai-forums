import { ConvexClient } from "convex/browser";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

// Read the prepared data
const postBatches = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-data/post-batches-ready.json'), 'utf8'));
const commentBatches = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-data/comment-batches.json'), 'utf8'));

// Store post ID mappings
const postIdMapping = new Map();

async function importPosts() {
  console.log('🚀 Starting post import...\n');
  
  for (let i = 0; i < postBatches.length; i++) {
    const batch = postBatches[i];
    console.log(`📦 Importing post batch ${i + 1}/${postBatches.length} (${batch.length} posts)...`);
    
    try {
      const result = await client.mutation("importData:importPosts", { posts: batch });
      
      // Store the mapping
      if (result.mapping) {
        result.mapping.forEach(({ postId, skoolId }) => {
          postIdMapping.set(skoolId, postId);
        });
      }
      
      console.log(`✅ Imported ${result.imported} posts, skipped ${result.skipped}\n`);
    } catch (error) {
      console.error(`❌ Failed to import batch ${i + 1}:`, error.message);
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
  
  // Map comments to use Convex post IDs
  let totalImported = 0;
  let totalSkipped = 0;
  
  for (let i = 0; i < commentBatches.length; i++) {
    const batch = commentBatches[i];
    console.log(`📦 Processing comment batch ${i + 1}/${commentBatches.length} (${batch.length} comments)...`);
    
    // Map comments to use actual post IDs
    const mappedComments = [];
    
    for (const comment of batch) {
      const postId = postIdMapping.get(comment.postSkoolId);
      if (!postId) {
        totalSkipped++;
        continue;
      }
      
      // Remove extra fields that aren't in the validator
      const { postSkoolId, parentCommentSkoolId, ...cleanComment } = comment;
      
      mappedComments.push({
        ...cleanComment,
        postId,
        parentCommentId: undefined // Will handle parent mapping in a second pass
      });
    }
    
    if (mappedComments.length > 0) {
      try {
        // For now, import comments one by one since we don't have a batch function
        for (const comment of mappedComments) {
          try {
            await client.mutation("importPostsComments:importComment", comment);
            totalImported++;
          } catch (error) {
            console.error(`Failed to import comment: ${error.message}`);
            totalSkipped++;
          }
        }
        console.log(`✅ Imported ${mappedComments.length} comments from this batch\n`);
      } catch (error) {
        console.error(`❌ Failed to import batch ${i + 1}:`, error.message);
      }
    }
  }
  
  console.log(`✅ Comment import complete! Imported ${totalImported} comments, skipped ${totalSkipped}\n`);
}

async function main() {
  console.log('=== CONVEX DATA IMPORT ===\n');
  console.log('This will import:');
  console.log(`  - ${postBatches.reduce((sum, b) => sum + b.length, 0)} posts`);
  console.log(`  - ${commentBatches.reduce((sum, b) => sum + b.length, 0)} comments\n`);
  
  console.log('Starting in 3 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Import posts first
    const mapping = await importPosts();
    
    if (mapping.size === 0) {
      console.log('⚠️  No posts were imported. Please check:');
      console.log('  1. Members exist in the database with matching emails');
      console.log('  2. The Convex backend is running (npx convex dev)');
      console.log('  3. The category ID is correct\n');
      return;
    }
    
    // Then import comments
    await importComments(mapping);
    
    console.log('🎉 Import complete!');
    console.log('Check your Convex dashboard to verify the data.');
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
main().catch(console.error);