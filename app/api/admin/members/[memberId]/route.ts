import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, posts, comments } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { requireAdmin, forbiddenResponse } from "@/lib/auth";

type RouteParams = { params: Promise<{ memberId: string }> };

// GET /api/admin/members/[memberId] - Get detailed member info for admin
export async function GET(request: NextRequest, { params }: RouteParams) {
	const admin = await requireAdmin();
	if (!admin) {
		return forbiddenResponse();
	}

	try {
		const { memberId } = await params;

		// Get member details
		const member = await db.query.members.findFirst({
			where: eq(members.id, memberId),
		});

		if (!member) {
			return NextResponse.json(
				{ error: "Member not found" },
				{ status: 404 },
			);
		}

		// Get recent posts
		const recentPosts = await db
			.select({
				_id: posts.id,
				title: posts.title,
				slug: posts.slug,
				createdAt: posts.createdAt,
			})
			.from(posts)
			.where(eq(posts.memberId, memberId))
			.orderBy(desc(posts.createdAt))
			.limit(5);

		// Get recent comments
		const recentComments = await db
			.select({
				_id: comments.id,
				content: comments.content,
				createdAt: comments.createdAt,
			})
			.from(comments)
			.where(eq(comments.memberId, memberId))
			.orderBy(desc(comments.createdAt))
			.limit(5);

		// Format response
		const response = {
			member: {
				...member,
				_id: member.id,
				joinedDate: member.joinedDate ? new Date(member.joinedDate).getTime() : null,
				lastOnline: member.lastOnline ? new Date(member.lastOnline).getTime() : null,
			},
			status: member.status || "active",
			subscription: null, // Would need subscriptions table
			payments: [], // Would need payments table
			activity: {
				posts: recentPosts.map((p) => ({
					_id: p._id,
					title: p.title,
					slug: p.slug,
					createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
				})),
				comments: recentComments.map((c) => ({
					_id: c._id,
					content: c.content,
					createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
				})),
				postCount: member.postCount,
				commentCount: member.commentCount,
			},
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Admin get member details error:", error);
		return NextResponse.json(
			{ error: "Failed to get member details" },
			{ status: 500 },
		);
	}
}

// PATCH /api/admin/members/[memberId] - Update member (role, status, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const admin = await requireAdmin();
	if (!admin) {
		return forbiddenResponse();
	}

	try {
		const { memberId } = await params;
		const body = await request.json();
		const { role, status } = body;

		// Build update object
		const updates: Partial<typeof members.$inferInsert> = {
			updatedAt: new Date(),
		};

		if (role && (role === "admin" || role === "user")) {
			updates.role = role;
		}

		if (status && ["active", "cancelled", "churned", "duplicate"].includes(status)) {
			updates.status = status;
		}

		// Update member
		const [updated] = await db
			.update(members)
			.set(updates)
			.where(eq(members.id, memberId))
			.returning();

		if (!updated) {
			return NextResponse.json(
				{ error: "Member not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			...updated,
			_id: updated.id,
		});
	} catch (error) {
		console.error("Admin update member error:", error);
		return NextResponse.json(
			{ error: "Failed to update member" },
			{ status: 500 },
		);
	}
}
