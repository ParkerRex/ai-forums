import { query } from "../_generated/server";

export const verifyImportResults = query({
  args: {},
  handler: async (ctx) => {
    // Get counts by tier
    const allMembers = await ctx.db.query("members").collect();

    const tierCounts = allMembers.reduce(
      (acc, member) => {
        const tier = member.tier || "unknown";
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get counts by subscription status
    const statusCounts = allMembers.reduce(
      (acc, member) => {
        const status = member.subscriptionStatus || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Sample some members with payment data
    const membersWithPaymentData = allMembers
      .filter((m) => m.amountCents && m.amountCents > 0)
      .slice(0, 5)
      .map((m) => ({
        email: m.email,
        fullName: `${m.firstName} ${m.lastName}`,
        tier: m.tier,
        subscriptionStatus: m.subscriptionStatus,
        amountCents: m.amountCents,
        billingInterval: m.billingInterval,
        lastPaymentDate: m.lastPaymentDate
          ? new Date(m.lastPaymentDate).toLocaleDateString()
          : "N/A",
        subscriptionEndDate: m.subscriptionEndDate
          ? new Date(m.subscriptionEndDate).toLocaleDateString()
          : "N/A",
      }));

    return {
      totalMembers: allMembers.length,
      tierCounts,
      statusCounts,
      sampleMembers: membersWithPaymentData,
    };
  },
});
