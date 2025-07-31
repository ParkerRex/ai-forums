import { mutation } from "../_generated/server";

export const removePendingOnboardingStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db
      .query("members")
      .filter(q => q.eq(q.field("status"), "pending_onboarding"))
      .collect();
    
    console.log(`Found ${members.length} members with pending_onboarding status`);
    
    for (const member of members) {
      await ctx.db.patch(member._id, {
        status: "active"
      });
    }
    
    console.log(`Updated ${members.length} members to active status`);
    
    return {
      updated: members.length,
      memberIds: members.map(m => m._id)
    };
  }
});