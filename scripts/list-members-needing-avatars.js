#!/usr/bin/env node
/**
 * Script to list members who need avatar sync from Clerk
 * This helps identify which members are missing avatars
 */

require("dotenv").config({ path: ".env.local" });
const { ConvexHttpClient } = require("convex/browser");

async function listMembersNeedingAvatars() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL environment variable not set");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);

  console.log("📋 Checking members for missing avatars...");
  console.log(`📡 Convex URL: ${convexUrl}`);

  try {
    // Use the public getMembersWithStats query
    const allMembers = await client.query("members:getMembersWithStats");

    // Filter members without avatars
    const membersWithoutAvatars = allMembers.filter((m) => !m.avatarUrl);
    const membersWithAvatars = allMembers.filter((m) => m.avatarUrl);

    console.log("\n📊 Summary:");
    console.log(`Total members: ${allMembers.length}`);
    console.log(`Members with avatars: ${membersWithAvatars.length}`);
    console.log(`Members without avatars: ${membersWithoutAvatars.length}`);

    if (membersWithoutAvatars.length > 0) {
      console.log("\n👥 Members without avatars:");
      membersWithoutAvatars.forEach((m) => {
        console.log(`- ${m.firstName} ${m.lastName} (${m.email})`);
      });
    }

    // Show a few members with avatars to verify they're working
    if (membersWithAvatars.length > 0) {
      console.log("\n✅ Sample of members with avatars:");
      membersWithAvatars.slice(0, 5).forEach((m) => {
        console.log(`- ${m.firstName} ${m.lastName}: ${m.avatarUrl}`);
      });
    }
  } catch (error) {
    console.error("❌ Error checking members:", error);
    process.exit(1);
  }
}

// Run the check
listMembersNeedingAvatars().catch(console.error);
