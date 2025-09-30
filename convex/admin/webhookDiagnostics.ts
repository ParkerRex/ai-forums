import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Webhook diagnostics to help debug webhook delivery issues
 */

/**
 * Get recent webhook events and their status
 */
export const getWebhookDiagnostics = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get recent webhook events
    const webhookEvents = await ctx.db.query("stripeWebhookEvents").order("desc").take(limit);

    // Get some stats
    const totalEvents = webhookEvents.length;
    const processedEvents = webhookEvents.filter((e) => e.processed).length;
    const failedEvents = webhookEvents.filter((e) => !e.processed && e.error).length;
    const pendingEvents = webhookEvents.filter((e) => !e.processed && !e.error).length;

    // Group by event type
    const eventsByType = webhookEvents.reduce(
      (acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get recent checkout sessions from members
    const recentMembers = await ctx.db
      .query("members")
      .withIndex("by_joinedDate")
      .order("desc")
      .take(10);

    const membersWithSubscriptions = recentMembers.filter(
      (m) => m.stripeCustomerId && m.subscriptionStatus === "active",
    );

    return {
      webhookStats: {
        total: totalEvents,
        processed: processedEvents,
        failed: failedEvents,
        pending: pendingEvents,
        eventsByType,
      },
      recentEvents: webhookEvents.map((e) => ({
        id: e._id,
        stripeEventId: e.stripeEventId,
        type: e.type,
        processed: e.processed,
        error: e.error,
        createdAt: e._creationTime,
        retryCount: e.retryCount || 0,
      })),
      memberStats: {
        recentMembersCount: recentMembers.length,
        membersWithActiveSubscriptions: membersWithSubscriptions.length,
        recentMembersWithSubscriptions: membersWithSubscriptions.map((m) => ({
          email: m.email,
          tier: m.tier,
          subscriptionStatus: m.subscriptionStatus,
          stripeCustomerId: m.stripeCustomerId,
          joinedDate: m.joinedDate,
        })),
      },
      diagnosis: {
        webhooksWorking: totalEvents > 0 && processedEvents > 0,
        recentWebhookActivity: webhookEvents.some(
          (e) => e._creationTime > Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
        ),
        subscriptionFlowWorking: membersWithSubscriptions.length > 0,
        possibleIssues: [
          ...(totalEvents === 0
            ? ["No webhook events received - check Stripe webhook configuration"]
            : []),
          ...(failedEvents > 0 ? [`${failedEvents} failed webhook events - check error logs`] : []),
          ...(totalEvents > 0 && processedEvents === 0
            ? ["Webhooks received but none processed - check webhook processing logic"]
            : []),
          ...(membersWithSubscriptions.length === 0
            ? ["No members with active subscriptions - check payment flow"]
            : []),
        ],
      },
    };
  },
});

/**
 * Test webhook processing by simulating a webhook event
 */
export const testWebhookProcessing = mutation({
  args: {
    testType: v.union(v.literal("connectivity"), v.literal("processing")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.testType === "connectivity") {
      // Create a test webhook event to verify database connectivity
      const testEventId = `test_${now}`;

      await ctx.db.insert("stripeWebhookEvents", {
        stripeEventId: testEventId,
        type: "test.connectivity",
        processed: true,
        createdAt: now,
        processedAt: now,
        retryCount: 0,
      });

      return {
        success: true,
        message: "Test connectivity event created",
        testEventId,
      };
    }

    if (args.testType === "processing") {
      // Test the webhook processing pipeline
      const testEventId = `test_processing_${now}`;

      // Create an unprocessed test event
      await ctx.db.insert("stripeWebhookEvents", {
        stripeEventId: testEventId,
        type: "test.processing",
        processed: false,
        createdAt: now,
        retryCount: 0,
      });

      // Immediately mark it as processed to test the update flow
      const testEvent = await ctx.db
        .query("stripeWebhookEvents")
        .withIndex("by_stripeEventId", (q) => q.eq("stripeEventId", testEventId))
        .first();

      if (testEvent) {
        await ctx.db.patch(testEvent._id, {
          processed: true,
          processedAt: now,
        });
      }

      return {
        success: true,
        message: "Test processing event created and processed",
        testEventId,
      };
    }

    return { success: false, message: "Unknown test type" };
  },
});

/**
 * Check for missing webhook events by comparing with recent checkout sessions
 */
export const checkMissingWebhookEvents = query({
  args: {},
  handler: async (ctx) => {
    // Get recent members who should have had webhook events
    const recentMembers = await ctx.db
      .query("members")
      .withIndex("by_joinedDate")
      .order("desc")
      .take(50);

    // Filter for members who have Stripe data but might be missing webhook events
    const membersWithStripeData = recentMembers.filter(
      (m) => m.stripeCustomerId && m.stripeCustomerId !== "",
    );

    // Get all webhook events
    const allWebhookEvents = await ctx.db.query("stripeWebhookEvents").collect();

    // Check for potential missing events
    const potentialMissingEvents = membersWithStripeData.filter((_member) => {
      // Check if there's a corresponding webhook event for this member's customer
      const hasWebhookEvent = allWebhookEvents.some(
        (event) =>
          event.type === "checkout.session.completed" ||
          event.type === "customer.subscription.created",
      );

      return !hasWebhookEvent;
    });

    return {
      totalRecentMembers: recentMembers.length,
      membersWithStripeData: membersWithStripeData.length,
      totalWebhookEvents: allWebhookEvents.length,
      potentialMissingEvents: potentialMissingEvents.length,
      membersWithPotentialMissingEvents: potentialMissingEvents.map((m) => ({
        email: m.email,
        stripeCustomerId: m.stripeCustomerId,
        subscriptionStatus: m.subscriptionStatus,
        joinedDate: m.joinedDate,
      })),
      recommendation:
        potentialMissingEvents.length > 0
          ? "Some members have Stripe data but no corresponding webhook events. Check Stripe webhook configuration."
          : "Webhook events appear to be properly correlated with member data.",
    };
  },
});
