import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookmarks, posts, resources } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

const toggleBookmarkSchema = z.object({
  targetId: z.string().uuid(),
  targetType: z.enum(["post", "resource"]),
});

// GET /api/bookmarks - Get user's bookmarks
export async function GET(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const targetType = searchParams.get("type");

    const conditions = [eq(bookmarks.memberId, member.id)];
    if (targetType && (targetType === "post" || targetType === "resource")) {
      conditions.push(eq(bookmarks.targetType, targetType));
    }

    const result = await db
      .select()
      .from(bookmarks)
      .where(and(...conditions))
      .orderBy(desc(bookmarks.createdAt));

    return NextResponse.json({ items: result });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    return NextResponse.json({ error: "Failed to get bookmarks" }, { status: 500 });
  }
}

// POST /api/bookmarks - Toggle bookmark
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = toggleBookmarkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { targetId, targetType } = parsed.data;

    // Check for existing bookmark
    const existing = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.memberId, member.id),
        eq(bookmarks.targetId, targetId),
        eq(bookmarks.targetType, targetType),
      ),
    });

    if (existing) {
      // Remove bookmark
      await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
      return NextResponse.json({ bookmarked: false });
    } else {
      // Add bookmark
      await db.insert(bookmarks).values({
        memberId: member.id,
        targetId,
        targetType,
      });
      return NextResponse.json({ bookmarked: true });
    }
  } catch (error) {
    console.error("Toggle bookmark error:", error);
    return NextResponse.json({ error: "Failed to toggle bookmark" }, { status: 500 });
  }
}
