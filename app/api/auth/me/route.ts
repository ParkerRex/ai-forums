import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";

export async function GET() {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Return user without sensitive data
    const { passwordHash: _, ...safeUser } = member;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
  }
}
