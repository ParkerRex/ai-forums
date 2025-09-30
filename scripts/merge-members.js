import { ConvexClient } from "convex/browser";
import * as dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function mergeMembers() {
  console.log("Starting member merge process...\n");

  const hiramClarkId = "j97a1f6tpmehxcx8hcwc7qatdd7ma7be";
  const happyDuckyId = "j97bwc2fxyj6yppkk89bhwmb4x7kdpe8";

  // Get both members
  const [hiramClark, happyDucky] = await Promise.all([
    convex.query(api.members.getMemberById, { id: hiramClarkId }),
    convex.query(api.members.getMemberById, { id: happyDuckyId }),
  ]);

  if (!hiramClark || !happyDucky) {
    console.error("One or both members not found!");
    return;
  }

  console.log("Found both members:");
  console.log("\nHiram Clark:");
  console.log(`  Email: ${hiramClark.email}`);
  console.log(`  Joined: ${hiramClark.joinedDateFormatted}`);
  console.log(`  Last Online: ${hiramClark.lastOnlineFormatted}`);

  console.log("\nHappy Ducky:");
  console.log(`  Email: ${happyDucky.email}`);
  console.log(`  Joined: ${happyDucky.joinedDateFormatted}`);
  console.log(`  Last Online: ${happyDucky.lastOnlineFormatted}`);

  // Determine which member to keep (Happy Ducky has the real email)
  // We'll update Happy Ducky with any non-empty data from Hiram Clark
  console.log("\n✅ Keeping Happy Ducky (has real email) and merging data from Hiram Clark");

  // Prepare merged data - prefer non-empty values, use most recent dates
  const mergedData = {
    // Keep Happy Ducky's real email
    email: happyDucky.email,

    // Use Hiram Clark's name since it's the real name
    firstName: "Hiram",
    lastName: "Clark",

    // Use non-empty values, preferring Happy Ducky's data if both exist
    bio: happyDucky.bio || hiramClark.bio || "",
    location: happyDucky.location || hiramClark.location || "",
    linkGithub: happyDucky.linkGithub || hiramClark.linkGithub,
    linkX: happyDucky.linkX || hiramClark.linkX,
    linkYouTube: happyDucky.linkYouTube || hiramClark.linkYouTube,
    websiteUrl: happyDucky.websiteUrl || hiramClark.websiteUrl,
    avatarUrl: happyDucky.avatarUrl || hiramClark.avatarUrl,

    // Use most recent dates
    joinedDate: Math.min(happyDucky.joinedDate, hiramClark.joinedDate), // Earlier join date
    lastOnline: Math.max(happyDucky.lastOnline, hiramClark.lastOnline), // Most recent activity
  };

  console.log("\nMerged data:");
  console.log(`  Name: ${mergedData.firstName} ${mergedData.lastName}`);
  console.log(`  Email: ${mergedData.email}`);
  console.log(`  Joined: ${new Date(mergedData.joinedDate).toLocaleDateString()}`);
  console.log(`  Last Online: ${new Date(mergedData.lastOnline).toLocaleDateString()}`);

  // Update Happy Ducky with merged data
  console.log("\n📝 Updating Happy Ducky with merged data...");
  await convex.mutation(api.members.updateMemberForMerge, {
    memberId: happyDuckyId,
    firstName: mergedData.firstName,
    lastName: mergedData.lastName,
    bio: mergedData.bio || undefined,
    location: mergedData.location || undefined,
    linkGithub: mergedData.linkGithub,
    linkX: mergedData.linkX,
    linkYouTube: mergedData.linkYouTube,
    websiteUrl: mergedData.websiteUrl,
    avatarUrl: mergedData.avatarUrl,
    joinedDate: mergedData.joinedDate,
    lastOnline: mergedData.lastOnline,
  });

  // Now we need to update all references from Hiram Clark to Happy Ducky
  console.log("\n🔄 Updating all posts and comments to reference the merged member...");

  // Get all posts and comments by Hiram Clark
  const [posts, comments] = await Promise.all([
    convex.query(api.members.getMemberPosts, {
      memberId: hiramClarkId,
      paginationOpts: { numItems: 1000, cursor: null },
    }),
    convex.query(api.members.getMemberComments, {
      memberId: hiramClarkId,
      paginationOpts: { numItems: 1000, cursor: null },
    }),
  ]);

  console.log(`  Found ${posts.page.length} posts by Hiram Clark`);
  console.log(`  Found ${comments.page.length} comments by Hiram Clark`);

  // Update posts
  for (const post of posts.page) {
    await convex.mutation(api.posts.updatePostAuthor, {
      postId: post._id,
      newMemberId: happyDuckyId,
    });
  }

  // Update comments
  for (const comment of comments.page) {
    await convex.mutation(api.comments.updateCommentAuthor, {
      commentId: comment._id,
      newMemberId: happyDuckyId,
    });
  }

  console.log("\n🗑️  Deleting duplicate member (Hiram Clark)...");
  await convex.mutation(api.members.deleteMember, {
    memberId: hiramClarkId,
  });

  console.log("\n✅ Member merge completed successfully!");
  console.log(`   Hiram Clark has been merged into Happy Ducky (now named Hiram Clark)`);
  console.log(`   Email: ${mergedData.email}`);
}

mergeMembers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
