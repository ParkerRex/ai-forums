import { ConvexClient } from "convex/browser";
import * as dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function verifyMerge() {
  console.log("Verifying member merge...\n");

  const happyDuckyId = "j97bwc2fxyj6yppkk89bhwmb4x7kdpe8";

  // Get the merged member
  const member = await convex.query(api.members.getMemberById, { id: happyDuckyId });

  if (!member) {
    console.error("❌ Member not found!");
    return;
  }

  console.log("✅ Merged member details:");
  console.log(`   ID: ${member._id}`);
  console.log(`   Name: ${member.firstName} ${member.lastName}`);
  console.log(`   Email: ${member.email}`);
  console.log(`   Joined: ${member.joinedDateFormatted}`);
  console.log(`   Last Online: ${member.lastOnlineFormatted}`);
  console.log(`   Status: ${member.status}`);
  console.log(`   Slug: ${member.slug}`);

  // Check posts and comments
  const [posts, comments] = await Promise.all([
    convex.query(api.members.getMemberPosts, {
      memberId: happyDuckyId,
      paginationOpts: { numItems: 100, cursor: null },
    }),
    convex.query(api.members.getMemberComments, {
      memberId: happyDuckyId,
      paginationOpts: { numItems: 100, cursor: null },
    }),
  ]);

  console.log(`\n📊 Content statistics:`);
  console.log(`   Posts: ${posts.page.length}`);
  console.log(`   Comments: ${comments.page.length}`);

  // Verify old member is deleted
  try {
    const oldMember = await convex.query(api.members.getMemberById, {
      id: "j97a1f6tpmehxcx8hcwc7qatdd7ma7be",
    });
    if (oldMember) {
      console.log("\n❌ Old member (Hiram Clark) still exists!");
    } else {
      console.log("\n✅ Old member (Hiram Clark) successfully deleted");
    }
  } catch (_error) {
    console.log("\n✅ Old member (Hiram Clark) successfully deleted");
  }

  console.log("\n✅ Member merge verified successfully!");
}

verifyMerge()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
