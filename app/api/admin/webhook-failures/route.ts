import { type NextRequest, NextResponse } from "next/server";
import { forbiddenResponse, requireAdmin } from "@/lib/auth";

// GET /api/admin/webhook-failures - Get recent webhook failures
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = request.nextUrl;
    const _limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

    // Note: This would need a webhook events table to track actual failures
    // For now, return empty array
    const failures: Array<{
      eventId: string;
      type: string;
      error: string | undefined;
      createdAt: number;
      age: number;
    }> = [];

    return NextResponse.json(failures);
  } catch (error) {
    console.error("Admin get webhook failures error:", error);
    return NextResponse.json({ error: "Failed to get webhook failures" }, { status: 500 });
  }
}
