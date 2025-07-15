import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const updateLegacyTiers = mutation({
  handler: async (ctx) => {
    const membersToUpdate = await ctx.db
      .query("members")
      .filter((q) =>
        q.or(
          q.eq(q.field("tier"), "free"),
          q.eq(q.field("tier"), "scholarship")
        )
      )
      .collect();

    console.log(`Found ${membersToUpdate.length} members with legacy tiers to update.`);

    for (const member of membersToUpdate) {
      await ctx.db.patch(member._id, { tier: "early_bird" });
      console.log(`Updated member with ID: ${member._id} from tier: ${member.tier} to early_bird`);
    }

    return { updatedCount: membersToUpdate.length };
  },
});
