import { NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { requireAdmin, forbiddenResponse } from "@/lib/auth";
import type { MembershipStats } from "@/types/admin";

// GET /api/admin/members/stats - Get membership statistics
export async function GET() {
	const admin = await requireAdmin();
	if (!admin) {
		return forbiddenResponse();
	}

	try {
		// Get total members count
		const [totalResult] = await db
			.select({ count: count() })
			.from(members);

		// Get status breakdown
		const statusCounts = await db
			.select({
				status: members.status,
				count: count(),
			})
			.from(members)
			.groupBy(members.status);

		const statusStats = {
			active: 0,
			cancelled: 0,
			churned: 0,
		};

		for (const row of statusCounts) {
			if (row.status === "active") {
				statusStats.active = row.count;
			} else if (row.status === "cancelled") {
				statusStats.cancelled = row.count;
			} else if (row.status === "churned" || row.status === "duplicate") {
				statusStats.churned += row.count;
			}
		}

		// Note: Tier stats and revenue would need a subscriptions table
		// For now, return placeholder values
		const stats: MembershipStats = {
			totalMembers: totalResult.count,
			tierStats: {
				founding_member: 0,
				early_bird: 0,
				member: 0,
			},
			statusStats,
			revenue: {
				mrr: 0,
				monthlyRevenue: 0,
				yearlyRevenue: 0,
				formattedMrr: "$0",
				formattedMonthly: "$0",
				formattedYearly: "$0",
			},
		};

		return NextResponse.json(stats);
	} catch (error) {
		console.error("Admin get member stats error:", error);
		return NextResponse.json(
			{ error: "Failed to get member stats" },
			{ status: 500 },
		);
	}
}
