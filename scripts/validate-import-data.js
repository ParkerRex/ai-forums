// Validates the transformed data and identifies any issues

const fs = require("node:fs");
const path = require("node:path");

// Read all the files
const posts = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/posts-import-cleaned.json"), "utf8"),
);
const comments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/comments-import-cleaned.json"), "utf8"),
);
const _userMapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/user-mapping.json"), "utf8"),
);
const members = fs.readFileSync(path.join(__dirname, "../members.csv"), "utf8");

// Parse members CSV to get existing emails
const memberEmails = new Set();
members
  .split("\n")
  .slice(1)
  .forEach((line) => {
    const parts = line.split(",");
    if (parts.length >= 3) {
      const email = parts[2].trim().replace(/"/g, "");
      if (email) memberEmails.add(email);
    }
  });

console.log("=== DATA VALIDATION REPORT ===\n");

// 1. Check unique emails in data
const uniquePostAuthors = new Set(posts.map((p) => p.authorEmail));
const uniqueCommentAuthors = new Set(comments.map((c) => c.authorEmail));
const allUniqueAuthors = new Set([...uniquePostAuthors, ...uniqueCommentAuthors]);

console.log("📊 Author Statistics:");
console.log(`  - Unique post authors: ${uniquePostAuthors.size}`);
console.log(`  - Unique comment authors: ${uniqueCommentAuthors.size}`);
console.log(`  - Total unique authors: ${allUniqueAuthors.size}`);
console.log(`  - Existing members in CSV: ${memberEmails.size}`);

// 2. Check for missing member emails
const missingEmails = [...allUniqueAuthors].filter((email) => !memberEmails.has(email));
console.log(`\n⚠️  Authors not in members.csv: ${missingEmails.length}`);
if (missingEmails.length > 0 && missingEmails.length <= 10) {
  missingEmails.forEach((email) => console.log(`  - ${email}`));
} else if (missingEmails.length > 10) {
  console.log(`  - Showing first 10: ${missingEmails.slice(0, 10).join(", ")}`);
}

// 3. Check post-comment relationships
const postIds = new Set(posts.map((p) => p.skoolId));
const orphanComments = comments.filter((c) => !postIds.has(c.postSkoolId));
console.log(`\n🔗 Relationship Validation:`);
console.log(`  - Total posts: ${posts.length}`);
console.log(`  - Total comments: ${comments.length}`);
console.log(`  - Orphan comments (no parent post): ${orphanComments.length}`);

// 4. Check comment hierarchy
const commentIds = new Set(comments.map((c) => c.skoolId));
const brokenCommentChains = comments.filter(
  (c) => c.parentCommentSkoolId && !commentIds.has(c.parentCommentSkoolId),
);
console.log(`  - Broken comment chains: ${brokenCommentChains.length}`);

// 5. Content validation
const emptyPosts = posts.filter((p) => !p.content || p.content.trim() === "");
const emptyComments = comments.filter((c) => !c.content || c.content.trim() === "");
console.log(`\n📝 Content Validation:`);
console.log(`  - Posts with empty content: ${emptyPosts.length}`);
console.log(`  - Comments with empty content: ${emptyComments.length}`);

// 6. Date validation
const now = Date.now();
const futurePosts = posts.filter((p) => p.createdAt > now);
const futureComments = comments.filter((c) => c.createdAt > now);
console.log(`\n📅 Date Validation:`);
console.log(`  - Posts with future dates: ${futurePosts.length}`);
console.log(`  - Comments with future dates: ${futureComments.length}`);

// 7. Vote validation
const negativeVotePosts = posts.filter((p) => p.upvotes < 0 || p.netVotes < 0);
const negativeVoteComments = comments.filter((c) => c.upvotes < 0 || c.netVotes < 0);
console.log(`\n👍 Vote Validation:`);
console.log(`  - Posts with negative votes: ${negativeVotePosts.length}`);
console.log(`  - Comments with negative votes: ${negativeVoteComments.length}`);

// 8. Category/Label analysis
const uniqueLabels = new Set(posts.map((p) => p.labelId).filter(Boolean));
console.log(`\n🏷️  Category/Label Analysis:`);
console.log(`  - Unique label IDs: ${uniqueLabels.size}`);
console.log(`  - Posts without labels: ${posts.filter((p) => !p.labelId).length}`);

// Summary
console.log("\n=== SUMMARY ===");
const issues = [];
if (missingEmails.length > 0) issues.push(`${missingEmails.length} missing member emails`);
if (orphanComments.length > 0) issues.push(`${orphanComments.length} orphan comments`);
if (brokenCommentChains.length > 0)
  issues.push(`${brokenCommentChains.length} broken comment chains`);
if (emptyPosts.length > 0) issues.push(`${emptyPosts.length} empty posts`);
if (emptyComments.length > 0) issues.push(`${emptyComments.length} empty comments`);

if (issues.length === 0) {
  console.log("✅ All validation checks passed!");
} else {
  console.log("⚠️  Issues found:");
  issues.forEach((issue) => console.log(`  - ${issue}`));
  console.log("\nRecommendations:");
  if (missingEmails.length > 0) {
    console.log("  - Create placeholder members for missing emails before import");
  }
  if (orphanComments.length > 0) {
    console.log("  - Skip orphan comments or investigate missing posts");
  }
}
