#!/usr/bin/env node
/**
 * Script to sync avatar URLs from Clerk to Convex database
 * Run this after uploading avatars to Clerk
 *
 * Usage: node scripts/sync-clerk-avatars.js
 */

const { ConvexHttpClient } = require("convex/browser");

async function syncAvatars() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL environment variable not set");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);

  console.log("🔄 Starting Clerk avatar sync...");
  console.log(`📡 Convex URL: ${convexUrl}`);

  try {
    // Run the sync migration
    const result = await client.mutation("migrations/sync_clerk_avatars:syncClerkAvatars");

    console.log("\n✅ Avatar sync completed!");
    console.log(`📊 Total members checked: ${result.total}`);
    console.log(`✨ Avatars updated: ${result.updated}`);
    console.log(`❌ Errors: ${result.errors}`);

    if (result.errors > 0) {
      console.log("\n⚠️  Some avatars failed to sync. Check the logs for details.");
    }
  } catch (error) {
    console.error("❌ Error syncing avatars:", error);
    process.exit(1);
  }
}

// Run the sync
syncAvatars().catch(console.error);
