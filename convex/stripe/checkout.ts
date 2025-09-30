import { v } from "convex/values";
import Stripe from "stripe";
import { api } from "../_generated/api";
import { action, mutation } from "../_generated/server";
import { getStripePrice } from "./pricing";

// Lazily instantiate the Stripe client so Convex's module analyzer
// doesn't require the secret key at import-time.
let stripe: Stripe | null = null;
function getStripeClient(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY not set");
    }
    stripe = new Stripe(key);
  }
  return stripe;
}

// Internal mutation to get member data and update stripe customer ID
export const getMemberAndUpdateStripeCustomer = mutation({
  args: {
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .first();

    if (!member) {
      throw new Error("Member not found");
    }

    // Check if member already has an active subscription
    if (member.subscriptionStatus === "active") {
      throw new Error("Member already has an active subscription");
    }

    // Update member with real Stripe customer ID if provided
    if (args.stripeCustomerId) {
      await ctx.db.patch(member._id, {
        stripeCustomerId: args.stripeCustomerId,
      });
    }

    return member;
  },
});

export const createCheckoutSession = action({
  args: {
    tier: v.union(v.literal("founding_member"), v.literal("early_bird"), v.literal("member")),
    billingInterval: v.union(v.literal("monthly"), v.literal("yearly")),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Server-side price lookup
    const priceId = getStripePrice(args.tier, args.billingInterval);

    // Get member data from database
    const member = await ctx.runMutation(api.stripe.checkout.getMemberAndUpdateStripeCustomer, {});

    let stripeCustomerId = member.stripeCustomerId;

    const stripe = getStripeClient();

    // Create or retrieve Stripe customer
    if (!stripeCustomerId || stripeCustomerId.startsWith("cus_temp_")) {
      const customer = await stripe.customers.create({
        email: member.email,
        name: `${member.firstName} ${member.lastName}`,
        metadata: {
          convexMemberId: member._id,
        },
      });

      stripeCustomerId = customer.id;

      // Update member with real Stripe customer ID
      await ctx.runMutation(api.stripe.checkout.getMemberAndUpdateStripeCustomer, {
        stripeCustomerId: customer.id,
      });
    }

    // Build checkout session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/membership`,
      metadata: {
        memberId: member._id,
        tier: args.tier,
        billingInterval: args.billingInterval,
      },
      subscription_data: {
        metadata: {
          memberId: member._id,
          tier: args.tier,
          billingInterval: args.billingInterval,
        },
      },
      allow_promotion_codes: true,
    };

    // Apply coupon if provided
    if (args.couponCode) {
      sessionParams.discounts = [
        {
          coupon: args.couponCode,
        },
      ];

      // If using scholarship coupon, mark in metadata
      if (args.couponCode.toLowerCase().includes("scholarship")) {
        sessionParams.metadata!.isScholarship = "true";
        sessionParams.subscription_data!.metadata!.isScholarship = "true";
      }
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  },
});
