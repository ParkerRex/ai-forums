import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { members } from "@/db/schema";

const GUEST_SESSION_COOKIE = "guest-session";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-08-27.basil",
  });
}

function signPayload(payload: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }

  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeGuestSession(session: { email: string; memberId: string; expiresAt: number }): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

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
    const stripe = getStripe();
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

    // Verify the member exists in the database
    const member = await db.select().from(members).where(eq(members.email, email)).limit(1);

    if (!member || member.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Set a secure HTTP-only cookie with the guest session
    const cookieStore = await cookies();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const cookieValue = encodeGuestSession({
      email,
      memberId: member[0].id,
      expiresAt,
    });

    cookieStore.set({
      name: GUEST_SESSION_COOKIE,
      value: cookieValue,
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
  cookieStore.delete(GUEST_SESSION_COOKIE);

  return NextResponse.json({ success: true });
}
