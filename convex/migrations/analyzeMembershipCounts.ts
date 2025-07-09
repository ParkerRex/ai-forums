import { query } from "../_generated/server";

export const analyzeMembershipCounts = query({
  args: {},
  handler: async (ctx) => {
    const allMembers = await ctx.db.query("members").collect();
    
    // Count paid members (excluding free and scholarship)
    const paidMembers = allMembers.filter(m => 
      m.tier && m.tier !== "free" && m.tier !== "scholarship"
    );
    
    // Count by subscription status for paid tiers
    const paidByStatus = paidMembers.reduce((acc, m) => {
      const status = m.subscriptionStatus || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Get active paid members
    const activePaidMembers = paidMembers.filter(m => 
      m.subscriptionStatus === "active"
    );
    
    // Get members who should be active (active, cancelled but not expired, past_due)
    const shouldBeActivePaid = paidMembers.filter(m => 
      m.subscriptionStatus === "active" || 
      m.subscriptionStatus === "cancelled" || 
      m.subscriptionStatus === "past_due"
    );
    
    return {
      totalMembers: allMembers.length,
      paidMembersTotal: paidMembers.length,
      paidByStatus,
      activePaidOnly: activePaidMembers.length,
      shouldBeActivePaid: shouldBeActivePaid.length,
      breakdown: {
        early_bird: allMembers.filter(m => m.tier === "early_bird").length,
        founding_member: allMembers.filter(m => m.tier === "founding_member").length,
        member: allMembers.filter(m => m.tier === "member").length,
        scholarship: allMembers.filter(m => m.tier === "scholarship").length,
        free: allMembers.filter(m => m.tier === "free").length,
      }
    };
  },
});