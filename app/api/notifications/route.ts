import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, members } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";

const markReadSchema = z.object({
	notificationIds: z.array(z.string().uuid()).optional(),
	markAll: z.boolean().optional(),
});

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = request.nextUrl;
		const unreadOnly = searchParams.get("unread") === "true";
		const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

		let conditions = [eq(notifications.recipientId, member.id)];
		if (unreadOnly) {
			conditions.push(eq(notifications.read, false));
		}

		const result = await db
			.select({
				notification: notifications,
				actor: {
					id: members.id,
					firstName: members.firstName,
					lastName: members.lastName,
					slug: members.slug,
					avatarUrl: members.avatarUrl,
				},
			})
			.from(notifications)
			.leftJoin(members, eq(notifications.actorId, members.id))
			.where(and(...conditions))
			.orderBy(desc(notifications.createdAt))
			.limit(limit);

		// Get unread count
		const unreadCount = await db
			.select({ count: sql<number>`count(*)` })
			.from(notifications)
			.where(
				and(
					eq(notifications.recipientId, member.id),
					eq(notifications.read, false),
				),
			);

		return NextResponse.json({
			items: result.map((row) => ({
				...row.notification,
				actor: row.actor,
			})),
			unreadCount: Number(unreadCount[0]?.count || 0),
		});
	} catch (error) {
		console.error("Get notifications error:", error);
		return NextResponse.json(
			{ error: "Failed to get notifications" },
			{ status: 500 },
		);
	}
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const parsed = markReadSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const { notificationIds, markAll } = parsed.data;

		if (markAll) {
			await db
				.update(notifications)
				.set({ read: true })
				.where(eq(notifications.recipientId, member.id));
		} else if (notificationIds && notificationIds.length > 0) {
			for (const id of notificationIds) {
				await db
					.update(notifications)
					.set({ read: true })
					.where(
						and(
							eq(notifications.id, id),
							eq(notifications.recipientId, member.id),
						),
					);
			}
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Mark notifications read error:", error);
		return NextResponse.json(
			{ error: "Failed to mark notifications" },
			{ status: 500 },
		);
	}
}
