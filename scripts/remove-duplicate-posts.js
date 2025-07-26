import { api } from "../convex/_generated/api.js";
import { ConvexClient } from "convex/browser";
import * as dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function removeDuplicatePosts() {
  console.log("🗑️  Starting duplicate post removal...\n");

  // Read the duplicate report
  const reportPath = "migration-data/duplicate-posts-report.json";
  if (!fs.existsSync(reportPath)) {
    console.error("❌ Duplicate posts report not found. Run check-duplicate-posts.js first.");
    return;
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  console.log(`Processing ${report.duplicateGroups} duplicate groups...`);
  console.log(`Total duplicates to remove: ${report.totalDuplicates}\n`);

  let removedCount = 0;
  let failedCount = 0;
  const removalLog = [];

  // Process each duplicate group
  for (const [index, group] of report.groups.entries()) {
    console.log(`\n📁 Processing Group ${index + 1}/${report.groups.length}`);
    console.log(`   Title: "${group.title}"`);
    console.log(`   Keep: ${group.keepId}`);
    
    // Get IDs to remove (all except the one to keep)
    const toRemove = group.instances
      .filter(instance => instance.id !== group.keepId)
      .map(instance => instance.id);
    
    console.log(`   Remove: ${toRemove.length} duplicates`);

    // Remove each duplicate
    for (const postId of toRemove) {
      try {
        await convex.mutation(api.posts.hardDeletePost, { postId });
        removedCount++;
        removalLog.push({
          postId,
          title: group.title,
          status: "removed",
          timestamp: new Date().toISOString(),
        });
        console.log(`   ✅ Removed: ${postId}`);
      } catch (error) {
        failedCount++;
        removalLog.push({
          postId,
          title: group.title,
          status: "failed",
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        console.error(`   ❌ Failed to remove ${postId}: ${error.message}`);
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 DUPLICATE REMOVAL SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successfully removed: ${removedCount} posts`);
  console.log(`❌ Failed to remove: ${failedCount} posts`);
  console.log(`📁 Total groups processed: ${report.groups.length}`);

  // Save removal log
  const logData = {
    removalDate: new Date().toISOString(),
    totalRemoved: removedCount,
    totalFailed: failedCount,
    expectedRemovals: report.totalDuplicates,
    removalLog,
  };

  fs.writeFileSync(
    "migration-data/duplicate-removal-log.json",
    JSON.stringify(logData, null, 2)
  );

  console.log("\n📄 Removal log saved to: migration-data/duplicate-removal-log.json");

  if (failedCount > 0) {
    console.log("\n⚠️  Some posts failed to delete. Check the log for details.");
  } else {
    console.log("\n✅ All duplicates successfully removed!");
  }
}

removeDuplicatePosts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });