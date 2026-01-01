import { NextResponse } from "next/server";
import { forbiddenResponse, requireAdmin } from "@/lib/auth";

// GET /api/admin/mrr-history - Get MRR history for charts
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return forbiddenResponse();
  }

  try {
    // Note: This would need a payments/subscriptions table to calculate actual MRR
    // For now, return placeholder data structure
    const mrrHistory: { month: string; mrr: number }[] = [];

    // Generate last 12 months with placeholder values
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      mrrHistory.push({
        month: monthName,
        mrr: 0, // Would be calculated from subscription data
      });
    }

    return NextResponse.json(mrrHistory);
  } catch (error) {
    console.error("Admin get MRR history error:", error);
    return NextResponse.json({ error: "Failed to get MRR history" }, { status: 500 });
  }
}
