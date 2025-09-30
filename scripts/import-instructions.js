const fs = require("node:fs");
const path = require("node:path");

// Read the ready files
const postBatches = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/post-batches-ready.json"), "utf8"),
);
const commentBatches = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/comment-batches.json"), "utf8"),
);

console.log("=== IMPORT INSTRUCTIONS ===\n");

console.log("📦 Data Ready for Import:");
console.log(
  `  - ${postBatches.length} post batches (${postBatches.reduce((sum, batch) => sum + batch.length, 0)} total posts)`,
);
console.log(
  `  - ${commentBatches.length} comment batches (${commentBatches.reduce((sum, batch) => sum + batch.length, 0)} total comments)`,
);

console.log("\n🔄 Step 1: Import Posts");
console.log("Run these in Convex Dashboard functions tab:\n");

postBatches.forEach((batch, index) => {
  console.log(`Batch ${index + 1}/${postBatches.length} (${batch.length} posts):`);
  console.log("Function: importPostsComments:importPostsBatch");
  console.log(`Arguments: Copy from migration-data/post-batch-${index}.json\n`);
});

console.log("🔄 Step 2: Import Comments (AFTER all posts are imported)");
console.log("This requires mapping post IDs from Skool to Convex IDs");
console.log("You'll need to first get the mapping of imported posts\n");

// Save individual batch files for easier copying
postBatches.forEach((batch, index) => {
  fs.writeFileSync(
    path.join(__dirname, `../migration-data/post-batch-${index}.json`),
    JSON.stringify({ posts: batch }, null, 2),
  );
});

commentBatches.forEach((batch, index) => {
  fs.writeFileSync(
    path.join(__dirname, `../migration-data/comment-batch-${index}.json`),
    JSON.stringify({ comments: batch }, null, 2),
  );
});

console.log("✅ Individual batch files created for easy copying:");
console.log(
  "  - Post batches: migration-data/post-batch-0.json through post-batch-" +
    (postBatches.length - 1) +
    ".json",
);
console.log(
  "  - Comment batches: migration-data/comment-batch-0.json through comment-batch-" +
    (commentBatches.length - 1) +
    ".json",
);

// Show sample of first batch
console.log("\n📋 Sample: First Post Batch");
console.log("Function: importPostsComments:importPostsBatch");
console.log("Arguments:");
const sampleBatch = {
  posts: postBatches[0].slice(0, 2).map((post) => ({
    ...post,
    content: `${post.content.substring(0, 100)}...`, // Truncate for display
  })),
};
console.log(JSON.stringify(sampleBatch, null, 2));

console.log("\n⚠️  IMPORTANT: Comments depend on posts being imported first!");
console.log(
  "After importing posts, you'll need to create a mapping of Skool post IDs to Convex post IDs.",
);
