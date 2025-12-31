import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword, createSession } from "@/lib/auth";

const loginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsed = loginSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const { email, password } = parsed.data;

		// Find member by email
		const member = await db.query.members.findFirst({
			where: eq(members.email, email.toLowerCase()),
		});

		if (!member) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}

		// Check if member has a password (might be OAuth-only)
		if (!member.passwordHash) {
			return NextResponse.json(
				{ error: "Please use social login for this account" },
				{ status: 401 },
			);
		}

		// Verify password
		const isValid = await verifyPassword(password, member.passwordHash);

		if (!isValid) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}

		// Check if account is active
		if (member.status !== "active") {
			return NextResponse.json(
				{ error: "Account is not active" },
				{ status: 403 },
			);
		}

		// Create session
		await createSession(member.id, request);

		// Update last online
		await db
			.update(members)
			.set({ lastOnline: new Date(), updatedAt: new Date() })
			.where(eq(members.id, member.id));

		// Return user without sensitive data
		const { passwordHash: _, ...safeUser } = member;

		return NextResponse.json({ user: safeUser });
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json({ error: "Login failed" }, { status: 500 });
	}
}
