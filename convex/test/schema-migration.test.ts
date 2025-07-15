import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { generateSlug } from "../../lib/slug-utils";
import { Doc } from "../_generated/dataModel";

// Helper function to create a valid member with all required fields
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
    tier: "member",
    subscriptionStatus: "active",
    stripeCustomerId: "cus_test123",
    ...overrides,
  } as Omit<Doc<"members">, "_id" | "_creationTime">;
}

describe("Payment Schema Migration Tests", () => {
  describe("Member Schema Validation", () => {
    test("should create member with all required payment fields", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          tier: "member",
          subscriptionStatus: "active",
          stripeCustomerId: "cus_test123",
        }));
      });

      const member = await t.run(async (ctx) => {
        return await ctx.db.get(memberId);
      });

      expect(member).toBeTruthy();
      expect(member?.tier).toBe("member");
      expect(member?.subscriptionStatus).toBe("active");
      expect(member?.stripeCustomerId).toBe("cus_test123");
    });

    test("should validate all tier types", async () => {
      const t = convexTest(schema);
      const tiers = ["founding_member", "early_bird", "member"];
      
      for (const tier of tiers) {
        const memberId = await t.run(async (ctx) => {
          return await ctx.db.insert("members", createTestMember({
            email: `${tier}@example.com`,
            firstName: "Test",
            lastName: tier,
            tier: tier as "founding_member" | "early_bird" | "member" | undefined,
            subscriptionStatus: "active",
            stripeCustomerId: `cus_${tier}`,
            billingInterval: "monthly",
          }));
        });

        const member = await t.run(async (ctx) => {
          return await ctx.db.get(memberId);
        });

        expect(member?.tier).toBe(tier);
      }
    });

    test("should validate all subscription status types", async () => {
      const t = convexTest(schema);
      const statuses = ["active", "cancelled", "past_due", "expired"];
      
      for (const status of statuses) {
        const memberId = await t.run(async (ctx) => {
          return await ctx.db.insert("members", createTestMember({
            email: `status-${status}@example.com`,
            firstName: "Test",
            lastName: status,
            tier: "member",
            subscriptionStatus: status as "active" | "cancelled" | "past_due" | "expired" | undefined,
            stripeCustomerId: `cus_status_${status}`,
          }));
        });

        const member = await t.run(async (ctx) => {
          return await ctx.db.get(memberId);
        });

        expect(member?.subscriptionStatus).toBe(status);
      }
    });

    test("should handle optional payment fields correctly", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          email: "optional@example.com",
          firstName: "Optional",
          lastName: "Fields",
          tier: "member",
          subscriptionStatus: "active",
          stripeCustomerId: "cus_optional",
          stripeSubscriptionId: "sub_test123",
          subscriptionEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
          billingInterval: "monthly",
          lastPaymentDate: Date.now(),
          amountCents: 9900,
        }));
      });

      const member = await t.run(async (ctx) => {
        return await ctx.db.get(memberId);
      });

      expect(member?.stripeSubscriptionId).toBe("sub_test123");
      expect(member?.billingInterval).toBe("monthly");
      expect(member?.amountCents).toBe(9900);
      expect(member?.lastPaymentDate).toBeTruthy();
      expect(member?.subscriptionEndDate).toBeTruthy();
    });
  });

  describe("Migration Data Integrity", () => {
    test("should correctly handle members without tier", async () => {
      const t = convexTest(schema);
      
      // Create a member without a tier
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          email: "notier@example.com",
          firstName: "No",
          lastName: "Tier",
          tier: undefined,
          subscriptionStatus: "none",
          stripeCustomerId: "cus_notier",
        }));
      });

      const member = await t.run(async (ctx) => {
        return await ctx.db.get(memberId);
      });

      expect(member?.tier).toBeUndefined();
      expect(member?.subscriptionStatus).toBe("none");
      expect(member?.billingInterval).toBeUndefined();
    });

    test("should handle cancelled subscriptions with future end dates", async () => {
      const t = convexTest(schema);
      const futureEndDate = Date.now() + 15 * 24 * 60 * 60 * 1000; // 15 days from now
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          email: "cancelled@example.com",
          firstName: "Cancelled",
          lastName: "Subscription",
          tier: "member",
          subscriptionStatus: "cancelled",
          subscriptionEndDate: futureEndDate,
          stripeCustomerId: "cus_cancelled",
          billingInterval: "monthly",
        }));
      });

      const member = await t.run(async (ctx) => {
        return await ctx.db.get(memberId);
      });

      expect(member?.subscriptionStatus).toBe("cancelled");
      expect(member?.subscriptionEndDate).toBe(futureEndDate);
      // Member should still have access until subscription end date
    });

    test("should handle expired subscriptions correctly", async () => {
      const t = convexTest(schema);
      const pastEndDate = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          email: "expired@example.com",
          firstName: "Expired",
          lastName: "Subscription",
          joinedDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
          tier: "member",
          subscriptionStatus: "expired",
          subscriptionEndDate: pastEndDate,
          stripeCustomerId: "cus_expired",
          billingInterval: "yearly",
          lastPaymentDate: pastEndDate - 365 * 24 * 60 * 60 * 1000, // 1 year before expiry
        }));
      });

      const member = await t.run(async (ctx) => {
        return await ctx.db.get(memberId);
      });

      expect(member?.subscriptionStatus).toBe("expired");
      expect(member?.subscriptionEndDate).toBeLessThan(Date.now());
    });

    test("should preserve grandfathered pricing tiers", async () => {
      const t = convexTest(schema);
      const grandfatheredTiers = [
        { tier: "founding_member", monthlyPrice: 3900, yearlyPrice: 37500 },
        { tier: "early_bird", monthlyPrice: 5000, yearlyPrice: 48000 },
      ];

      for (const { tier, monthlyPrice, yearlyPrice } of grandfatheredTiers) {
        const monthlyMemberId = await t.run(async (ctx) => {
          return await ctx.db.insert("members", createTestMember({
            email: `${tier}-monthly@example.com`,
            firstName: tier,
            lastName: "Monthly",
            joinedDate: Date.now() - 180 * 24 * 60 * 60 * 1000, // 6 months ago
            tier: tier as "founding_member" | "early_bird" | "member" | undefined,
            subscriptionStatus: "active",
            stripeCustomerId: `cus_${tier}_monthly`,
            billingInterval: "monthly",
            amountCents: monthlyPrice,
          }));
        });

        const yearlyMemberId = await t.run(async (ctx) => {
          return await ctx.db.insert("members", createTestMember({
            email: `${tier}-yearly@example.com`,
            firstName: tier,
            lastName: "Yearly",
            joinedDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
            tier: tier as "founding_member" | "early_bird" | "member" | undefined,
            subscriptionStatus: "active",
            stripeCustomerId: `cus_${tier}_yearly`,
            billingInterval: "yearly",
            amountCents: yearlyPrice,
          }));
        });

        const monthlyMember = await t.run(async (ctx) => {
          return await ctx.db.get(monthlyMemberId);
        });

        const yearlyMember = await t.run(async (ctx) => {
          return await ctx.db.get(yearlyMemberId);
        });

        expect(monthlyMember?.tier).toBe(tier);
        expect(monthlyMember?.amountCents).toBe(monthlyPrice);
        expect(yearlyMember?.tier).toBe(tier);
        expect(yearlyMember?.amountCents).toBe(yearlyPrice);
      }
    });
  });

  describe("Related Tables Schema", () => {
    test("should create subscription record with all fields", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          email: "sub-test@example.com",
          firstName: "Sub",
          lastName: "Test",
          tier: "member",
          subscriptionStatus: "active",
          stripeCustomerId: "cus_subtest",
        }));
      });

      const subscriptionId = await t.run(async (ctx) => {
        return await ctx.db.insert("subscriptions", {
          memberId,
          stripeCustomerId: "cus_subtest",
          stripeSubscriptionId: "sub_test123",
          stripePriceId: "price_test123",
          status: "active",
          currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
          cancelAtPeriodEnd: false,
          tier: "member",
          billingInterval: "monthly",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const subscription = await t.run(async (ctx) => {
        return await ctx.db.get(subscriptionId);
      });

      expect(subscription).toBeTruthy();
      expect(subscription?.tier).toBe("member");
      expect(subscription?.billingInterval).toBe("monthly");
    });

    test("should create payment record with all fields", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          email: "payment-test@example.com",
          firstName: "Payment",
          lastName: "Test",
          tier: "member",
          subscriptionStatus: "active",
          stripeCustomerId: "cus_paytest",
        }));
      });

      const paymentId = await t.run(async (ctx) => {
        return await ctx.db.insert("payments", {
          memberId,
          stripePaymentIntentId: "pi_test123",
          stripeInvoiceId: "inv_test123",
          amount: 9900,
          currency: "usd",
          status: "succeeded",
          description: "Monthly subscription payment",
          paymentMethod: {
            type: "card",
            brand: "visa",
            last4: "4242",
          },
          transactionFee: 317, // 2.9% + 30¢
          netAmount: 9583,
          createdAt: Date.now(),
        });
      });

      const payment = await t.run(async (ctx) => {
        return await ctx.db.get(paymentId);
      });

      expect(payment).toBeTruthy();
      expect(payment?.amount).toBe(9900);
      expect(payment?.status).toBe("succeeded");
      expect(payment?.paymentMethod.last4).toBe("4242");
    });

    test("should handle refunded payments correctly", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          email: "refund-test@example.com",
          firstName: "Refund",
          lastName: "Test",
          tier: "member",
          subscriptionStatus: "active",
          stripeCustomerId: "cus_refundtest",
        }));
      });

      const paymentId = await t.run(async (ctx) => {
        return await ctx.db.insert("payments", {
          memberId,
          stripePaymentIntentId: "pi_refund123",
          amount: 9900,
          currency: "usd",
          status: "refunded",
          description: "Refunded payment",
          paymentMethod: {
            type: "card",
            brand: "mastercard",
            last4: "5555",
          },
          refundedAmount: 9900,
          createdAt: Date.now(),
        });
      });

      const payment = await t.run(async (ctx) => {
        return await ctx.db.get(paymentId);
      });

      expect(payment?.status).toBe("refunded");
      expect(payment?.refundedAmount).toBe(9900);
    });

    test("should track webhook events for idempotency", async () => {
      const t = convexTest(schema);
      
      const eventId = await t.run(async (ctx) => {
        return await ctx.db.insert("stripeWebhookEvents", {
          stripeEventId: "evt_test123",
          type: "customer.subscription.created",
          processed: true,
          createdAt: Date.now(),
          processedAt: Date.now(),
        });
      });

      const event = await t.run(async (ctx) => {
        return await ctx.db.get(eventId);
      });

      expect(event).toBeTruthy();
      expect(event?.processed).toBe(true);
      expect(event?.stripeEventId).toBe("evt_test123");
    });
  });
});