import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const checkAndSendReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all members with active subscriptions
    const activeMembers = await ctx.db
      .query("members")
      .filter((q) => 
        q.and(
          q.eq(q.field("subscriptionStatus"), "active"),
          q.neq(q.field("tier"), "free"),
          q.neq(q.field("tier"), "scholarship")
        )
      )
      .collect();

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const member of activeMembers) {
      if (!member.subscriptionEndDate) continue;

      const daysUntilRenewal = Math.ceil((member.subscriptionEndDate - now) / oneDayMs);

      // Send reminders at 7 days, 3 days, and 1 day before renewal
      if (daysUntilRenewal === 7 || daysUntilRenewal === 3 || daysUntilRenewal === 1) {
        // Check if subscription is set to cancel at period end
        const subscription = member.stripeSubscriptionId
          ? await ctx.db
              .query("subscriptions")
              .withIndex("by_stripeSubscriptionId", (q) =>
                q.eq("stripeSubscriptionId", member.stripeSubscriptionId!)
              )
              .first()
          : null;

        // Don't send reminders for subscriptions that are set to cancel
        if (subscription?.cancelAtPeriodEnd) {
          continue;
        }

        // Send the reminder notification
        await ctx.scheduler.runAfter(0, internal.notifications.sendRenewalReminder, {
          memberId: member._id,
          daysUntilRenewal,
          subscriptionEndDate: member.subscriptionEndDate,
        });
      }
    }
  },
});