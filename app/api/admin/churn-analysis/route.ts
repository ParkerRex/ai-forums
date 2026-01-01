import { count, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { forbiddenResponse, requireAdmin } from "@/lib/auth";

// GET /api/admin/churn-analysis - Get churn metrics
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return forbiddenResponse();
  }

  try {
    // Get total members
    const [totalResult] = await db.select({ count: count() }).from(members);

    // Get churned members
    const [churnedResult] = await db
      .select({ count: count() })
      .from(members)
      .where(sql`${members.status} IN ('churned', 'duplicate')`);

    // Get active members
    const [activeResult] = await db
      .select({ count: count() })
      .from(members)
      .where(eq(members.status, "active"));

    // Calculate rates
    const totalMembers = totalResult.count || 1; // Avoid division by zero
    const churnedMembers = churnedResult.count;
    const _activeMembers = activeResult.count;

    // Monthly churn rate (simplified - would need subscription data for accuracy)
    const monthlyChurnRate = totalMembers > 0 ? (churnedMembers / totalMembers) * 100 : 0;

    // Retention rate
    const retentionRate = 100 - monthlyChurnRate;

    const churnAnalysis = {
      summary: {
        monthlyChurnRate: Math.round(monthlyChurnRate * 10) / 10,
        churnedMembers,
      },
      retentionRate: Math.round(retentionRate * 10) / 10,
      recentChurns: {
        avgLifetimeMonths: 0, // Would need subscription data
      },
      churnByTier: {
        // Would need subscription/tier data
        founding_member: { count: 0 },
        early_bird: { count: 0 },
        member: { count: 0 },
      },
    };

    return NextResponse.json(churnAnalysis);
  } catch (error) {
    console.error("Admin get churn analysis error:", error);
    return NextResponse.json({ error: "Failed to get churn analysis" }, { status: 500 });
  }
}
