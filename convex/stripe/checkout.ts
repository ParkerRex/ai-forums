import { v } from "convex/values";
import { mutation } from "../_generated/server";
import Stripe from "stripe";

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

export const createCheckoutSession = mutation({
  args: {
    priceId: v.string(),
    tier: v.union(
      v.literal("founding_member"),
      v.literal("early_bird"),
      v.literal("member")
    ),
    billingInterval: v.union(
      v.literal("monthly"),
      v.literal("yearly")
    ),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get the current member
    const member = await ctx.db
      .query("members")
      // NOTE: We store Clerk's `subject` (e.g. "user_abc123") in the `externalId` field.
      // identity.tokenIdentifier can include a prefix (e.g. "clerk:user_abc123"), which
      // will not match existing records. We therefore query by `subject` to ensure a match.
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .first();

    if (!member) {
      throw new Error("Member not found");
    }

    // Check if member already has an active subscription
    if (member.subscriptionStatus === "active") {
      throw new Error("Member already has an active subscription");
    }

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
      await ctx.db.patch(member._id, {
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
          price: args.priceId,
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
      if (args.couponCode.toLowerCase().includes('scholarship')) {
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

