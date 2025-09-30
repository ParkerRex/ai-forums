import { ConvexHttpClient } from "convex/browser";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * API endpoint to set a guest session after successful checkout
 * This allows guest members to access their purchased content without signing up
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Verify the session with Stripe and get the guest member's email
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Invalid session or payment not completed" },
        { status: 400 },
      );
    }

    // Get email from customer_details or customer_email
    const email = session.customer_details?.email || session.customer_email;

    if (!email) {
      return NextResponse.json({ error: "No email found in session" }, { status: 400 });
    }

    // Verify the member exists in Convex
    const member = await convex.query(api.members.getMemberByEmail, { email });

    if (!member || !member.stripeCustomerId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Set a secure HTTP-only cookie with the guest session
    const cookieStore = await cookies();
    cookieStore.set({
      name: "guest-session",
      value: JSON.stringify({
        email,
        memberId: member._id,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: "/",
    });

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error("Error setting guest session:", error);
    return NextResponse.json({ error: "Failed to set guest session" }, { status: 500 });
  }
}

/**
 * API endpoint to clear guest session (when user signs up)
 */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("guest-session");

  return NextResponse.json({ success: true });
}
