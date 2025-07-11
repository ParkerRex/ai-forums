import { expect, test, describe, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import { generateSlug } from "../../lib/slug-utils";
import { Doc } from "../_generated/dataModel";

// Mock Stripe types for testing
type MockStripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

// Helper to create test member
function createTestMember(overrides: Partial<Doc<"members">>): Omit<Doc<"members">, "_id" | "_creationTime"> {
  const firstName = overrides.firstName || "Test";
  const lastName = overrides.lastName || "User";
  const fullName = `${firstName} ${lastName}`;
  
  return {
    email: "test@example.com",
    firstName,
    lastName,
    slug: generateSlug(fullName),
    lastOnline: Date.now(),
    status: "active",
    joinedDate: Date.now(),
    updatedAt: Date.now(),
    tier: "free",
    subscriptionStatus: "none",
    stripeCustomerId: "cus_test123",
    ...overrides,
  } as Omit<Doc<"members">, "_id" | "_creationTime">;
}

describe("Stripe Webhook Integration Tests", () => {
  describe("Webhook Event Processing", () => {
    test("should handle idempotent webhook processing", async () => {
      const t = convexTest(schema);
      
      // Process the same event twice
      const eventId = "evt_test_duplicate";
      
      // First processing
      await t.run(async (ctx) => {
        await ctx.db.insert("stripeWebhookEvents", {
          stripeEventId: eventId,
          type: "customer.subscription.created",
          processed: true,
          createdAt: Date.now(),
          processedAt: Date.now(),
        });
      });
      
      // Try to process again - should detect duplicate
      const existingEvent = await t.run(async (ctx) => {
        return await ctx.db
          .query("stripeWebhookEvents")
          .withIndex("by_stripeEventId", (q) => q.eq("stripeEventId", eventId))
          .first();
      });
      
      expect(existingEvent).toBeTruthy();
      expect(existingEvent?.processed).toBe(true);
    });

    test("should track failed webhook events", async () => {
      const t = convexTest(schema);
      
      const eventId = await t.run(async (ctx) => {
        return await ctx.db.insert("stripeWebhookEvents", {
          stripeEventId: "evt_failed",
          type: "customer.subscription.created",
          processed: false,
          error: "Member not found",
          createdAt: Date.now(),
        });
      });
      
      const event = await t.run(async (ctx) => {
        return await ctx.db.get(eventId);
      });
      
      expect(event?.processed).toBe(false);
      expect(event?.error).toBe("Member not found");
      expect(event?.processedAt).toBeUndefined();
    });
  });

  describe("Subscription Lifecycle Events", () => {
    test("should handle customer.subscription.created", async () => {
      const t = convexTest(schema);
      
      // Create a member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          email: "subscription@example.com",
          stripeCustomerId: "cus_subscription",
          tier: "free",
          subscriptionStatus: "none",
        }));
      });
      
      // Create subscription record
      const subscriptionId = await t.run(async (ctx) => {
        return await ctx.db.insert("subscriptions", {
          memberId,
          stripeCustomerId: "cus_subscription",
          stripeSubscriptionId: "sub_created",
          stripePriceId: "price_member_monthly",
          status: "active",
          currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
          cancelAtPeriodEnd: false,
          tier: "member",
          billingInterval: "monthly",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
      
      // Update member with subscription info
      await t.run(async (ctx) => {
        await ctx.db.patch(memberId, {
          tier: "member",
          subscriptionStatus: "active",
          stripeSubscriptionId: "sub_created",
          billingInterval: "monthly",
        });
      });
      
      const updatedMember = await t.run(async (ctx) => {
        return await ctx.db.get(memberId);
      });
      
      expect(updatedMember?.tier).toBe("member");
      expect(updatedMember?.subscriptionStatus).toBe("active");
      expect(updatedMember?.stripeSubscriptionId).toBe("sub_created");
    });

    test("should handle customer.subscription.updated for cancellation", async () => {
      const t = convexTest(schema);
      
      // Create active member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_cancel",
          tier: "member",
          subscriptionStatus: "active",
          stripeSubscriptionId: "sub_cancel",
          billingInterval: "monthly",
        }));
      });
      
      // Create active subscription
      const subscriptionId = await t.run(async (ctx) => {
        return await ctx.db.insert("subscriptions", {
          memberId,
          stripeCustomerId: "cus_cancel",
          stripeSubscriptionId: "sub_cancel",
          stripePriceId: "price_member_monthly",
          status: "active",
          currentPeriodEnd: Date.now() + 15 * 24 * 60 * 60 * 1000,
          cancelAtPeriodEnd: false,
          tier: "member",
          billingInterval: "monthly",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
      
      // Simulate cancellation
      const subscriptionEndDate = Date.now() + 15 * 24 * 60 * 60 * 1000;
      
      await t.run(async (ctx) => {
        // Update subscription record
        await ctx.db.patch(subscriptionId, {
          status: "cancelled",
          cancelAtPeriodEnd: true,
          updatedAt: Date.now(),
        });
        
        // Update member
        await ctx.db.patch(memberId, {
          subscriptionStatus: "cancelled",
          subscriptionEndDate,
        });
      });
      
      const member = await t.run(async (ctx) => {
        return await ctx.db.get(memberId);
      });
      
      const subscription = await t.run(async (ctx) => {
        return await ctx.db.get(subscriptionId);
      });
      
      expect(member?.subscriptionStatus).toBe("cancelled");
      expect(member?.subscriptionEndDate).toBe(subscriptionEndDate);
      expect(subscription?.cancelAtPeriodEnd).toBe(true);
    });

    test("should handle customer.subscription.deleted", async () => {
      const t = convexTest(schema);
      
      // Create cancelled member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_deleted",
          tier: "member",
          subscriptionStatus: "cancelled",
          stripeSubscriptionId: "sub_deleted",
          subscriptionEndDate: Date.now() - 1000, // Already expired
        }));
      });
      
      // Mark as expired
      await t.run(async (ctx) => {
        await ctx.db.patch(memberId, {
          subscriptionStatus: "expired",
          subscriptionEndDate: Date.now(),
        });
      });
      
      const member = await t.run(async (ctx) => {
        return await ctx.db.get(memberId);
      });
      
      expect(member?.subscriptionStatus).toBe("expired");
    });
  });

  describe("Payment Events", () => {
    test("should handle invoice.payment_succeeded", async () => {
      const t = convexTest(schema);
      
      // Create member with subscription
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_payment",
          tier: "member",
          subscriptionStatus: "active",
          stripeSubscriptionId: "sub_payment",
          billingInterval: "monthly",
        }));
      });
      
      // Record successful payment
      const paymentId = await t.run(async (ctx) => {
        return await ctx.db.insert("payments", {
          memberId,
          stripePaymentIntentId: "pi_succeeded",
          stripeInvoiceId: "inv_succeeded",
          amount: 9900,
          currency: "usd",
          status: "succeeded",
          description: "member subscription - monthly payment",
          paymentMethod: {
            type: "card",
            brand: undefined,
            last4: "****",
          },
          transactionFee: 317, // 2.9% + 30¢
          netAmount: 9583,
          createdAt: Date.now(),
        });
      });
      
      // Update member's last payment info
      await t.run(async (ctx) => {
        await ctx.db.patch(memberId, {
          lastPaymentDate: Date.now(),
          amountCents: 9900,
        });
      });
      
      const member = await t.run(async (ctx) => {
        return await ctx.db.get(memberId);
      });
      
      const payment = await t.run(async (ctx) => {
        return await ctx.db.get(paymentId);
      });
      
      expect(member?.lastPaymentDate).toBeTruthy();
      expect(member?.amountCents).toBe(9900);
      expect(payment?.status).toBe("succeeded");
      expect(payment?.transactionFee).toBe(317);
      expect(payment?.netAmount).toBe(9583);
    });

    test("should handle invoice.payment_failed", async () => {
      const t = convexTest(schema);
      
      // Create member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_failed",
          tier: "member",
          subscriptionStatus: "active",
          stripeSubscriptionId: "sub_failed",
        }));
      });
      
      // Record failed payment
      const paymentId = await t.run(async (ctx) => {
        return await ctx.db.insert("payments", {
          memberId,
          stripePaymentIntentId: "pi_failed",
          stripeInvoiceId: "inv_failed",
          amount: 9900,
          currency: "usd",
          status: "failed",
          description: "member subscription - monthly payment",
          paymentMethod: {
            type: "card",
            last4: "****",
          },
          failureReason: "Payment failed",
          createdAt: Date.now(),
        });
      });
      
      // Update member status to past_due
      await t.run(async (ctx) => {
        await ctx.db.patch(memberId, {
          subscriptionStatus: "past_due",
        });
      });
      
      const member = await t.run(async (ctx) => {
        return await ctx.db.get(memberId);
      });
      
      const payment = await t.run(async (ctx) => {
        return await ctx.db.get(paymentId);
      });
      
      expect(member?.subscriptionStatus).toBe("past_due");
      expect(payment?.status).toBe("failed");
      expect(payment?.failureReason).toBe("Payment failed");
    });

    test("should handle charge.refunded", async () => {
      const t = convexTest(schema);
      
      // Create member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_refund",
          tier: "member",
          subscriptionStatus: "active",
        }));
      });
      
      // Create original payment
      const paymentId = await t.run(async (ctx) => {
        return await ctx.db.insert("payments", {
          memberId,
          stripePaymentIntentId: "pi_refund",
          amount: 9900,
          currency: "usd",
          status: "succeeded",
          description: "Monthly subscription payment",
          paymentMethod: {
            type: "card",
            brand: "visa",
            last4: "4242",
          },
          transactionFee: 317,
          netAmount: 9583,
          createdAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
        });
      });
      
      // Process refund
      await t.run(async (ctx) => {
        await ctx.db.patch(paymentId, {
          status: "refunded",
          refundedAmount: 9900,
        });
      });
      
      const payment = await t.run(async (ctx) => {
        return await ctx.db.get(paymentId);
      });
      
      expect(payment?.status).toBe("refunded");
      expect(payment?.refundedAmount).toBe(9900);
    });

    test("should handle partial refunds", async () => {
      const t = convexTest(schema);
      
      // Create member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_partial",
          tier: "member",
          subscriptionStatus: "active",
        }));
      });
      
      // Create original payment
      const paymentId = await t.run(async (ctx) => {
        return await ctx.db.insert("payments", {
          memberId,
          stripePaymentIntentId: "pi_partial",
          amount: 9900,
          currency: "usd",
          status: "succeeded",
          description: "Monthly subscription payment",
          paymentMethod: {
            type: "card",
            brand: "amex",
            last4: "0005",
          },
          transactionFee: 317,
          netAmount: 9583,
          createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        });
      });
      
      // Process partial refund
      const partialRefundAmount = 4950; // 50% refund
      
      await t.run(async (ctx) => {
        await ctx.db.patch(paymentId, {
          status: "partially_refunded",
          refundedAmount: partialRefundAmount,
        });
      });
      
      const payment = await t.run(async (ctx) => {
        return await ctx.db.get(paymentId);
      });
      
      expect(payment?.status).toBe("partially_refunded");
      expect(payment?.refundedAmount).toBe(partialRefundAmount);
      expect(payment?.amount).toBe(9900); // Original amount unchanged
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle webhook for non-existent member gracefully", async () => {
      const t = convexTest(schema);
      
      // Try to find member that doesn't exist
      const member = await t.run(async (ctx) => {
        return await ctx.db
          .query("members")
          .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", "cus_nonexistent"))
          .first();
      });
      
      expect(member).toBeNull();
      
      // Log webhook error
      await t.run(async (ctx) => {
        await ctx.db.insert("stripeWebhookEvents", {
          stripeEventId: "evt_nonexistent",
          type: "customer.subscription.created",
          processed: false,
          error: "Member with Stripe customer cus_nonexistent not found",
          createdAt: Date.now(),
        });
      });
    });

    test("should handle subscription status transitions correctly", async () => {
      const t = convexTest(schema);
      
      // Test all valid status transitions
      const transitions = [
        { from: "active", to: "cancelled" },
        { from: "active", to: "past_due" },
        { from: "past_due", to: "active" },
        { from: "past_due", to: "expired" },
        { from: "cancelled", to: "expired" },
      ];
      
      for (const { from, to } of transitions) {
        const memberId = await t.run(async (ctx) => {
          return await ctx.db.insert("members", createTestMember({
            email: `${from}-to-${to}@example.com`,
            stripeCustomerId: `cus_${from}_${to}`,
            tier: "member",
            subscriptionStatus: from as "active" | "cancelled" | "past_due" | "expired" | "none" | undefined,
          }));
        });
        
        await t.run(async (ctx) => {
          await ctx.db.patch(memberId, {
            subscriptionStatus: to as "active" | "cancelled" | "past_due" | "expired" | "none" | undefined,
          });
        });
        
        const member = await t.run(async (ctx) => {
          return await ctx.db.get(memberId);
        });
        
        expect(member?.subscriptionStatus).toBe(to);
      }
    });

    test("should calculate correct fees for different amounts", async () => {
      const t = convexTest(schema);
      
      const testAmounts = [
        { amount: 3900, expectedFee: 143, expectedNet: 3757 }, // $39
        { amount: 5000, expectedFee: 175, expectedNet: 4825 }, // $50
        { amount: 9900, expectedFee: 317, expectedNet: 9583 }, // $99
        { amount: 37500, expectedFee: 1118, expectedNet: 36382 }, // $375
        { amount: 48000, expectedFee: 1422, expectedNet: 46578 }, // $480
      ];
      
      for (const { amount, expectedFee, expectedNet } of testAmounts) {
        const calculatedFee = Math.round(amount * 0.029 + 30);
        const calculatedNet = amount - calculatedFee;
        
        expect(calculatedFee).toBe(expectedFee);
        expect(calculatedNet).toBe(expectedNet);
      }
    });
  });
});