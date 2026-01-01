import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentMember } from "@/lib/auth";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-08-27.basil",
  });
}

/**
 * POST /api/stripe/direct-checkout
 * Create a quick checkout session directly from paywall
 */
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sourcePostId } = body;

    // Default to yearly member pricing for paywall conversions
    const priceId = process.env.STRIPE_MEMBER_YEARLY_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 });
    }

    // Create checkout session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: member.email,
      metadata: {
        memberId: member.id,
        tier: "member",
        billingInterval: "yearly",
        sourcePostId: sourcePostId || "",
        source: "paywall",
      },
      success_url: sourcePostId
        ? `${process.env.NEXT_PUBLIC_APP_URL}/membership/success?session_id={CHECKOUT_SESSION_ID}&redirect_post=${sourcePostId}`
        : `${process.env.NEXT_PUBLIC_APP_URL}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe direct checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
