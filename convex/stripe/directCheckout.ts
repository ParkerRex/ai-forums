/**
 * Direct Stripe Checkout Module - Simplified checkout for unauthenticated users
 * 
 * This module provides a streamlined checkout experience that doesn't require
 * authentication. Users can purchase directly through Stripe, and accounts are
 * created automatically after successful payment.
 * 
 * Key features:
 * - No authentication required before purchase
 * - Email collection handled by Stripe
 * - Automatic member creation on successful payment
 * - Support for metadata to track source content
 * 
 * @module stripe/directCheckout
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Creates a direct checkout session for unauthenticated users
 * 
 * This action bypasses authentication requirements and creates a Stripe
 * checkout session directly. The user's email is collected by Stripe,
 * and a member account is created automatically upon successful payment.
 * 
 * @param email - Optional email to prefill in checkout
 * @param sourcePostId - Optional post ID that triggered the checkout
 * @returns Object containing the checkout URL and session ID
 * 
 * @example
 * ```typescript
 * const { url } = await createDirectCheckout({
 *   email: "user@example.com",
 *   sourcePostId: "post123"
 * });
 * window.location.href = url; // Redirect to Stripe
 * ```
 */
export const createDirectCheckout = action({
  args: {
    email: v.optional(v.string()),
    sourcePostId: v.optional(v.string()),
  },
  handler: async (ctx, { email, sourcePostId }) => {
    try {
      // Get the monthly price ID from environment
      const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
      if (!priceId) {
        throw new Error("Stripe price ID not configured");
      }

      // Create metadata for tracking
      const metadata: Record<string, string> = {
        checkoutType: "direct",
        timestamp: Date.now().toString(),
      };
      
      if (sourcePostId) {
        metadata.sourcePostId = sourcePostId;
      }

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        // Allow promotion codes for special offers
        allow_promotion_codes: true,
        // Collect billing address for tax compliance
        billing_address_collection: "required",
        // Prefill email if provided
        customer_email: email,
        // Store metadata for webhook processing
        metadata,
        // Subscription data
        subscription_data: {
          metadata,
        },
      });

      if (!session.url) {
        throw new Error("Failed to create checkout session");
      }

      return {
        url: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      console.error("Direct checkout error:", error);
      throw new Error("Failed to create checkout session");
    }
  },
});

/**
 * Creates a direct checkout session with yearly billing
 * 
 * Same as createDirectCheckout but uses the yearly price for users
 * who prefer annual billing with discount.
 */
export const createDirectCheckoutYearly = action({
  args: {
    email: v.optional(v.string()),
    sourcePostId: v.optional(v.string()),
  },
  handler: async (ctx, { email, sourcePostId }) => {
    try {
      // Get the yearly price ID from environment
      const priceId = process.env.STRIPE_PRICE_ID_YEARLY;
      if (!priceId) {
        throw new Error("Stripe yearly price ID not configured");
      }

      // Create metadata for tracking
      const metadata: Record<string, string> = {
        checkoutType: "direct",
        billingInterval: "yearly",
        timestamp: Date.now().toString(),
      };
      
      if (sourcePostId) {
        metadata.sourcePostId = sourcePostId;
      }

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        allow_promotion_codes: true,
        billing_address_collection: "required",
        customer_email: email,
        metadata,
        subscription_data: {
          metadata,
        },
      });

      if (!session.url) {
        throw new Error("Failed to create checkout session");
      }

      return {
        url: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      console.error("Direct checkout yearly error:", error);
      throw new Error("Failed to create checkout session");
    }
  },
});