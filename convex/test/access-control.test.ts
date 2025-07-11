import { expect, test, describe } from "vitest";
import { 
  canViewFullContent, 
  needsSubscriptionUpgrade, 
  getSubscriptionStatusMessage 
} from "../helpers/access";
import { Doc, Id } from "../_generated/dataModel";

// Helper function to create a mock member
function createMockMember(overrides: Partial<Doc<"members">>): Doc<"members"> {
  return {
    _id: "member123" as Id<"members">,
    _creationTime: Date.now(),
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    status: "active",
    joinedDate: Date.now(),
    joinedAt: Date.now(),
    tier: "free",
    subscriptionStatus: "none",
    stripeCustomerId: "cus_test",
    ...overrides,
  } as Doc<"members">;
}

describe("canViewFullContent", () => {
  test("should return false for null/undefined member", () => {
    expect(canViewFullContent(null)).toBe(false);
    expect(canViewFullContent(undefined)).toBe(false);
  });

  test("should return false for free tier members", () => {
    const freeMember = createMockMember({
      tier: "free",
      subscriptionStatus: "none",
    });
    expect(canViewFullContent(freeMember)).toBe(false);
  });

  test("should return true for active scholarship members", () => {
    const scholarshipMember = createMockMember({
      tier: "scholarship",
      subscriptionStatus: "active",
    });
    expect(canViewFullContent(scholarshipMember)).toBe(true);
  });

  test("should return true for all active paid tiers", () => {
    const paidTiers: Array<"founding_member" | "early_bird" | "member"> = [
      "founding_member",
      "early_bird",
      "member",
    ];

    for (const tier of paidTiers) {
      const member = createMockMember({
        tier,
        subscriptionStatus: "active",
      });
      expect(canViewFullContent(member)).toBe(true);
    }
  });

  test("should return false for past_due subscriptions", () => {
    const pastDueMember = createMockMember({
      tier: "member",
      subscriptionStatus: "past_due",
    });
    expect(canViewFullContent(pastDueMember)).toBe(false);
  });

  test("should return false for expired subscriptions", () => {
    const expiredMember = createMockMember({
      tier: "member",
      subscriptionStatus: "expired",
    });
    expect(canViewFullContent(expiredMember)).toBe(false);
  });

  describe("cancelled subscriptions with grace period", () => {
    test("should return true when within grace period", () => {
      const cancelledMember = createMockMember({
        tier: "member",
        subscriptionStatus: "cancelled",
        subscriptionEndDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      });
      expect(canViewFullContent(cancelledMember)).toBe(true);
    });

    test("should return false when grace period has expired", () => {
      const cancelledMember = createMockMember({
        tier: "member",
        subscriptionStatus: "cancelled",
        subscriptionEndDate: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
      });
      expect(canViewFullContent(cancelledMember)).toBe(false);
    });

    test("should return false for cancelled without end date", () => {
      const cancelledMember = createMockMember({
        tier: "member",
        subscriptionStatus: "cancelled",
        subscriptionEndDate: undefined,
      });
      expect(canViewFullContent(cancelledMember)).toBe(false);
    });

    test("should handle edge case of end date exactly at current time", () => {
      const now = Date.now();
      const cancelledMember = createMockMember({
        tier: "member",
        subscriptionStatus: "cancelled",
        subscriptionEndDate: now,
      });
      // Should return false as the grace period has just ended
      expect(canViewFullContent(cancelledMember)).toBe(false);
    });
  });
});

describe("needsSubscriptionUpgrade", () => {
  test("should return true for null/undefined member", () => {
    expect(needsSubscriptionUpgrade(null)).toBe(true);
    expect(needsSubscriptionUpgrade(undefined)).toBe(true);
  });

  test("should return true for free tier members", () => {
    const freeMember = createMockMember({
      tier: "free",
      subscriptionStatus: "none",
    });
    expect(needsSubscriptionUpgrade(freeMember)).toBe(true);
  });

  test("should return false for active paid subscriptions", () => {
    const paidTiers: Array<"founding_member" | "early_bird" | "member"> = [
      "founding_member",
      "early_bird",
      "member",
    ];

    for (const tier of paidTiers) {
      const member = createMockMember({
        tier,
        subscriptionStatus: "active",
      });
      expect(needsSubscriptionUpgrade(member)).toBe(false);
    }
  });

  test("should return false for active scholarship members", () => {
    const scholarshipMember = createMockMember({
      tier: "scholarship",
      subscriptionStatus: "active",
    });
    expect(needsSubscriptionUpgrade(scholarshipMember)).toBe(false);
  });

  test("should return true for past_due subscriptions", () => {
    const pastDueMember = createMockMember({
      tier: "member",
      subscriptionStatus: "past_due",
    });
    expect(needsSubscriptionUpgrade(pastDueMember)).toBe(true);
  });

  test("should return true for expired subscriptions", () => {
    const expiredMember = createMockMember({
      tier: "member",
      subscriptionStatus: "expired",
    });
    expect(needsSubscriptionUpgrade(expiredMember)).toBe(true);
  });

  describe("cancelled subscriptions upgrade logic", () => {
    test("should return false when within grace period", () => {
      const cancelledMember = createMockMember({
        tier: "member",
        subscriptionStatus: "cancelled",
        subscriptionEndDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      });
      expect(needsSubscriptionUpgrade(cancelledMember)).toBe(false);
    });

    test("should return true when grace period has expired", () => {
      const cancelledMember = createMockMember({
        tier: "member",
        subscriptionStatus: "cancelled",
        subscriptionEndDate: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
      });
      expect(needsSubscriptionUpgrade(cancelledMember)).toBe(true);
    });

    test("should return true for cancelled without end date", () => {
      const cancelledMember = createMockMember({
        tier: "member",
        subscriptionStatus: "cancelled",
        subscriptionEndDate: undefined,
      });
      expect(needsSubscriptionUpgrade(cancelledMember)).toBe(true);
    });
  });

  test("needsSubscriptionUpgrade should be inverse of canViewFullContent", () => {
    const testCases = [
      createMockMember({ tier: "free", subscriptionStatus: "none" }),
      createMockMember({ tier: "member", subscriptionStatus: "active" }),
      createMockMember({ tier: "scholarship", subscriptionStatus: "active" }),
      createMockMember({ tier: "member", subscriptionStatus: "past_due" }),
      createMockMember({ 
        tier: "member", 
        subscriptionStatus: "cancelled",
        subscriptionEndDate: Date.now() + 1000000,
      }),
      createMockMember({ 
        tier: "member", 
        subscriptionStatus: "cancelled",
        subscriptionEndDate: Date.now() - 1000000,
      }),
    ];

    for (const member of testCases) {
      // These functions should have opposite results for authenticated users
      expect(canViewFullContent(member)).toBe(!needsSubscriptionUpgrade(member));
    }
  });
});

describe("getSubscriptionStatusMessage", () => {
  test("should show upgrade message for free tier", () => {
    const freeMember = createMockMember({
      tier: "free",
      subscriptionStatus: "none",
    });
    expect(getSubscriptionStatusMessage(freeMember)).toBe(
      "Free tier - Upgrade to access full content"
    );
  });

  test("should show scholarship message", () => {
    const scholarshipMember = createMockMember({
      tier: "scholarship",
      subscriptionStatus: "active",
    });
    expect(getSubscriptionStatusMessage(scholarshipMember)).toBe(
      "Scholarship member - Full access"
    );
  });

  test("should format tier names correctly for active subscriptions", () => {
    const testCases = [
      { tier: "founding_member", expected: "Active founding member subscription" },
      { tier: "early_bird", expected: "Active early bird subscription" },
      { tier: "member", expected: "Active member subscription" },
    ];

    for (const { tier, expected } of testCases) {
      const member = createMockMember({
        tier: tier as "founding_member" | "early_bird" | "member",
        subscriptionStatus: "active",
      });
      expect(getSubscriptionStatusMessage(member)).toBe(expected);
    }
  });

  describe("cancelled subscription messages", () => {
    test("should show days remaining when in grace period", () => {
      const testCases = [
        { daysFromNow: 1, expected: "Subscription ends in 1 day" },
        { daysFromNow: 3, expected: "Subscription ends in 3 days" },
        { daysFromNow: 7, expected: "Subscription ends in 7 days" },
        { daysFromNow: 30, expected: "Subscription ends in 30 days" },
      ];

      for (const { daysFromNow, expected } of testCases) {
        const member = createMockMember({
          tier: "member",
          subscriptionStatus: "cancelled",
          subscriptionEndDate: Date.now() + daysFromNow * 24 * 60 * 60 * 1000,
        });
        expect(getSubscriptionStatusMessage(member)).toBe(expected);
      }
    });

    test("should show expired message when grace period ended", () => {
      const member = createMockMember({
        tier: "member",
        subscriptionStatus: "cancelled",
        subscriptionEndDate: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
      });
      expect(getSubscriptionStatusMessage(member)).toBe(
        "Subscription expired - Renew to continue access"
      );
    });

    test("should handle less than 24 hours remaining", () => {
      const member = createMockMember({
        tier: "member",
        subscriptionStatus: "cancelled",
        subscriptionEndDate: Date.now() + 12 * 60 * 60 * 1000, // 12 hours from now
      });
      // Should round up to 1 day
      expect(getSubscriptionStatusMessage(member)).toBe(
        "Subscription ends in 1 day"
      );
    });

    test("should handle cancelled without end date", () => {
      const member = createMockMember({
        tier: "member",
        subscriptionStatus: "cancelled",
        subscriptionEndDate: undefined,
      });
      expect(getSubscriptionStatusMessage(member)).toBe(
        "Subscription expired - Renew to continue access"
      );
    });
  });

  test("should show past due message", () => {
    const pastDueMember = createMockMember({
      tier: "member",
      subscriptionStatus: "past_due",
    });
    expect(getSubscriptionStatusMessage(pastDueMember)).toBe(
      "Payment past due - Update payment method to continue access"
    );
  });

  test("should show expired message for expired status", () => {
    const expiredMember = createMockMember({
      tier: "member",
      subscriptionStatus: "expired",
    });
    expect(getSubscriptionStatusMessage(expiredMember)).toBe(
      "Subscription expired - Renew to continue access"
    );
  });

  test("should handle missing subscription status", () => {
    const member = createMockMember({
      tier: "member",
      subscriptionStatus: undefined,
    });
    expect(getSubscriptionStatusMessage(member)).toBe(
      "Free tier - Upgrade to access full content"
    );
  });
});