#!/usr/bin/env node

/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */

const fs = require("node:fs").promises;
const path = require("node:path");

/**
 * SKOOL COMPLETE API EXTRACTOR
 *
 * Extracts all data using Skool's API endpoints directly
 * No browser needed!
 */

// Configuration
const CONFIG = {
  groupName: "troublefreeai",
  groupId: "d712a2ce0a0d41c891c4949ab68373b2", // from your data
  buildId: "1753388450230",

  // Your auth token and cookies
  authToken:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzkzOTA0MjQsImlhdCI6MTc0Nzg1NDQyNCwidXNlcl9pZCI6IjllMWRjY2VkZGIwYTRmOWRiNzYyNWUyZjAwNjgwYTRiIn0.uEDBvOi1gCUmytU9jrCL4t5IpN0sTuIVxNmK2IhJ7O0",
  clientId: "6940c2e8ef534532a4f0bfd1af9c52de",
  wafToken:
    "100727f2-d70d-4d87-ad17-1af681df4e72:FAoAvluRLmR8AAAA:V902/EZ+NIDGz4R0ngVKeBbuy7hJyoxJfgKQ2OAE1pPaYs1NrFeBhKezlYMtCDgormVLaMy4zUX1oi6AA1VbPO+MFgp/7nO19MumdNQv8m+UypYLW3hTkClS3jPp4gtXm4on/f2NILSawBwMf8Z5wbx/Fu+tOXjNdWyO/zm//Du9iQ0ICiykzeVFX/u4lsrO8/3DA5mtjJ8IRw044xedT/miXNAnVo/fRQnkUG8Dio5Th9SHd5t19mS8ZWZFwJYI",

  // Output
  outputDir: path.join(__dirname, "..", "migration-data"),
};

// Data storage
const data = {
  posts: new Map(),
  comments: new Map(),
  users: new Map(),
  stats: {
    posts: 0,
    comments: 0,
    expectedComments: 0,
    users: 0,
  },
};

// Headers for requests
function getHeaders(isApi = false) {
  const base = {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    cookie: `client_id=${CONFIG.clientId}; auth_token=${CONFIG.authToken}`,
  };

  if (isApi) {
    return {
      ...base,
      "content-type": "application/json",
      origin: "https://www.skool.com",
      referer: "https://www.skool.com/",
      "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "x-aws-waf-token": CONFIG.wafToken,
    };
  }

  return {
    ...base,
    "x-nextjs-data": "1",
  };
}

// Fetch with error handling
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function detectBuildId() {
  try {
    const res = await fetch(`https://www.skool.com/${CONFIG.groupName}`, {
      headers: {
        ...getHeaders(false),
        "x-aws-waf-token": CONFIG.wafToken, // include waf token like browser
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const re = new RegExp(`/_next/data/([^/]+)/${CONFIG.groupName}\\.json`);
    const match = html.match(re);
    if (match?.[1]) {
      CONFIG.buildId = match[1];
      console.log(`ℹ️  Detected buildId: ${CONFIG.buildId}`);
    } else {
      console.warn("⚠️  buildId not found in HTML");
    }
  } catch (err) {
    console.error("Failed to auto-detect buildId:", err.message);
  }
}

// Step 1: Get all posts
async function getAllPosts() {
  console.log("📝 Fetching all posts...\n");

  // Fetch all 7 pages
  for (let page = 1; page <= 7; page++) {
    console.log(`📄 Fetching page ${page}...`);

    // Page 1 doesn't need the p parameter
    const url =
      page === 1
        ? `https://www.skool.com/_next/data/${CONFIG.buildId}/${CONFIG.groupName}.json?group=${CONFIG.groupName}`
        : `https://www.skool.com/_next/data/${CONFIG.buildId}/${CONFIG.groupName}.json?c=&fl=&p=${page}&group=${CONFIG.groupName}`;

    try {
      const response = await fetchWithRetry(url, {
        headers: getHeaders(false),
      });

      const postTrees = response?.pageProps?.postTrees || [];
      console.log(`  Found ${postTrees.length} posts on page ${page}`);

      // Process posts
      postTrees.forEach((tree) => {
        if (tree.post) {
          processPost(tree.post);
        }
      });

      // Rate limiting between pages
      if (page < 7) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (error) {
      console.error(`  Failed to fetch page ${page}:`, error.message);
    }
  }

  console.log(`\n✅ Processed ${data.stats.posts} posts total`);
  console.log(`📊 Expected comments: ${data.stats.expectedComments}\n`);
}

// Process a post
function processPost(post) {
  data.posts.set(post.id, post);
  data.stats.posts++;
  data.stats.expectedComments += post.metadata?.comments || 0;

  // Extract user
  if (post.user) {
    data.users.set(post.user.id, post.user);
  }

  // Extract contributors
  if (post.metadata?.contributors) {
    try {
      const contributors = JSON.parse(post.metadata.contributors);
      contributors.forEach((user) => data.users.set(user.id, user));
    } catch (_e) {}
  }
}

// Step 2: Get comments for each post with pagination
async function getCommentsForPost(postId, postName, commentCount) {
  if (commentCount === 0) return [];

  const allComments = [];
  let last = 0;
  let hasMore = true;
  const limit = 25; // Skool's hardcoded limit

  while (hasMore && allComments.length < commentCount) {
    const url = `https://api.skool.com/posts/${postId}/comments?group-id=${CONFIG.groupId}&limit=${limit}&pinned=true${last ? `&last=${last}` : ""}`;

    try {
      const response = await fetchWithRetry(url, {
        headers: getHeaders(true),
      });

      // Handle the nested structure from the API
      if (response.post_tree?.children) {
        const comments = response.post_tree.children
          .filter((item) => item.post && item.post.post_type === "comment")
          .map((item) => item.post);

        if (comments.length === 0) {
          hasMore = false;
          break;
        }

        // Process users from comments
        comments.forEach((comment) => {
          if (comment.user) {
            data.users.set(comment.user.id, comment.user);
          }
        });

        allComments.push(...comments);

        // Update pagination cursor
        if (response.last !== undefined) {
          last = response.last;
          hasMore = response.last !== 0;
        } else {
          hasMore = comments.length === limit;
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`Failed to get comments for ${postName}:`, error.message);
      hasMore = false;
    }

    // Rate limiting between pages
    if (hasMore) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return allComments;
}

// Step 3: Get all comments
async function getAllComments() {
  console.log("💬 Fetching comments for all posts...\n");

  const posts = Array.from(data.posts.values());
  const postsWithComments = posts.filter((p) => p.metadata?.comments > 0);

  console.log(`${postsWithComments.length} posts have comments\n`);

  for (let i = 0; i < postsWithComments.length; i++) {
    const post = postsWithComments[i];
    const postTitle = post.metadata?.title || post.name || "Untitled";

    process.stdout.write(
      `[${i + 1}/${postsWithComments.length}] ${postTitle.substring(0, 40)}... (${post.metadata.comments} expected)`,
    );

    const comments = await getCommentsForPost(post.id, post.name, post.metadata.comments);

    if (comments.length > 0) {
      data.comments.set(post.id, comments);
      data.stats.comments += comments.length;
      console.log(` ✓ ${comments.length} comments`);
    } else {
      console.log(` ✗ No comments loaded`);
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n✅ Total comments fetched: ${data.stats.comments}`);
}

// Step 4: Export data
async function exportData() {
  console.log("\n💾 Exporting data...\n");

  await fs.mkdir(CONFIG.outputDir, { recursive: true });

  const posts = Array.from(data.posts.values());
  const allComments = [];

  data.comments.forEach((comments) => {
    allComments.push(...comments);
  });

  const exportData = {
    metadata: {
      extractedAt: new Date().toISOString(),
      group: CONFIG.groupName,
      groupId: CONFIG.groupId,
      stats: {
        posts: posts.length,
        comments: allComments.length,
        expectedComments: data.stats.expectedComments,
        completeness:
          data.stats.expectedComments > 0
            ? `${((allComments.length / data.stats.expectedComments) * 100).toFixed(1)}%`
            : "N/A",
        users: data.users.size,
      },
    },
    posts: posts,
    comments: allComments,
    commentsByPost: Object.fromEntries(data.comments),
    users: Array.from(data.users.values()),
  };

  const filename = `skool-complete-${CONFIG.groupName}-${new Date().toISOString().slice(0, 10)}.json`;
  const filepath = path.join(CONFIG.outputDir, filename);

  await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));

  console.log(`✅ Data saved to: ${filepath}`);
  console.log("\n📊 FINAL RESULTS:");
  console.log(`   Posts: ${posts.length}`);
  console.log(
    `   Comments: ${allComments.length}/${data.stats.expectedComments} (${exportData.metadata.stats.completeness})`,
  );
  console.log(`   Users: ${data.users.size}`);
}

// Main execution
async function main() {
  console.log("🚀 SKOOL COMPLETE API EXTRACTOR\n");
  console.log(`Group: ${CONFIG.groupName}`);
  console.log(`Group ID: ${CONFIG.groupId}\n`);
  // NEW: ensure we have the latest buildId
  await detectBuildId();

  const startTime = Date.now();

  try {
    // Get all posts
    await getAllPosts();

    // Get all comments
    await getAllComments();

    // Export data
    await exportData();

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️  Total time: ${duration} seconds`);
    console.log("\n🎉 Extraction complete!");
  } catch (error) {
    console.error("\n❌ Extraction failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { CONFIG, main };
