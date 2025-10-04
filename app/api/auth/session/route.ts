import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "vai_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * POST /api/auth/session
 * Set session cookie with JWT token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken } = body;

    if (!sessionToken || typeof sessionToken !== "string") {
      return NextResponse.json(
        { error: "Session token is required" },
        { status: 400 }
      );
    }

    // Set HTTP-only, Secure, SameSite=Lax cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error setting session cookie:", error);
    return NextResponse.json(
      { error: "Failed to set session cookie" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Clear session cookie (sign out)
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting session cookie:", error);
    return NextResponse.json(
      { error: "Failed to delete session cookie" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/session
 * Get current session token (for debugging/testing)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(COOKIE_NAME);

    if (!sessionToken) {
      return NextResponse.json({ sessionToken: null }, { status: 200 });
    }

    // Don't return the actual token in production (security)
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ hasSession: true }, { status: 200 });
    }

    // In development, return token for debugging
    return NextResponse.json(
      {
        hasSession: true,
        sessionToken: sessionToken.value,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error getting session cookie:", error);
    return NextResponse.json(
      { error: "Failed to get session cookie" },
      { status: 500 }
    );
  }
}
