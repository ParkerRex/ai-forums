import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { resources } from "@/db/schema";

type RouteContext = {
  params: Promise<{ resourceId: string }>;
};

// POST /api/resources/[resourceId]/view - Track a resource view
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { resourceId } = await context.params;

    // Check if resource exists
    const resource = await db.query.resources.findFirst({
      where: eq(resources.id, resourceId),
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Increment view count
    await db
      .update(resources)
      .set({
        viewCount: sql`${resources.viewCount} + 1`,
      })
      .where(eq(resources.id, resourceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track view error:", error);
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 });
  }
}
