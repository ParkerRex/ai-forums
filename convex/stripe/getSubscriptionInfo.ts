import { format } from "date-fns";
import { query } from "../_generated/server";

export const getSubscriptionInfo = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const member = await ctx.db
      .query("members")
      // Match on Clerk `subject` to align with stored `externalId` values.
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .first();

    if (!member) {
      return null;
    }

    // Get detailed subscription info from subscriptions table if available
    const subscription = member.stripeSubscriptionId
      ? await ctx.db
          .query("subscriptions")
          .withIndex("by_stripeSubscriptionId", (q) =>
            q.eq("stripeSubscriptionId", member.stripeSubscriptionId!),
          )
          .first()
      : null;

    // Calculate renewal info for active subscriptions
    let renewalInfo = null;
    if (member.subscriptionStatus === "active" && member.subscriptionEndDate) {
      const daysUntilRenewal = Math.ceil(
        (member.subscriptionEndDate - Date.now()) / (1000 * 60 * 60 * 24),
      );

      renewalInfo = {
        nextBillingDate: format(new Date(member.subscriptionEndDate), "MMMM d, yyyy"),
        daysUntilRenewal,
        renewalText:
          daysUntilRenewal > 1
            ? `Renews in ${daysUntilRenewal} days`
            : daysUntilRenewal === 1
              ? "Renews tomorrow"
              : "Renews today",
      };
    }

    // Get recent payment history
    const recentPayments = await ctx.db
      .query("payments")
      .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
      .order("desc")
      .take(5);

    // Format payment amounts
    const formatAmount = (cents: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cents / 100);
    };

    return {
      tier: member.tier,
      subscriptionStatus: member.subscriptionStatus,
      billingInterval: member.billingInterval,
      isActive: member.subscriptionStatus === "active",
      isPastDue: member.subscriptionStatus === "past_due",
      isCancelled: member.subscriptionStatus === "cancelled",
      isExpired: member.subscriptionStatus === "expired",
      stripeCustomerId: member.stripeCustomerId,
      stripeSubscriptionId: member.stripeSubscriptionId,
      renewalInfo,
      lastPaymentDate: member.lastPaymentDate
        ? format(new Date(member.lastPaymentDate), "MMMM d, yyyy")
        : null,
      lastPaymentAmount: member.amountCents ? formatAmount(member.amountCents) : null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      recentPayments: recentPayments.map((payment) => ({
        id: payment._id,
        date: format(new Date(payment.createdAt), "MMM d, yyyy"),
        amount: formatAmount(payment.amount),
        status: payment.status,
        description: payment.description,
        paymentMethod: payment.paymentMethod,
      })),
      tierDisplay:
        member.tier === "founding_member"
          ? "Founding Member"
          : member.tier === "early_bird"
            ? "Early Bird"
            : member.tier === "member"
              ? "Member"
              : member.tier === "scholarship"
                ? "Scholarship"
                : "Free",
      billingIntervalDisplay:
        member.billingInterval === "monthly"
          ? "Monthly"
          : member.billingInterval === "yearly"
            ? "Yearly"
            : null,
    };
  },
});
