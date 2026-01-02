import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentMember } from "@/lib/auth";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-12-15.clover",
  });
}

// Pricing configuration
const PRICING = {
  member: {
    monthly: {
      priceId: process.env.STRIPE_MEMBER_MONTHLY_PRICE_ID,
      amount: 9900, // $99
    },
    yearly: {
      priceId: process.env.STRIPE_MEMBER_YEARLY_PRICE_ID,
      amount: 99000, // $990
    },
  },
} as const;

/**
 * POST /api/stripe/checkout
 * Create a Stripe checkout session
 */
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const tier = (body.tier ?? "member") as keyof typeof PRICING;
    const billingInterval = (body.billingInterval ?? "yearly") as "monthly" | "yearly";

    // Validate tier and billing interval
    if (tier !== "member") {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    if (billingInterval !== "monthly" && billingInterval !== "yearly") {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }

    const pricing = PRICING[tier][billingInterval];

    // Create checkout session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: pricing.priceId,
          quantity: 1,
        },
      ],
      customer_email: member.email,
      metadata: {
        memberId: member.id,
        tier,
        billingInterval,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
