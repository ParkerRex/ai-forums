import { query } from "../_generated/server";

export const checkSubscriptionStatuses = query({
  args: {},
  handler: async (ctx) => {
    const allMembers = await ctx.db.query("members").collect();
    
    // Get cancelled members
    const cancelledMembers = allMembers
      .filter(m => m.subscriptionStatus === "cancelled")
      .map(m => ({
        email: m.email,
        name: `${m.firstName} ${m.lastName}`,
        tier: m.tier,
        billingInterval: m.billingInterval,
        amountCents: m.amountCents,
        lastPaymentDate: m.lastPaymentDate ? new Date(m.lastPaymentDate).toLocaleDateString() : "N/A",
        subscriptionEndDate: m.subscriptionEndDate ? new Date(m.subscriptionEndDate).toLocaleDateString() : "N/A",
      }));
    
    // Get "none" status members
    const noneStatusMembers = allMembers
      .filter(m => m.subscriptionStatus === "none")
      .map(m => ({
        email: m.email,
        name: `${m.firstName} ${m.lastName}`,
        tier: m.tier,
        billingInterval: m.billingInterval,
        amountCents: m.amountCents,
        lastPaymentDate: m.lastPaymentDate ? new Date(m.lastPaymentDate).toLocaleDateString() : "N/A",
        notes: m.tier === "scholarship" ? "Scholarship/Lifetime" : "Free tier"
      }));
    
    // Get past_due members
    const pastDueMembers = allMembers
      .filter(m => m.subscriptionStatus === "past_due")
      .map(m => ({
        email: m.email,
        name: `${m.firstName} ${m.lastName}`,
        tier: m.tier,
        billingInterval: m.billingInterval,
        amountCents: m.amountCents,
        lastPaymentDate: m.lastPaymentDate ? new Date(m.lastPaymentDate).toLocaleDateString() : "N/A",
      }));
    
    // Get expired members
    const expiredMembers = allMembers
      .filter(m => m.subscriptionStatus === "expired")
      .map(m => ({
        email: m.email,
        name: `${m.firstName} ${m.lastName}`,
        tier: m.tier,
        billingInterval: m.billingInterval,
        amountCents: m.amountCents,
        lastPaymentDate: m.lastPaymentDate ? new Date(m.lastPaymentDate).toLocaleDateString() : "N/A",
      }));
    
    return {
      cancelled: cancelledMembers,
      none: noneStatusMembers,
      pastDue: pastDueMembers,
      expired: expiredMembers,
    };
  },
});