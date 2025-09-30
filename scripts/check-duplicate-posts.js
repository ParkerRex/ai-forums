import { ConvexClient } from "convex/browser";
import * as dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function checkDuplicatePosts() {
  console.log("🔍 Checking for duplicate posts...\n");

  // Get all posts
  const posts = await convex.query(api.posts.getAllPosts);

  console.log(`Total posts: ${posts.length}\n`);

  // Group posts by title and content to find duplicates
  const postGroups = new Map();

  for (const post of posts) {
    // Create a key based on title and content (first 200 chars)
    const contentPreview = post.content.substring(0, 200).trim();
    const key = `${post.title}|||${contentPreview}`;

    if (!postGroups.has(key)) {
      postGroups.set(key, []);
    }
    postGroups.get(key).push(post);
  }

  // Find groups with duplicates
  const duplicateGroups = [];
  let totalDuplicates = 0;

  for (const [_key, groupPosts] of postGroups) {
    if (groupPosts.length > 1) {
      duplicateGroups.push(groupPosts);
      totalDuplicates += groupPosts.length - 1; // Count extras as duplicates
    }
  }

  console.log(`Found ${duplicateGroups.length} groups of duplicate posts`);
  console.log(`Total duplicate posts to remove: ${totalDuplicates}\n`);

  // Display duplicate groups
  duplicateGroups.forEach((group, index) => {
    console.log(`\n🔴 Duplicate Group ${index + 1}:`);
    console.log(`Title: "${group[0].title}"`);
    console.log(`Content preview: "${group[0].content.substring(0, 100)}..."`);
    console.log(`Number of duplicates: ${group.length}`);

    console.log("\nInstances:");
    group.forEach((post, i) => {
      const _member = posts.find((p) => p._id === post._id);
      console.log(`  ${i + 1}. ID: ${post._id}`);
      console.log(`     Created: ${new Date(post.createdAt).toLocaleString()}`);
      console.log(`     Member: ${post.memberId}`);
      console.log(
        `     Views: ${post.viewCount}, Votes: ${post.netVotes}, Comments: ${post.commentCount}`,
      );
    });

    // Recommend which to keep (latest with most engagement)
    const sorted = [...group].sort((a, b) => {
      // First priority: most comments
      if (a.commentCount !== b.commentCount) return b.commentCount - a.commentCount;
      // Second priority: most votes
      if (a.netVotes !== b.netVotes) return b.netVotes - a.netVotes;
      // Third priority: most views
      if (a.viewCount !== b.viewCount) return b.viewCount - a.viewCount;
      // Last priority: most recent
      return b.createdAt - a.createdAt;
    });

    console.log(`\n✅ Recommended to keep: ${sorted[0]._id} (most engagement)`);
    console.log(
      `❌ Remove: ${sorted
        .slice(1)
        .map((p) => p._id)
        .join(", ")}`,
    );
  });

  // Save duplicate report
  const report = {
    checkDate: new Date().toISOString(),
    totalPosts: posts.length,
    duplicateGroups: duplicateGroups.length,
    totalDuplicates,
    groups: duplicateGroups.map((group) => ({
      title: group[0].title,
      contentPreview: group[0].content.substring(0, 200),
      instances: group.map((post) => ({
        id: post._id,
        createdAt: post.createdAt,
        memberId: post.memberId,
        viewCount: post.viewCount,
        netVotes: post.netVotes,
        commentCount: post.commentCount,
      })),
      keepId: [...group].sort((a, b) => {
        if (a.commentCount !== b.commentCount) return b.commentCount - a.commentCount;
        if (a.netVotes !== b.netVotes) return b.netVotes - a.netVotes;
        if (a.viewCount !== b.viewCount) return b.viewCount - a.viewCount;
        return b.createdAt - a.createdAt;
      })[0]._id,
    })),
  };

  const fs = await import("node:fs");
  fs.writeFileSync("migration-data/duplicate-posts-report.json", JSON.stringify(report, null, 2));

  console.log("\n📄 Detailed report saved to: migration-data/duplicate-posts-report.json");
}

checkDuplicatePosts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
