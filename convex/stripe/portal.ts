import Stripe from "stripe";
import { mutation } from "../_generated/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const createPortalSession = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const member = await ctx.db
      .query("members")
      // Use Clerk `subject` (e.g., "user_abc123") which is what we persist in `externalId`.
      // identity.tokenIdentifier may contain a provider prefix and fail to match.
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .first();

    if (!member) {
      throw new Error("Member not found");
    }

    if (!member.stripeCustomerId || member.stripeCustomerId.startsWith("cus_temp_")) {
      throw new Error("No Stripe customer found for this member");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: member.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    return {
      portalUrl: session.url,
    };
  },
});
