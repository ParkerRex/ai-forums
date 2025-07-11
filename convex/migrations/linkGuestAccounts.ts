/**
 * Guest Account Linking Migration
 * 
 * This migration links guest members (created during direct checkout without authentication)
 * to their Clerk accounts when they sign up with the same email address.
 * 
 * The migration:
 * 1. Finds all members with an externalId (Clerk ID) 
 * 2. Checks if there's a guest member with the same email but no externalId
 * 3. Transfers subscription data from the guest member to the authenticated member
 * 4. Deactivates the guest member record to prevent duplicates
 * 
 * This ensures users who purchase as guests can later create an account and retain
 * their subscription status without needing to purchase again.
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Links guest members to authenticated members by email
 * 
 * Run this migration periodically or after user sign-ups to ensure
 * guest purchases are properly linked to authenticated accounts.
 * 
 * @returns Object with statistics about the migration results
 */
export const linkGuestAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stats = {
      processed: 0,
      linked: 0,
      errors: 0,
    };

    // Get all members with external IDs (authenticated via Clerk)
    const authenticatedMembers = await ctx.db
      .query("members")
      .filter((q) => q.neq(q.field("externalId"), undefined))
      .collect();

    for (const authMember of authenticatedMembers) {
      stats.processed++;
      
      // Check if there's a guest member with the same email
      const guestMember = await ctx.db
        .query("members")
        .filter((q) => 
          q.and(
            q.eq(q.field("email"), authMember.email),
            q.eq(q.field("externalId"), undefined),
            q.eq(q.field("status"), "active")
          )
        )
        .first();

      if (guestMember) {
        try {
          // Transfer subscription data from guest to authenticated member
          const updates: any = {};
          
          // Only update if guest has subscription data we don't have
          if (guestMember.stripeCustomerId && !authMember.stripeCustomerId) {
            updates.stripeCustomerId = guestMember.stripeCustomerId;
          }
          if (guestMember.stripeSubscriptionId && !authMember.stripeSubscriptionId) {
            updates.stripeSubscriptionId = guestMember.stripeSubscriptionId;
          }
          if (guestMember.tier && guestMember.tier !== "free" && (!authMember.tier || authMember.tier === "free")) {
            updates.tier = guestMember.tier;
          }
          if (guestMember.billingInterval && !authMember.billingInterval) {
            updates.billingInterval = guestMember.billingInterval;
          }
          if (guestMember.subscriptionStatus === "active" && authMember.subscriptionStatus !== "active") {
            updates.subscriptionStatus = guestMember.subscriptionStatus;
          }
          if (guestMember.lastPaymentDate && (!authMember.lastPaymentDate || guestMember.lastPaymentDate > authMember.lastPaymentDate)) {
            updates.lastPaymentDate = guestMember.lastPaymentDate;
          }

          // Update authenticated member if we have any updates
          if (Object.keys(updates).length > 0) {
            await ctx.db.patch(authMember._id, {
              ...updates,
              updatedAt: Date.now(),
            });

            // Deactivate guest member to prevent confusion
            await ctx.db.patch(guestMember._id, {
              status: "duplicate",
              updatedAt: Date.now(),
              // Add note about the linking
              bio: `[Linked to authenticated account ${authMember._id}] ${guestMember.bio || ""}`,
            });

            stats.linked++;
            
            console.log(`Linked guest member ${guestMember._id} to authenticated member ${authMember._id}`);
          }
        } catch (error) {
          console.error(`Error linking guest member ${guestMember._id}:`, error);
          stats.errors++;
        }
      }
    }

    return stats;
  },
});

/**
 * Link a specific guest account to an authenticated member
 * 
 * Used when a user signs up with Clerk and we need to immediately
 * link their guest purchase to their new account.
 * 
 * @param email - Email address to link
 * @param externalId - Clerk ID of the authenticated member
 */
export const linkSpecificGuestAccount = internalMutation({
  args: {
    email: v.string(),
    externalId: v.string(),
  },
  handler: async (ctx, { email, externalId }) => {
    // Find the authenticated member
    const authMember = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("externalId"), externalId))
      .first();

    if (!authMember) {
      throw new Error("Authenticated member not found");
    }

    // Find guest member with same email
    const guestMember = await ctx.db
      .query("members")
      .filter((q) => 
        q.and(
          q.eq(q.field("email"), email),
          q.eq(q.field("externalId"), undefined),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (!guestMember) {
      // No guest member to link
      return { linked: false };
    }

    // Transfer subscription data
    const updates: any = {};
    
    if (guestMember.stripeCustomerId) {
      updates.stripeCustomerId = guestMember.stripeCustomerId;
    }
    if (guestMember.stripeSubscriptionId) {
      updates.stripeSubscriptionId = guestMember.stripeSubscriptionId;
    }
    if (guestMember.tier && guestMember.tier !== "free") {
      updates.tier = guestMember.tier;
    }
    if (guestMember.billingInterval) {
      updates.billingInterval = guestMember.billingInterval;
    }
    if (guestMember.subscriptionStatus === "active") {
      updates.subscriptionStatus = guestMember.subscriptionStatus;
    }
    if (guestMember.lastPaymentDate) {
      updates.lastPaymentDate = guestMember.lastPaymentDate;
    }
    if (guestMember.amountCents) {
      updates.amountCents = guestMember.amountCents;
    }

    // Update authenticated member
    await ctx.db.patch(authMember._id, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Deactivate guest member
    await ctx.db.patch(guestMember._id, {
      status: "duplicate",
      updatedAt: Date.now(),
      bio: `[Linked to authenticated account ${authMember._id}] ${guestMember.bio || ""}`,
    });

    return { linked: true, guestMemberId: guestMember._id };
  },
});