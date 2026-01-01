import { count, gte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { forbiddenResponse, requireAdmin } from "@/lib/auth";

// GET /api/admin/analytics - Get analytics dashboard data
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = request.nextUrl;
    const timeRange = searchParams.get("timeRange") || "30d";

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Get total members count
    const [totalMembersResult] = await db.select({ count: count() }).from(members);

    // Get new members in period
    const [newMembersResult] = await db
      .select({ count: count() })
      .from(members)
      .where(gte(members.joinedDate, startDate));

    // Get active members (by status)
    const [activeMembersResult] = await db
      .select({ count: count() })
      .from(members)
      .where(sql`${members.status} = 'active'`);

    // Build response
    // Note: Revenue metrics would need a payments/subscriptions table
    const metrics = {
      revenue: {
        net: 0,
        gross: 0,
      },
      members: {
        total: totalMembersResult.count,
        paid: activeMembersResult.count,
        new: newMembersResult.count,
        billingBreakdown: {
          monthly: 0,
          yearly: 0,
        },
      },
      tiers: {},
      paymentMethods: {},
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Admin get analytics error:", error);
    return NextResponse.json({ error: "Failed to get analytics" }, { status: 500 });
  }
}
