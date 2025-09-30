// This script prepares the import commands you can run in the Convex dashboard
// or through a custom import page

const fs = require("node:fs");
const path = require("node:path");

// Read the cleaned import files
const posts = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/posts-import-cleaned.json"), "utf8"),
);
const comments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/comments-import-cleaned.json"), "utf8"),
);

// Get unique label IDs
const uniqueLabels = [...new Set(posts.map((p) => p.labelId).filter(Boolean))];

console.log("=== IMPORT PREPARATION ===\n");

console.log("📋 Step 1: Create Categories from Labels");
console.log("Run this in Convex dashboard functions tab:\n");
console.log("Function: importPostsComments:createCategoriesFromLabels");
console.log("Arguments:");
console.log(JSON.stringify({ labelIds: uniqueLabels }, null, 2));

console.log("\n📋 Step 2: Get Category Mapping");
console.log("After creating categories, run:");
console.log("Function: importPostsComments:getAllCategories");
console.log("(no arguments needed)");

console.log("\n📋 Step 3: Import Posts in Batches");
console.log(`Total posts to import: ${posts.length}`);
console.log("You'll need to map labelIds to categoryIds from Step 2");

// Create sample batch for first 5 posts
const sampleBatch = posts.slice(0, 5).map((post) => ({
  ...post,
  categoryId: "REPLACE_WITH_ACTUAL_CATEGORY_ID", // This needs to be replaced with actual IDs
}));

console.log("\nSample batch (first 5 posts):");
console.log("Function: importPostsComments:importPostsBatch");
console.log("Arguments:");
console.log(JSON.stringify({ posts: sampleBatch }, null, 2));

console.log("\n📋 Step 4: Import Comments");
console.log(`Total comments to import: ${comments.length}`);
console.log("Comments need to be imported after posts are created");

// Save batch files for easier import
const batchSize = 50;
const postBatches = [];
for (let i = 0; i < posts.length; i += batchSize) {
  postBatches.push(posts.slice(i, i + batchSize));
}

const commentBatchSize = 100;
const commentBatches = [];
for (let i = 0; i < comments.length; i += commentBatchSize) {
  commentBatches.push(comments.slice(i, i + commentBatchSize));
}

// Save batches
fs.writeFileSync(
  path.join(__dirname, "../migration-data/post-batches.json"),
  JSON.stringify(postBatches, null, 2),
);

fs.writeFileSync(
  path.join(__dirname, "../migration-data/comment-batches.json"),
  JSON.stringify(commentBatches, null, 2),
);

console.log("\n✅ Batch files created:");
console.log(`  - migration-data/post-batches.json (${postBatches.length} batches)`);
console.log(`  - migration-data/comment-batches.json (${commentBatches.length} batches)`);

console.log("\n🔍 Label to Category Mapping Needed:");
uniqueLabels.forEach((label, index) => {
  console.log(`  ${index + 1}. ${label} → [Category ID from Step 2]`);
});

console.log("\n💡 Next Steps:");
console.log("1. Run the category creation in Convex dashboard");
console.log("2. Note down the category IDs");
console.log("3. Update the post batches with correct category IDs");
console.log("4. Import posts batch by batch");
console.log("5. Import comments after posts are done");
