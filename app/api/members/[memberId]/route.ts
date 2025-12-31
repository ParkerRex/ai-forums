import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";

const updateMemberSchema = z.object({
	firstName: z.string().min(1).max(100).optional(),
	lastName: z.string().min(1).max(100).optional(),
	bio: z.string().max(2000).optional(),
	country: z.string().max(100).optional(),
	location: z.string().max(255).optional(),
	websiteUrl: z.string().url().optional().or(z.literal("")),
	linkedinUrl: z.string().url().optional().or(z.literal("")),
	linkGithub: z.string().optional(),
	linkX: z.string().optional(),
	linkYouTube: z.string().optional(),
	skills: z.array(z.string()).optional(),
	avatarUrl: z.string().url().optional(),
});

type RouteParams = {
	params: Promise<{ memberId: string }>;
};

// GET /api/members/[memberId] - Get a single member
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { memberId } = await params;

		// Support both ID and slug lookup
		const member = await db.query.members.findFirst({
			where: or(eq(members.id, memberId), eq(members.slug, memberId)),
		});

		if (!member) {
			return NextResponse.json({ error: "Member not found" }, { status: 404 });
		}

		// Return without sensitive data
		const { passwordHash: _, ...safeMember } = member;

		return NextResponse.json(safeMember);
	} catch (error) {
		console.error("Get member error:", error);
		return NextResponse.json(
			{ error: "Failed to get member" },
			{ status: 500 },
		);
	}
}

// PATCH /api/members/[memberId] - Update a member
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		const currentMember = await getCurrentMember();
		if (!currentMember) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { memberId } = await params;
		const body = await request.json();
		const parsed = updateMemberSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		// Check ownership or admin
		if (currentMember.id !== memberId && currentMember.role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		// Only include non-undefined values
		for (const [key, value] of Object.entries(parsed.data)) {
			if (value !== undefined) {
				updateData[key] = value === "" ? null : value;
			}
		}

		const [updatedMember] = await db
			.update(members)
			.set(updateData)
			.where(eq(members.id, memberId))
			.returning();

		if (!updatedMember) {
			return NextResponse.json({ error: "Member not found" }, { status: 404 });
		}

		// Return without sensitive data
		const { passwordHash: _, ...safeMember } = updatedMember;

		return NextResponse.json(safeMember);
	} catch (error) {
		console.error("Update member error:", error);
		return NextResponse.json(
			{ error: "Failed to update member" },
			{ status: 500 },
		);
	}
}
