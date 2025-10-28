/**
 * @fileoverview Payment System Module - Stripe integration for customer and subscription management
 *
 * This module provides Stripe integration functionality including:
 * - Stripe customer creation and management
 * - Subscription handling
 * - Payment processing
 *
 * @author VAI Development Team
 * @version 1.0.0
 */

import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import Stripe from "stripe";

/**
 * Internal action to create a Stripe customer and update the member record
 *
 * This action creates a real Stripe customer record and updates the member's
 * stripeCustomerId field. It's scheduled asynchronously after member creation
 * to avoid blocking the signup/authentication flow.
 *
 * If Stripe API call fails, the temporary customer ID remains in place and
 * can be updated later when Stripe becomes available.
 *
 * @param memberId - The member's database ID
 * @param email - Customer's email address
 * @param firstName - Customer's first name
 * @param lastName - Customer's last name
 */
export const createAndUpdateStripeCustomer = internalAction({
  args: {
    memberId: v.id("members"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { memberId, email, firstName, lastName }) => {
    // Get Stripe secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error("[Stripe] STRIPE_SECRET_KEY not configured in environment");
      return null;
    }

    try {
      // Initialize Stripe client
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2024-11-20.acacia",
      });

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: email.toLowerCase(),
        name: `${firstName} ${lastName}`.trim(),
        metadata: {
          source: "vai-community",
          createdAt: new Date().toISOString(),
          memberId: memberId,
        },
      });

      console.log(`[Stripe] Created customer ${customer.id} for ${email} (memberId: ${memberId})`);

      // Update the member record with the real Stripe customer ID
      await ctx.runMutation(internal.payments.updateMemberStripeCustomerId, {
        memberId,
        stripeCustomerId: customer.id,
      });

      console.log(`[Stripe] Updated member ${memberId} with customer ID ${customer.id}`);
    } catch (error) {
      console.error(
        `[Stripe] Failed to create customer for ${email} (memberId: ${memberId}):`,
        error,
      );
      // Don't throw - just log the error. The temporary ID will remain in place.
      // This prevents signup failures due to Stripe issues.
    }

    return null;
  },
});

/**
 * Internal mutation to update a member's Stripe customer ID
 *
 * This is called by the createAndUpdateStripeCustomer action after successfully
 * creating a Stripe customer.
 */
export const updateMemberStripeCustomerId = internalMutation({
  args: {
    memberId: v.id("members"),
    stripeCustomerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { memberId, stripeCustomerId }) => {
    await ctx.db.patch(memberId, {
      stripeCustomerId,
      updatedAt: Date.now(),
    });

    return null;
  },
});
