#!/usr/bin/env node
// Import posts and comments using Convex internal mutations

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

async function main() {
  // Read the prepared data
  const posts = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../migration-data/posts-import-fixed.json"), "utf8"),
  );
  const comments = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../migration-data/comments-import-fixed.json"), "utf8"),
  );

  // Get unique authors to check for missing members
  const uniqueAuthors = new Set();
  posts.forEach((post) => uniqueAuthors.add(post.authorEmail));
  comments.forEach((comment) => uniqueAuthors.add(comment.authorEmail));

  console.log(`Found ${uniqueAuthors.size} unique authors`);
  console.log(`Preparing to import ${posts.length} posts and ${comments.length} comments`);

  // Group posts by category (we'll use the skool category ID)
  const postsByCategory = {};
  posts.forEach((post) => {
    const categoryId = post.categoryId || "skool";
    if (!postsByCategory[categoryId]) {
      postsByCategory[categoryId] = [];
    }
    postsByCategory[categoryId].push(post);
  });

  // First, create missing members for @imported.com emails
  const importedEmails = Array.from(uniqueAuthors).filter((email) =>
    email.endsWith("@imported.com"),
  );
  if (importedEmails.length > 0) {
    console.log(`\nCreating ${importedEmails.length} placeholder members...`);

    for (const email of importedEmails) {
      const [username] = email.split("@");
      const nameParts = username.split("-");
      const firstName = nameParts[0] || "Unknown";
      const lastName = nameParts.slice(1).join(" ") || "User";

      const args = {
        email,
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
      };

      console.log(`Creating member: ${args.firstName} ${args.lastName} (${email})`);

      try {
        const result = runConvexFunction("importPostsComments:createMissingMember", args);
        console.log(`Created member with ID: ${result}`);
      } catch (error) {
        console.error(`Failed to create member ${email}:`, error.message);
      }
    }
  }

  // Import posts in batches
  console.log("\nImporting posts...");
  const BATCH_SIZE = 50;
  const categoryId = "jh789zhr5zyev7h79b6kjxzv3n7mbv3f"; // The skool category ID we created

  const allPostIdMaps = {};

  // Process posts in batches
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    console.log(
      `Processing posts batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(posts.length / BATCH_SIZE)}`,
    );

    // Add the category ID and skoolId to each post, filtering out extra fields
    const postsWithCategory = batch.map((post, index) => ({
      title: post.title,
      content: post.content,
      authorEmail: post.authorEmail,
      categoryId: categoryId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      views: post.viewCount,
      likes: post.upvotes,
      isPinned: post.isPinned,
      isLocked: post.isLocked,
      tags: post.tags || [],
      skoolId: post.skoolId || `post-${i + index}`, // Use the original ID or generate one
    }));

    try {
      const result = runConvexFunction("importPostsComments:importPostsBatch", {
        posts: postsWithCategory,
      });

      // Merge the post ID mappings
      if (result?.postIdMap) {
        Object.assign(allPostIdMaps, result.postIdMap);
        console.log(`Imported ${result.importedCount} of ${result.totalCount} posts`);
      }
    } catch (error) {
      console.error(`Failed to import posts batch:`, error.message);
    }
  }

  console.log(`\nTotal posts imported: ${Object.keys(allPostIdMaps).length}`);

  // Import comments in batches
  if (comments.length > 0) {
    console.log("\nImporting comments...");

    // Map comments to the expected format
    const commentsWithIds = comments.map((comment, index) => ({
      content: comment.content,
      authorEmail: comment.authorEmail,
      postSkoolId: comment.postSkoolId,
      parentSkoolId: comment.parentCommentSkoolId || undefined,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      likes: comment.upvotes,
      skoolId: comment.skoolId || `comment-${index}`,
    }));

    for (let i = 0; i < commentsWithIds.length; i += BATCH_SIZE) {
      const batch = commentsWithIds.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing comments batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(commentsWithIds.length / BATCH_SIZE)}`,
      );

      try {
        const result = runConvexFunction("importPostsComments:importCommentsBatch", {
          comments: batch,
          postIdMap: allPostIdMaps,
        });

        if (result && result.importedCount !== undefined) {
          console.log(`Imported ${result.importedCount} comments`);
        }
      } catch (error) {
        console.error(`Failed to import comments batch:`, error.message);
      }
    }
  }

  console.log("\nImport completed!");
}

// Helper function to run Convex functions via CLI
function runConvexFunction(functionName, args) {
  try {
    // Pass arguments as a single-quoted JSON string to avoid shell interpretation
    const argsJson = JSON.stringify(args);
    const command = `npx convex run ${functionName} '${argsJson.replace(/'/g, "'\"'\"'")}'`;

    const output = execSync(command, {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
    });

    // Try to parse the output to get the result
    try {
      // Find JSON objects in the output (they start with { and end with })
      const jsonMatches = output.match(/\{[\s\S]*\}/g);

      if (jsonMatches && jsonMatches.length > 0) {
        // Take the last JSON object (usually the return value)
        const lastJson = jsonMatches[jsonMatches.length - 1];
        return JSON.parse(lastJson);
      }

      // Try line-by-line parsing as fallback
      const lines = output.trim().split("\n");
      const lastLine = lines[lines.length - 1];

      // The output might be a quoted string or a JSON object
      let parsed;
      try {
        parsed = JSON.parse(lastLine);
      } catch {
        // If it's a quoted string, remove quotes and try again
        if (lastLine.startsWith("'") && lastLine.endsWith("'")) {
          parsed = lastLine.slice(1, -1);
        } else {
          throw new Error("Could not parse output");
        }
      }

      return parsed;
    } catch (parseError) {
      console.log("Failed to parse output:", parseError.message);
      console.log("Raw output was:", `${output.substring(0, 200)}...`);
      // If we can't parse the result, just return success
      return true;
    }
  } catch (error) {
    throw new Error(error.stderr || error.message);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
