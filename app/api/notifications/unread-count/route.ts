import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";

// GET /api/notifications/unread-count - Get unread notification count
export async function GET() {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(notifications)
			.where(
				and(
					eq(notifications.recipientId, member.id),
					eq(notifications.read, false),
				),
			);

		return NextResponse.json({
			unreadCount: Number(result[0]?.count || 0),
		});
	} catch (error) {
		console.error("Get unread count error:", error);
		return NextResponse.json(
			{ error: "Failed to get unread count" },
			{ status: 500 },
		);
	}
}
