import { NextResponse } from "next/server";
import { getCurrentMember, type SessionMember } from "./session";

/**
 * Get current member and verify they are an admin
 * Returns null if not authenticated or not an admin
 */
export async function requireAdmin(): Promise<SessionMember | null> {
	const member = await getCurrentMember();
	if (!member || member.role !== "admin") {
		return null;
	}
	return member;
}

/**
 * Helper to return 403 Forbidden response for non-admins
 */
export function forbiddenResponse() {
	return NextResponse.json(
		{ error: "Forbidden: Admin access required" },
		{ status: 403 },
	);
}

/**
 * Helper to return 401 Unauthorized response
 */
export function unauthorizedResponse() {
	return NextResponse.json(
		{ error: "Unauthorized" },
		{ status: 401 },
	);
}
