// This script prepares all posts to use a single "skool" category

const fs = require("node:fs");
const path = require("node:path");

// Read the cleaned import files
const posts = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/posts-import-fixed.json"), "utf8"),
);
const comments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/comments-import-fixed.json"), "utf8"),
);

console.log("=== SIMPLIFIED IMPORT WITH SKOOL CATEGORY ===\n");

console.log("📋 Step 1: Create the Skool Category");
console.log("Run this in Convex dashboard functions tab:\n");
console.log("Function: importPostsComments:createDefaultCategory");
console.log("Arguments:");
console.log(
  JSON.stringify(
    {
      name: "skool",
      displayName: "Skool Import",
      description: "Posts imported from Skool community",
    },
    null,
    2,
  ),
);

console.log("\n📋 Step 2: Get the Skool Category ID");
console.log("After creating the category, run:");
console.log("Function: importPostsComments:getCategoryByName");
console.log("Arguments:");
console.log(JSON.stringify({ name: "skool" }, null, 2));

console.log("\n📋 Step 3: Update All Posts with Skool Category");
console.log(`Total posts to import: ${posts.length}`);
console.log("Replace SKOOL_CATEGORY_ID with the actual ID from Step 2\n");

// Create batches with placeholder for the skool category ID
const batchSize = 50;
const postBatches = [];

for (let i = 0; i < posts.length; i += batchSize) {
  const batch = posts.slice(i, i + batchSize).map((post) => {
    // Remove labelId and contributors fields
    const { labelId, contributors, ...postWithoutExtras } = post;
    return {
      ...postWithoutExtras,
      categoryId: "SKOOL_CATEGORY_ID", // This will be replaced with actual ID
    };
  });
  postBatches.push(batch);
}

// Save the updated batches
const outputDir = path.join(__dirname, "../migration-data");

// Save post batches with skool category
fs.writeFileSync(
  path.join(outputDir, "post-batches-skool.json"),
  JSON.stringify(postBatches, null, 2),
);

// Comments don't need category IDs, so just save them as-is in batches
const commentBatchSize = 100;
const commentBatches = [];
for (let i = 0; i < comments.length; i += commentBatchSize) {
  commentBatches.push(comments.slice(i, i + commentBatchSize));
}

fs.writeFileSync(
  path.join(outputDir, "comment-batches.json"),
  JSON.stringify(commentBatches, null, 2),
);

console.log("✅ Batch files created:");
console.log(`  - migration-data/post-batches-skool.json (${postBatches.length} batches)`);
console.log(`  - migration-data/comment-batches.json (${commentBatches.length} batches)`);

console.log("\n📋 Sample Import Command (after replacing SKOOL_CATEGORY_ID):");
console.log("Function: importPostsComments:importPostsBatch");
console.log("Arguments: (first batch preview)");
const sampleBatch = postBatches[0].slice(0, 2).map((post) => ({
  ...post,
  categoryId: "<<<REPLACE_WITH_ACTUAL_SKOOL_CATEGORY_ID>>>",
}));
console.log(JSON.stringify({ posts: sampleBatch }, null, 2));

console.log("\n💡 Import Steps:");
console.log('1. Create the "skool" category using the function above');
console.log("2. Get the category ID");
console.log('3. Find & Replace "SKOOL_CATEGORY_ID" with the actual ID in post-batches-skool.json');
console.log("4. Import each post batch using importPostsComments:importPostsBatch");
console.log("5. Import comments after all posts are done");

// Create a simple find-replace script
const replaceScript = `
// Quick script to replace category IDs after you have the actual ID
const fs = require('fs');
const path = require('path');

const SKOOL_CATEGORY_ID = "YOUR_ACTUAL_CATEGORY_ID_HERE"; // <-- Replace this

const batches = JSON.parse(fs.readFileSync('./migration-data/post-batches-skool.json', 'utf8'));
const updated = JSON.stringify(batches, null, 2).replace(/SKOOL_CATEGORY_ID/g, SKOOL_CATEGORY_ID);
fs.writeFileSync('./migration-data/post-batches-ready.json', updated);
console.log('✅ Created post-batches-ready.json with actual category IDs');
`;

fs.writeFileSync(path.join(__dirname, "replace-category-id.js"), replaceScript);

console.log("\n🔧 Helper script created: scripts/replace-category-id.js");
console.log(
  "   Edit this file with your actual category ID and run it to prepare final import files",
);
