import { ConvexClient } from "convex/browser";
import * as dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function fixRemainingMembers() {
  console.log("Fixing remaining member email issues...");

  // Based on the user's information, we need to add emails for:
  // 1. Hiram Clark (was Sin Adain) - needs email
  // 2. Malvinder Singh (was Emm Ess) - already updated to Malvinder, but email might not have been applied

  const remainingFixes = [
    {
      firstName: "Hiram",
      lastName: "Clark",
      email: null, // User didn't provide email for Hiram Clark
    },
    {
      firstName: "Malvinder",
      lastName: "Singh",
      email: "aemaes@gmail.com", // This is the email from Emm Ess
    },
  ];

  for (const fix of remainingFixes) {
    try {
      // Search for the member
      const members = await convex.query(api.members.searchByName, {
        firstName: fix.firstName,
        lastName: fix.lastName,
      });

      if (members && members.length > 0) {
        const member = members[0];
        console.log(`\nFound ${fix.firstName} ${fix.lastName}:`);
        console.log(`  Current email: ${member.email}`);

        if (fix.email && member.email.endsWith("@imported.com")) {
          // Update the email
          await convex.mutation(api.members.updateMember, {
            memberId: member._id,
            email: fix.email,
          });
          console.log(`  ✅ Updated email to: ${fix.email}`);
        } else if (!fix.email) {
          console.log(`  ⚠️  No real email provided for ${fix.firstName} ${fix.lastName}`);
          console.log(`  The user needs to provide the real email for this member`);
        } else {
          console.log(`  ✓ Email already correct: ${member.email}`);
        }
      } else {
        console.log(`❌ Member not found: ${fix.firstName} ${fix.lastName}`);
      }
    } catch (error) {
      console.error(`Error processing ${fix.firstName} ${fix.lastName}:`, error);
    }
  }

  console.log("\n✅ Remaining member fixes completed!");
  console.log("\nNote: Hiram Clark still needs a real email address.");
}

fixRemainingMembers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
