import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
	hashPassword,
	validatePasswordStrength,
	createSession,
} from "@/lib/auth";

const registerSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	firstName: z.string().min(1, "First name is required").max(100),
	lastName: z.string().min(1, "Last name is required").max(100),
});

function generateSlug(firstName: string, lastName: string): string {
	const base = `${firstName}-${lastName}`
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	const suffix = Math.random().toString(36).substring(2, 6);
	return `${base}-${suffix}`;
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsed = registerSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const { email, password, firstName, lastName } = parsed.data;

		// Validate password strength
		const passwordValidation = validatePasswordStrength(password);
		if (!passwordValidation.valid) {
			return NextResponse.json(
				{ error: "Password too weak", details: passwordValidation.errors },
				{ status: 400 },
			);
		}

		// Check if email already exists
		const existingMember = await db.query.members.findFirst({
			where: eq(members.email, email.toLowerCase()),
		});

		if (existingMember) {
			return NextResponse.json(
				{ error: "Email already registered" },
				{ status: 409 },
			);
		}

		// Hash password
		const passwordHash = await hashPassword(password);

		// Generate unique slug
		const slug = generateSlug(firstName, lastName);

		// Create member
		const [newMember] = await db
			.insert(members)
			.values({
				email: email.toLowerCase(),
				passwordHash,
				firstName,
				lastName,
				slug,
				authMethod: "password",
				status: "active",
				role: "user",
			})
			.returning();

		// Create session
		await createSession(newMember.id, request);

		// Return user without sensitive data
		const { passwordHash: _, ...safeUser } = newMember;

		return NextResponse.json({ user: safeUser }, { status: 201 });
	} catch (error) {
		console.error("Registration error:", error);
		return NextResponse.json(
			{ error: "Registration failed" },
			{ status: 500 },
		);
	}
}
