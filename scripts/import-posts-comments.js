// Transforms raw Skool JSON data into structured posts and
// comments matching your Convex schema.

const fs = require("node:fs");
const path = require("node:path");

// Read the large JSON file
const dataPath = path.join(
  __dirname,
  "../migration-data/skool-complete-troublefreeai-2025-07-24.json",
);
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// Set cutoff date - only import content created after June 22, 2025
const CUTOFF_DATE = new Date("2025-06-22T23:59:59Z").getTime();
console.log(`Filtering for content created after: ${new Date(CUTOFF_DATE).toISOString()}`);

// Helper function to convert Skool timestamp to Unix timestamp
function convertSkoolTimestamp(timestamp) {
  // If timestamp is a string date, parse it
  if (typeof timestamp === "string") {
    return new Date(timestamp).getTime();
  }
  // If it's a large number (nanoseconds), convert to milliseconds
  if (timestamp > 1e15) {
    return Math.floor(timestamp / 1000000);
  }
  // Otherwise assume it's already in milliseconds
  return timestamp;
}

// Helper function to parse status from metadata
function getPostStatus(_metadata) {
  // Default to active unless explicitly marked otherwise
  return "active";
}

// Helper function to extract text content from contributors JSON
function parseContributors(contributorsStr) {
  try {
    const contributors = JSON.parse(contributorsStr);
    return contributors.map((c) => ({
      id: c.id,
      name: c.name,
      firstName: c.first_name || c.firstName,
      lastName: c.last_name || c.lastName,
    }));
  } catch (_e) {
    return [];
  }
}

// Process data
const posts = [];
const postsMap = new Map(); // Map skool post ID to our post format
const userIdMap = new Map(); // Map skool user ID to member email for lookup

// First pass - collect all users
console.log("Collecting user information...");
if (data.users) {
  data.users.forEach((user) => {
    userIdMap.set(user.id, {
      email: user.email || `${user.name}@imported.com`,
      firstName: user.firstName || user.first_name || user.name.split("-")[0],
      lastName: user.lastName || user.last_name || "",
      name: user.name,
    });
  });
}

// Also collect users from posts if they have embedded user data
if (data.posts) {
  data.posts.forEach((post) => {
    if (post.user) {
      userIdMap.set(post.user.id, {
        email: post.user.email || `${post.user.name}@imported.com`,
        firstName: post.user.firstName || post.user.first_name || post.user.name.split("-")[0],
        lastName: post.user.lastName || post.user.last_name || "",
        name: post.user.name,
      });
    }
  });
}

// Second pass - process posts
console.log("Processing posts...");
if (data.posts) {
  data.posts.forEach((post) => {
    if (post.postType === "generic" && post.rootId === post.id) {
      // This is a main post
      const createdAt = convertSkoolTimestamp(post.createdAt);

      // Skip posts created on or before the cutoff date
      if (createdAt <= CUTOFF_DATE) {
        return;
      }

      const transformedPost = {
        skoolId: post.id,
        title: post.metadata.title || "Untitled Post",
        content: post.metadata.content || "",
        createdAt: createdAt,
        updatedAt: convertSkoolTimestamp(post.updatedAt),
        authorEmail:
          post.user?.email || userIdMap.get(post.userId)?.email || `unknown@imported.com`,
        categoryId: null, // Will need to be mapped to actual category IDs
        status: getPostStatus(post.metadata),
        upvotes: post.metadata.upvotes || 0,
        downvotes: 0, // Skool doesn't seem to have downvotes
        netVotes: post.metadata.upvotes || 0,
        commentCount: post.metadata.comments || 0,
        viewCount: 0, // Not provided in Skool data
        isPinned: false,
        isLocked: false,
        labelId: post.labelId || null,
        contributors: parseContributors(post.metadata.contributors || "[]"),
      };

      posts.push(transformedPost);
      postsMap.set(post.id, transformedPost);
    }
  });
}

// Third pass - process comments
console.log("Processing comments...");
const comments = [];
const commentsMap = new Map();

// Track which posts we're importing (for filtering comments)
const importedPostIds = new Set(posts.map((p) => p.skoolId));

if (data.comments) {
  data.comments.forEach((comment) => {
    const createdAt = convertSkoolTimestamp(comment.created_at || comment.createdAt);

    // Skip comments created on or before the cutoff date
    if (createdAt <= CUTOFF_DATE) {
      return;
    }

    // Also skip comments for posts we're not importing
    const rootId = comment.root_id || comment.rootId;
    if (!importedPostIds.has(rootId)) {
      return;
    }

    const transformedComment = {
      skoolId: comment.id,
      content: comment.metadata?.content || "",
      createdAt: createdAt,
      updatedAt: convertSkoolTimestamp(comment.updated_at || comment.updatedAt),
      authorEmail:
        comment.user?.email ||
        userIdMap.get(comment.user_id || comment.userId)?.email ||
        `unknown@imported.com`,
      postSkoolId: rootId,
      parentCommentSkoolId:
        (comment.parent_id || comment.parentId) !== rootId
          ? comment.parent_id || comment.parentId
          : null,
      status: "active",
      upvotes: comment.metadata?.upvotes || 0,
      downvotes: 0,
      netVotes: comment.metadata?.upvotes || 0,
      depth: 0, // Will calculate based on parent hierarchy
      childCount: 0, // Will calculate after all comments are processed
    };

    comments.push(transformedComment);
    commentsMap.set(comment.id, transformedComment);
  });
}

// Calculate comment depths and child counts
console.log("Calculating comment hierarchy...");
comments.forEach((comment) => {
  // Calculate depth
  let depth = 0;
  let currentComment = comment;
  while (currentComment.parentCommentSkoolId && depth < 10) {
    // Max depth safety
    depth++;
    currentComment = commentsMap.get(currentComment.parentCommentSkoolId);
    if (!currentComment) break;
  }
  comment.depth = depth;

  // Increment parent's child count
  if (comment.parentCommentSkoolId) {
    const parent = commentsMap.get(comment.parentCommentSkoolId);
    if (parent) {
      parent.childCount++;
    }
  }
});

// Write outputs
const outputDir = path.join(__dirname, "../migration-data");

// Save posts
fs.writeFileSync(path.join(outputDir, "posts-import.json"), JSON.stringify(posts, null, 2));

// Save comments
fs.writeFileSync(path.join(outputDir, "comments-import.json"), JSON.stringify(comments, null, 2));

// Save user mapping for reference
fs.writeFileSync(
  path.join(outputDir, "user-mapping.json"),
  JSON.stringify(Array.from(userIdMap.entries()), null, 2),
);

console.log(`
Import preparation complete:
- ${posts.length} posts processed
- ${comments.length} comments processed
- ${userIdMap.size} unique users found

Files created:
- migration-data/posts-import.json
- migration-data/comments-import.json
- migration-data/user-mapping.json

Next steps:
1. Review the generated files
2. Create categories in Convex and map labelIds
3. Run the Convex import mutations
`);
