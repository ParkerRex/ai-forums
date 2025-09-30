import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexClient } from "convex/browser";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

// Read the post mapping from the previous import
const postIdMapping = new Map(
  JSON.parse(
    fs.readFileSync(path.join(__dirname, "../migration-data/post-id-mapping.json"), "utf8"),
  ),
);

// Read comments
const commentBatches = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/comment-batches.json"), "utf8"),
);

// This will store the mapping of skoolId -> convexId for comments
const commentIdMapping = new Map();

async function importCommentsBatch(comments) {
  const results = [];

  for (const comment of comments) {
    // Skip if we can't find the post
    const postId = postIdMapping.get(comment.postSkoolId);
    if (!postId) {
      console.log(`Skipping comment - post not found for skoolId: ${comment.postSkoolId}`);
      continue;
    }

    // Map parent comment if it exists
    let parentCommentId;
    if (comment.parentCommentSkoolId && comment.parentCommentSkoolId !== comment.postSkoolId) {
      parentCommentId = commentIdMapping.get(comment.parentCommentSkoolId);
      // If parent not found yet, we'll handle in a second pass
    }

    try {
      // Clean the comment data - remove fields not in the schema
      const cleanComment = {
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        authorEmail: comment.authorEmail,
        postId: postId,
        parentCommentId: parentCommentId,
        status: comment.status || "active",
        upvotes: comment.upvotes || 0,
        downvotes: comment.downvotes || 0,
        netVotes: comment.netVotes || 0,
        depth: comment.depth || 0,
        childCount: comment.childCount || 0,
        skoolId: comment.skoolId,
      };

      // Use the working importData mutation instead
      const result = await client.mutation("importData:importComments", {
        comments: [cleanComment],
      });

      if (result.mapping && result.mapping.length > 0) {
        const { commentId, skoolId } = result.mapping[0];
        commentIdMapping.set(skoolId, commentId);
        results.push({ commentId, skoolId });
      }
    } catch (error) {
      console.error(`Failed to import comment ${comment.skoolId}:`, error.message);
    }
  }

  return results;
}

async function _updateParentRelationships() {
  console.log("\n🔗 Updating parent-child comment relationships...");

  // Read all comments again to update parent relationships
  const allComments = commentBatches.flat();
  let updated = 0;

  for (const comment of allComments) {
    if (comment.parentCommentSkoolId && comment.parentCommentSkoolId !== comment.postSkoolId) {
      const commentId = commentIdMapping.get(comment.skoolId);
      const parentId = commentIdMapping.get(comment.parentCommentSkoolId);

      if (commentId && parentId) {
        try {
          // We'll need a mutation to update the parent relationship
          console.log(
            `Linking comment ${comment.skoolId} to parent ${comment.parentCommentSkoolId}`,
          );
          updated++;
        } catch (error) {
          console.error(`Failed to update parent relationship:`, error.message);
        }
      }
    }
  }

  console.log(`✅ Updated ${updated} parent-child relationships`);
}

async function main() {
  console.log("=== COMMENT IMPORT ===\n");
  console.log(`Found ${postIdMapping.size} posts mapped from previous import`);
  console.log(`Ready to import ${commentBatches.reduce((sum, b) => sum + b.length, 0)} comments\n`);

  if (postIdMapping.size === 0) {
    console.error("❌ No post mappings found. Please run the post import first.");
    process.exit(1);
  }

  // Sort all comments by depth to ensure parents are imported before children
  const allComments = commentBatches.flat();
  const sortedComments = allComments.sort((a, b) => (a.depth || 0) - (b.depth || 0));

  // Re-batch sorted comments
  const sortedBatches = [];
  const batchSize = 50;
  for (let i = 0; i < sortedComments.length; i += batchSize) {
    sortedBatches.push(sortedComments.slice(i, i + batchSize));
  }

  let totalImported = 0;

  // Import comments in order of depth
  for (let i = 0; i < sortedBatches.length; i++) {
    const batch = sortedBatches[i];
    console.log(
      `\n📦 Importing comment batch ${i + 1}/${sortedBatches.length} (${batch.length} comments)...`,
    );

    const results = await importCommentsBatch(batch);
    totalImported += results.length;

    console.log(`✅ Imported ${results.length} comments from this batch`);
  }

  // Save comment mapping
  const mappingArray = Array.from(commentIdMapping.entries());
  fs.writeFileSync(
    path.join(__dirname, "../migration-data/comment-id-mapping.json"),
    JSON.stringify(mappingArray, null, 2),
  );

  console.log(`\n✅ Comment import complete! Imported ${totalImported} comments total`);
  console.log(`📁 Mapping saved to migration-data/comment-id-mapping.json`);

  // Update parent relationships in a second pass
  // await updateParentRelationships();

  process.exit(0);
}

main().catch(console.error);
