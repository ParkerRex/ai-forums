import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, forbiddenResponse } from "@/lib/auth";

// POST /api/admin/members/update-role - Update member role
export async function POST(request: NextRequest) {
	const admin = await requireAdmin();
	if (!admin) {
		return forbiddenResponse();
	}

	try {
		const body = await request.json();
		const { memberId, role } = body;

		if (!memberId || !role) {
			return NextResponse.json(
				{ error: "Missing memberId or role" },
				{ status: 400 },
			);
		}

		if (role !== "admin" && role !== "user") {
			return NextResponse.json(
				{ error: "Invalid role. Must be 'admin' or 'user'" },
				{ status: 400 },
			);
		}

		// Prevent admin from removing their own admin role
		if (memberId === admin.id && role === "user") {
			return NextResponse.json(
				{ error: "Cannot remove your own admin role" },
				{ status: 400 },
			);
		}

		// Update member role
		const [updated] = await db
			.update(members)
			.set({
				role,
				updatedAt: new Date(),
			})
			.where(eq(members.id, memberId))
			.returning();

		if (!updated) {
			return NextResponse.json(
				{ error: "Member not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			success: true,
			member: {
				...updated,
				_id: updated.id,
			},
		});
	} catch (error) {
		console.error("Admin update role error:", error);
		return NextResponse.json(
			{ error: "Failed to update member role" },
			{ status: 500 },
		);
	}
}
