// Cleans up Skool's markdown formatting to make content more
// readable.

const fs = require("node:fs");
const path = require("node:path");

// Helper function to clean Skool markdown/formatting
function cleanSkoolContent(content) {
  if (!content) return "";

  // Replace Skool user mentions [@Name](obj://user/id) with @Name
  content = content.replace(/\[@([^\]]+)\]\(obj:\/\/user\/[^)]+\)/g, "@$1");

  // Replace Skool links [text](url) with markdown links
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "[$1]($2)");

  // Convert Skool lists [ul][li]item[li]item2 to markdown lists
  content = content.replace(/\[ul\]/g, "\n");
  content = content.replace(/\[li\]/g, "- ");
  content = content.replace(/\[\/li\]/g, "");
  content = content.replace(/\[\/ul\]/g, "\n");

  // Handle escaped characters
  content = content.replace(/\\n/g, "\n");
  content = content.replace(/\\\(/g, "(");
  content = content.replace(/\\\)/g, ")");

  // Clean up extra whitespace
  content = content.replace(/\n{3,}/g, "\n\n");
  content = content.trim();

  return content;
}

// Read the generated files
const postsPath = path.join(__dirname, "../migration-data/posts-import.json");
const commentsPath = path.join(__dirname, "../migration-data/comments-import.json");

const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));
const comments = JSON.parse(fs.readFileSync(commentsPath, "utf8"));

// Clean post content
console.log("Cleaning post content...");
const cleanedPosts = posts.map((post) => ({
  ...post,
  content: cleanSkoolContent(post.content),
  title: cleanSkoolContent(post.title),
}));

// Clean comment content
console.log("Cleaning comment content...");
const cleanedComments = comments.map((comment) => ({
  ...comment,
  content: cleanSkoolContent(comment.content),
}));

// Save cleaned versions
fs.writeFileSync(
  path.join(__dirname, "../migration-data/posts-import-cleaned.json"),
  JSON.stringify(cleanedPosts, null, 2),
);

fs.writeFileSync(
  path.join(__dirname, "../migration-data/comments-import-cleaned.json"),
  JSON.stringify(cleanedComments, null, 2),
);

console.log(`
Content cleaning complete:
- ${cleanedPosts.length} posts cleaned
- ${cleanedComments.length} comments cleaned

Files created:
- migration-data/posts-import-cleaned.json
- migration-data/comments-import-cleaned.json
`);
