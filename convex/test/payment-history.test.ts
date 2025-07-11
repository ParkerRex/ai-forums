import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { generateSlug } from "../../lib/slug-utils";
import { Doc } from "../_generated/dataModel";

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

describe("Payment History Tracking Integration Tests", () => {
  describe("Payment Record Creation", () => {
    test("should track all payment fields correctly", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_payment_history",
          tier: "member",
          subscriptionStatus: "active",
        }));
      });
      
      const paymentId = await t.run(async (ctx) => {
        return await ctx.db.insert("payments", {
          memberId,
          stripePaymentIntentId: "pi_complete",
          stripeInvoiceId: "inv_complete",
          amount: 9900,
          currency: "usd",
          status: "succeeded",
          description: "member subscription - monthly payment",
          paymentMethod: {
            type: "card",
            brand: "visa",
            last4: "4242",
          },
          transactionFee: 317,
          netAmount: 9583,
          createdAt: Date.now(),
        });
      });
      
      const payment = await t.run(async (ctx) => {
        return await ctx.db.get(paymentId);
      });
      
      expect(payment).toBeTruthy();
      expect(payment?.amount).toBe(9900);
      expect(payment?.transactionFee).toBe(317);
      expect(payment?.netAmount).toBe(9583);
      expect(payment?.paymentMethod.brand).toBe("visa");
      expect(payment?.paymentMethod.last4).toBe("4242");
    });

    test("should link payments to subscriptions", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_linked",
          tier: "founding_member",
          subscriptionStatus: "active",
        }));
      });
      
      const subscriptionId = await t.run(async (ctx) => {
        return await ctx.db.insert("subscriptions", {
          memberId,
          stripeCustomerId: "cus_linked",
          stripeSubscriptionId: "sub_linked",
          stripePriceId: "price_founding_monthly",
          status: "active",
          currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
          cancelAtPeriodEnd: false,
          tier: "founding_member",
          billingInterval: "monthly",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
      
      const paymentId = await t.run(async (ctx) => {
        return await ctx.db.insert("payments", {
          memberId,
          subscriptionId,
          stripePaymentIntentId: "pi_linked",
          stripeInvoiceId: "inv_linked",
          amount: 3900,
          currency: "usd",
          status: "succeeded",
          description: "founding_member subscription - monthly payment",
          paymentMethod: {
            type: "card",
            brand: "mastercard",
            last4: "5555",
          },
          transactionFee: 143,
          netAmount: 3757,
          createdAt: Date.now(),
        });
      });
      
      const payment = await t.run(async (ctx) => {
        return await ctx.db.get(paymentId);
      });
      
      expect(payment?.subscriptionId).toBe(subscriptionId);
    });
  });

  describe("Payment History Queries", () => {
    test("should retrieve member payment history sorted by date", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_history",
          tier: "member",
        }));
      });
      
      // Create multiple payments
      const now = Date.now();
      const paymentDates = [
        now - 60 * 24 * 60 * 60 * 1000, // 60 days ago
        now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        now, // today
      ];
      
      const paymentIds = [];
      for (const date of paymentDates) {
        const id = await t.run(async (ctx) => {
          return await ctx.db.insert("payments", {
            memberId,
            stripePaymentIntentId: `pi_${date}`,
            amount: 9900,
            currency: "usd",
            status: "succeeded",
            description: "Monthly payment",
            paymentMethod: {
              type: "card",
              brand: "visa",
              last4: "4242",
            },
            createdAt: date,
          });
        });
        paymentIds.push(id);
      }
      
      // Query payments by member
      const payments = await t.run(async (ctx) => {
        return await ctx.db
          .query("payments")
          .withIndex("by_memberId", (q) => q.eq("memberId", memberId))
          .order("desc")
          .collect();
      });
      
      expect(payments).toHaveLength(3);
      // Should be sorted newest first
      expect(payments[0].createdAt).toBeGreaterThanOrEqual(payments[1].createdAt);
      expect(payments[1].createdAt).toBeGreaterThanOrEqual(payments[2].createdAt);
    });

    test("should track refunds in payment history", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_refund_history",
        }));
      });
      
      // Original payment
      const originalPaymentId = await t.run(async (ctx) => {
        return await ctx.db.insert("payments", {
          memberId,
          stripePaymentIntentId: "pi_original",
          amount: 9900,
          currency: "usd",
          status: "succeeded",
          description: "Monthly subscription",
          paymentMethod: {
            type: "card",
            brand: "amex",
            last4: "0005",
          },
          transactionFee: 317,
          netAmount: 9583,
          createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        });
      });
      
      // Refund payment
      const refundPaymentId = await t.run(async (ctx) => {
        return await ctx.db.insert("payments", {
          memberId,
          stripePaymentIntentId: "pi_refund_record",
          amount: -9900, // Negative amount for refund
          currency: "usd",
          status: "refunded",
          description: "Refund for Monthly subscription",
          paymentMethod: {
            type: "card",
            brand: "amex",
            last4: "0005",
          },
          refundedAmount: 9900,
          createdAt: Date.now(),
        });
      });
      
      // Also update original payment
      await t.run(async (ctx) => {
        await ctx.db.patch(originalPaymentId, {
          status: "refunded",
          refundedAmount: 9900,
        });
      });
      
      const refundPayment = await t.run(async (ctx) => {
        return await ctx.db.get(refundPaymentId);
      });
      
      expect(refundPayment?.amount).toBe(-9900);
      expect(refundPayment?.status).toBe("refunded");
    });

    test("should calculate total revenue correctly", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_revenue",
        }));
      });
      
      // Create various payments
      const payments = [
        { amount: 9900, status: "succeeded" as const },
        { amount: 5000, status: "succeeded" as const },
        { amount: 3900, status: "succeeded" as const },
        { amount: 9900, status: "failed" as const }, // Should not count
        { amount: -5000, status: "refunded" as const }, // Refund
      ];
      
      for (const payment of payments) {
        await t.run(async (ctx) => {
          await ctx.db.insert("payments", {
            memberId,
            stripePaymentIntentId: `pi_${payment.amount}_${payment.status}`,
            amount: payment.amount,
            currency: "usd",
            status: payment.status,
            description: "Test payment",
            paymentMethod: {
              type: "card",
              last4: "4242",
            },
            createdAt: Date.now(),
          });
        });
      }
      
      // Calculate total revenue
      const allPayments = await t.run(async (ctx) => {
        return await ctx.db
          .query("payments")
          .withIndex("by_memberId", (q) => q.eq("memberId", memberId))
          .collect();
      });
      
      const totalRevenue = allPayments
        .filter(p => p.status === "succeeded")
        .reduce((sum, p) => sum + p.amount, 0);
      
      const totalRefunds = allPayments
        .filter(p => p.status === "refunded" && p.amount < 0)
        .reduce((sum, p) => sum + Math.abs(p.amount), 0);
      
      expect(totalRevenue).toBe(18800); // 9900 + 5000 + 3900
      expect(totalRefunds).toBe(5000);
    });
  });

  describe("Payment Method Tracking", () => {
    test("should track different payment method types", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_methods",
        }));
      });
      
      const paymentMethods = [
        { type: "card", brand: "visa", last4: "4242" },
        { type: "card", brand: "mastercard", last4: "5555" },
        { type: "card", brand: "amex", last4: "0005" },
        { type: "card", brand: "discover", last4: "6011" },
      ];
      
      for (const method of paymentMethods) {
        await t.run(async (ctx) => {
          await ctx.db.insert("payments", {
            memberId,
            stripePaymentIntentId: `pi_${method.brand}`,
            amount: 9900,
            currency: "usd",
            status: "succeeded",
            description: "Payment with " + method.brand,
            paymentMethod: method,
            createdAt: Date.now(),
          });
        });
      }
      
      const payments = await t.run(async (ctx) => {
        return await ctx.db
          .query("payments")
          .withIndex("by_memberId", (q) => q.eq("memberId", memberId))
          .collect();
      });
      
      expect(payments).toHaveLength(4);
      const brands = payments.map(p => p.paymentMethod.brand);
      expect(brands).toContain("visa");
      expect(brands).toContain("mastercard");
      expect(brands).toContain("amex");
      expect(brands).toContain("discover");
    });
  });

  describe("Payment Status Filtering", () => {
    test("should filter payments by status", async () => {
      const t = convexTest(schema);
      
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", createTestMember({
          stripeCustomerId: "cus_status_filter",
        }));
      });
      
      // Create payments with different statuses
      const statuses = ["succeeded", "failed", "refunded", "partially_refunded", "pending"];
      
      for (const status of statuses) {
        await t.run(async (ctx) => {
          await ctx.db.insert("payments", {
            memberId,
            stripePaymentIntentId: `pi_${status}`,
            amount: 9900,
            currency: "usd",
            status: status as "succeeded" | "pending" | "failed" | "refunded" | "partially_refunded",
            description: `Payment ${status}`,
            paymentMethod: {
              type: "card",
              last4: "4242",
            },
            refundedAmount: status === "refunded" ? 9900 : status === "partially_refunded" ? 4950 : undefined,
            createdAt: Date.now(),
          });
        });
      }
      
      // Query by status
      const succeededPayments = await t.run(async (ctx) => {
        return await ctx.db
          .query("payments")
          .withIndex("by_status", (q) => q.eq("status", "succeeded"))
          .collect();
      });
      
      const refundedPayments = await t.run(async (ctx) => {
        return await ctx.db
          .query("payments")
          .withIndex("by_status", (q) => q.eq("status", "refunded"))
          .collect();
      });
      
      expect(succeededPayments.length).toBeGreaterThan(0);
      expect(refundedPayments.length).toBeGreaterThan(0);
      expect(succeededPayments.every(p => p.status === "succeeded")).toBe(true);
      expect(refundedPayments.every(p => p.status === "refunded")).toBe(true);
    });
  });

  describe("Admin Payment Queries", () => {
    test("should retrieve all payments for admin dashboard", async () => {
      const t = convexTest(schema);
      
      // Create multiple members with payments
      const memberIds = [];
      for (let i = 0; i < 3; i++) {
        const memberId = await t.run(async (ctx) => {
          return await ctx.db.insert("members", createTestMember({
            email: `member${i}@example.com`,
            stripeCustomerId: `cus_admin_${i}`,
          }));
        });
        memberIds.push(memberId);
        
        // Create payment for each member
        await t.run(async (ctx) => {
          await ctx.db.insert("payments", {
            memberId,
            stripePaymentIntentId: `pi_admin_${i}`,
            amount: (i + 1) * 3900,
            currency: "usd",
            status: "succeeded",
            description: "Monthly payment",
            paymentMethod: {
              type: "card",
              brand: "visa",
              last4: `424${i}`,
            },
            transactionFee: Math.round((i + 1) * 3900 * 0.029 + 30),
            netAmount: (i + 1) * 3900 - Math.round((i + 1) * 3900 * 0.029 + 30),
            createdAt: Date.now() - i * 24 * 60 * 60 * 1000,
          });
        });
      }
      
      // Query all payments sorted by date
      const allPayments = await t.run(async (ctx) => {
        return await ctx.db
          .query("payments")
          .withIndex("by_createdAt")
          .order("desc")
          .collect();
      });
      
      expect(allPayments.length).toBeGreaterThanOrEqual(3);
      
      // Calculate totals
      const totalAmount = allPayments
        .filter(p => p.status === "succeeded")
        .reduce((sum, p) => sum + p.amount, 0);
      
      const totalFees = allPayments
        .filter(p => p.status === "succeeded" && p.transactionFee)
        .reduce((sum, p) => sum + (p.transactionFee || 0), 0);
      
      const totalNet = allPayments
        .filter(p => p.status === "succeeded" && p.netAmount)
        .reduce((sum, p) => sum + (p.netAmount || 0), 0);
      
      expect(totalAmount).toBeGreaterThan(0);
      expect(totalFees).toBeGreaterThan(0);
      expect(totalNet).toBe(totalAmount - totalFees);
    });

    test("should track payment metrics by tier", async () => {
      const t = convexTest(schema);
      
      const tiers = [
        { tier: "founding_member", amount: 3900 },
        { tier: "early_bird", amount: 5000 },
        { tier: "member", amount: 9900 },
      ];
      
      for (const { tier, amount } of tiers) {
        const memberId = await t.run(async (ctx) => {
          return await ctx.db.insert("members", createTestMember({
            email: `${tier}@example.com`,
            stripeCustomerId: `cus_${tier}_metrics`,
            tier: tier as "free" | "scholarship" | "founding_member" | "early_bird" | "member" | undefined,
          }));
        });
        
        // Create multiple payments for each tier
        for (let i = 0; i < 2; i++) {
          await t.run(async (ctx) => {
            await ctx.db.insert("payments", {
              memberId,
              stripePaymentIntentId: `pi_${tier}_${i}`,
              amount,
              currency: "usd",
              status: "succeeded",
              description: `${tier} subscription - monthly payment`,
              paymentMethod: {
                type: "card",
                last4: "4242",
              },
              createdAt: Date.now() - i * 30 * 24 * 60 * 60 * 1000,
            });
          });
        }
      }
      
      // Query payments and group by member tier
      const allPayments = await t.run(async (ctx) => {
        const payments = await ctx.db.query("payments").collect();
        const members = await ctx.db.query("members").collect();
        
        return payments.map(p => {
          const member = members.find(m => m._id === p.memberId);
          return { ...p, memberTier: member?.tier };
        });
      });
      
      // Calculate revenue by tier
      const revenueByTier = allPayments
        .filter(p => p.status === "succeeded")
        .reduce((acc, p) => {
          const tier = p.memberTier || "unknown";
          acc[tier] = (acc[tier] || 0) + p.amount;
          return acc;
        }, {} as Record<string, number>);
      
      expect(revenueByTier["founding_member"]).toBe(7800); // 2 * 3900
      expect(revenueByTier["early_bird"]).toBe(10000); // 2 * 5000
      expect(revenueByTier["member"]).toBe(19800); // 2 * 9900
    });
  });
});