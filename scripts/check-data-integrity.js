import { ConvexClient } from "convex/browser";
import * as dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function checkDataIntegrity() {
  console.log("🔍 Checking data integrity post-migration...\n");

  const issues = {
    postsWithoutAuthors: [],
    membersWithFakeEmails: [],
    commentsWithoutPosts: [],
    postsWithoutCategories: [],
    commentsWithoutAuthors: [],
  };

  // 1. Check for posts without authors
  console.log("1. Checking posts without authors...");
  const posts = await convex.query(api.posts.getAllPosts);

  for (const post of posts) {
    if (!post.memberId) {
      issues.postsWithoutAuthors.push({
        postId: post._id,
        title: post.title,
        createdAt: new Date(post.createdAt).toISOString(),
      });
    }
  }
  console.log(`   Found ${issues.postsWithoutAuthors.length} posts without authors`);

  // 2. Check for members with fake emails
  console.log("\n2. Checking members with fake emails...");
  const members = await convex.query(api.members.getAllMembers);

  for (const member of members) {
    if (
      member.email &&
      (member.email.endsWith("@imported.com") ||
        member.email.includes("fake") ||
        member.email.includes("placeholder") ||
        !member.email.includes("@"))
    ) {
      issues.membersWithFakeEmails.push({
        memberId: member._id,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email,
        joinedDate: member.joinedDateFormatted,
      });
    }
  }
  console.log(`   Found ${issues.membersWithFakeEmails.length} members with fake emails`);

  // 3. Check for comments without posts
  console.log("\n3. Checking comments without posts...");
  const comments = await convex.query(api.comments.getAllComments);

  for (const comment of comments) {
    if (!comment.postId) {
      issues.commentsWithoutPosts.push({
        commentId: comment._id,
        content: `${comment.content.substring(0, 100)}...`,
        createdAt: new Date(comment.createdAt).toISOString(),
      });
    } else {
      // Check if the post actually exists
      const post = posts.find((p) => p._id === comment.postId);
      if (!post) {
        issues.commentsWithoutPosts.push({
          commentId: comment._id,
          postId: comment.postId,
          content: `${comment.content.substring(0, 100)}...`,
          createdAt: new Date(comment.createdAt).toISOString(),
        });
      }
    }
  }
  console.log(`   Found ${issues.commentsWithoutPosts.length} comments without posts`);

  // 4. Check for posts without categories
  console.log("\n4. Checking posts without categories...");
  const categories = await convex.query(api.categories.getAll);

  for (const post of posts) {
    if (!post.categoryId) {
      issues.postsWithoutCategories.push({
        postId: post._id,
        title: post.title,
        createdAt: new Date(post.createdAt).toISOString(),
      });
    } else {
      // Check if the category actually exists
      const category = categories.find((c) => c._id === post.categoryId);
      if (!category) {
        issues.postsWithoutCategories.push({
          postId: post._id,
          categoryId: post.categoryId,
          title: post.title,
          createdAt: new Date(post.createdAt).toISOString(),
        });
      }
    }
  }
  console.log(`   Found ${issues.postsWithoutCategories.length} posts without categories`);

  // 5. Check for comments without authors
  console.log("\n5. Checking comments without authors...");

  for (const comment of comments) {
    if (!comment.memberId) {
      issues.commentsWithoutAuthors.push({
        commentId: comment._id,
        content: `${comment.content.substring(0, 100)}...`,
        postId: comment.postId,
        createdAt: new Date(comment.createdAt).toISOString(),
      });
    }
  }
  console.log(`   Found ${issues.commentsWithoutAuthors.length} comments without authors`);

  // Generate report
  console.log("\n📊 INTEGRITY CHECK SUMMARY");
  console.log("==========================");

  const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);

  if (totalIssues === 0) {
    console.log("✅ No data integrity issues found! Migration appears successful.");
  } else {
    console.log(`⚠️  Found ${totalIssues} total issues:\n`);

    if (issues.postsWithoutAuthors.length > 0) {
      console.log("Posts without authors:");
      issues.postsWithoutAuthors.forEach((p) => {
        console.log(`  - ${p.title} (${p.postId})`);
      });
    }

    if (issues.membersWithFakeEmails.length > 0) {
      console.log("\nMembers with fake emails:");
      issues.membersWithFakeEmails.forEach((m) => {
        console.log(`  - ${m.name}: ${m.email}`);
      });
    }

    if (issues.commentsWithoutPosts.length > 0) {
      console.log("\nComments without posts:");
      issues.commentsWithoutPosts.forEach((c) => {
        console.log(`  - Comment ${c.commentId}: "${c.content}"`);
      });
    }

    if (issues.postsWithoutCategories.length > 0) {
      console.log("\nPosts without categories:");
      issues.postsWithoutCategories.forEach((p) => {
        console.log(`  - ${p.title} (${p.postId})`);
      });
    }

    if (issues.commentsWithoutAuthors.length > 0) {
      console.log("\nComments without authors:");
      issues.commentsWithoutAuthors.forEach((c) => {
        console.log(`  - Comment ${c.commentId} on post ${c.postId}`);
      });
    }
  }

  // Write detailed report to file
  const report = {
    checkDate: new Date().toISOString(),
    totalIssues,
    issues,
  };

  const fs = await import("node:fs");
  fs.writeFileSync("migration-data/data-integrity-report.json", JSON.stringify(report, null, 2));

  console.log("\n📄 Detailed report saved to: migration-data/data-integrity-report.json");
}

checkDataIntegrity()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
