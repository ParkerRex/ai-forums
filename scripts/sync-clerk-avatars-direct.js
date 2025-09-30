#!/usr/bin/env node
/**
 * Direct script to sync Clerk avatars to Convex
 * This bypasses Convex actions and directly updates the database
 */

require("dotenv").config({ path: ".env.local" });
const { ConvexHttpClient } = require("convex/browser");

async function syncAvatars() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!convexUrl) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL environment variable not set");
    process.exit(1);
  }

  if (!clerkSecretKey) {
    console.error("❌ CLERK_SECRET_KEY environment variable not set");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);

  console.log("🔄 Starting Clerk avatar sync...");
  console.log(`📡 Convex URL: ${convexUrl}`);

  try {
    // First, get all members with Clerk IDs
    const members = await client.query("migrations/sync_clerk_avatars:getMembersForAvatarSync");
    console.log(`📊 Found ${members.length} members with Clerk IDs`);

    let updated = 0;
    let errors = 0;

    // Process members in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (member) => {
          try {
            // Fetch user data from Clerk
            const response = await fetch(`https://api.clerk.com/v1/users/${member.externalId}`, {
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
              },
            });

            if (!response.ok) {
              console.error(
                `❌ Failed to fetch Clerk user ${member.externalId}: ${response.status}`,
              );
              errors++;
              return;
            }

            const clerkUser = await response.json();

            // Check if Clerk has an avatar URL different from what we have
            if (clerkUser.image_url && clerkUser.image_url !== member.avatarUrl) {
              // Update member with new avatar URL using the members API
              await client.mutation("members:updateMemberProfile", {
                id: member._id,
                avatarUrl: clerkUser.image_url,
              });

              console.log(`✅ Updated avatar for ${member.firstName} ${member.lastName}`);
              updated++;
            }
          } catch (error) {
            console.error(
              `❌ Error syncing avatar for ${member.firstName} ${member.lastName}:`,
              error.message,
            );
            errors++;
          }
        }),
      );

      // Progress update
      console.log(
        `📈 Progress: ${Math.min(i + batchSize, members.length)}/${members.length} members processed`,
      );

      // Small delay between batches to avoid rate limits
      if (i + batchSize < members.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("\n✅ Avatar sync completed!");
    console.log(`✨ Avatars updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`⏭️  Skipped (no change): ${members.length - updated - errors}`);
  } catch (error) {
    console.error("❌ Error during sync:", error);
    process.exit(1);
  }
}

// Run the sync
syncAvatars().catch(console.error);
