import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Test function to simulate post-migration state for reactivation testing
 * This sets a member to expired status to test the reactivation banners
 */
export const simulatePostMigrationState = mutation({
  args: {
    email: v.string(),
    tier: v.optional(v.union(
      v.literal("founding_member"),
      v.literal("early_bird"), 
      v.literal("member")
    )),
  },
  handler: async (ctx, args) => {
    // Find member by email
    const member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    
    if (!member) {
      throw new Error(`Member with email ${args.email} not found`);
    }
    
    // Set to post-migration state: expired subscription, keep original tier
    const updates = {
      subscriptionStatus: "expired" as const,
      subscriptionEndDate: undefined,
      stripeSubscriptionId: undefined,
      tier: args.tier || member.tier || "early_bird" as const,
      updatedAt: Date.now(),
    };
    
    await ctx.db.patch(member._id, updates);
    
    return {
      success: true,
      memberId: member._id,
      email: member.email,
      previousState: {
        subscriptionStatus: member.subscriptionStatus,
        tier: member.tier,
      },
      newState: updates,
    };
  },
});

/**
 * Reset member back to active state for testing
 */
export const resetToActiveState = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!member) {
      throw new Error(`Member with email ${args.email} not found`);
    }

    const updates = {
      subscriptionStatus: "active" as const,
      tier: "member" as const, // Reset to scholarship for testing
      amountCents: 0,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(member._id, updates);

    return {
      success: true,
      memberId: member._id,
      email: member.email,
      newState: updates,
    };
  },
});

/**
 * Migrate all members to post-migration state:
 * 1. Move scholarship members to early_bird tier
 * 2. Set all members (except active) to expired status
 * 3. Eliminate free tier
 */
export const migrateAllMembers = mutation({
  args: {},
  handler: async (ctx) => {
    const allMembers = await ctx.db.query("members").collect();
    const updates = [];

    const initialScholarshipCount = allMembers.filter(m => m.amountCents === 0 && m.tier).length;
    const initialFreeCount = allMembers.filter(m => !m.tier).length;

    for (const member of allMembers) {
      let newTier = member.tier;
      let newStatus = member.subscriptionStatus;

      // MIGRATION: Move scholarship members to early_bird (scholarships now handled via Stripe coupons)
      if (member.amountCents === 0 && member.tier) {
        newTier = "early_bird";
        newStatus = "expired"; // They'll need to reactivate with coupon
      }

      // MIGRATION: Eliminate free tier - move to member tier (no free tier - platform operates with zero free users)
      if (!member.tier) {
        newTier = "member";
        newStatus = "expired";
      }

      // Set non-active members to expired (post-migration state)
      if (member.subscriptionStatus !== "active") {
        newStatus = "expired";
      }

      const memberUpdates = {
        tier: newTier,
        subscriptionStatus: newStatus,
        subscriptionEndDate: undefined,
        stripeSubscriptionId: undefined,
        updatedAt: Date.now(),
      };

      await ctx.db.patch(member._id, memberUpdates);

      updates.push({
        email: member.email,
        previousTier: member.tier,
        newTier: newTier,
        previousStatus: member.subscriptionStatus,
        newStatus: newStatus,
      });
    }

    return {
      success: true,
      totalUpdated: updates.length,
      scholarshipsMovedToEarlyBird: initialScholarshipCount,
      freeMovedToMember: initialFreeCount,
      updates: updates.slice(0, 10),
    };
  },
});
