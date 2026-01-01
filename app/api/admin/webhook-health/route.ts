import { NextResponse } from "next/server";
import { forbiddenResponse, requireAdmin } from "@/lib/auth";

// GET /api/admin/webhook-health - Get webhook health status
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return forbiddenResponse();
  }

  try {
    // Note: This would need a webhook events table to track actual health
    // For now, return healthy status with placeholder metrics
    const webhookHealth = {
      status: "healthy" as const,
      lastChecked: Date.now(),
      issues: [] as string[],
      metrics: {
        totalEvents: 0,
        failureRate: 0,
        avgProcessingTime: 0,
        duplicateRate: 0,
        eventTypeMetrics: {} as Record<
          string,
          { total: number; processed: number; failed: number }
        >,
      },
    };

    return NextResponse.json(webhookHealth);
  } catch (error) {
    console.error("Admin get webhook health error:", error);
    return NextResponse.json({ error: "Failed to get webhook health" }, { status: 500 });
  }
}
