import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema/members";
import { votes } from "@/db/schema/votes";

/**
 * GET /api/votes/voters?targetId=xxx&targetType=post
 * Get voters for a specific target (post, comment, resource)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("targetId");
    const targetType = searchParams.get("targetType") || "post";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

    if (!targetId) {
      return NextResponse.json({ error: "targetId is required" }, { status: 400 });
    }

    // Get voters with member info
    const votersResult = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        avatarUrl: members.avatarUrl,
        slug: members.slug,
      })
      .from(votes)
      .innerJoin(members, eq(votes.userId, members.id))
      .where(
        and(
          eq(votes.targetId, targetId),
          eq(votes.targetType, targetType),
          eq(votes.voteType, "upvote"),
        ),
      )
      .limit(limit + 1);

    const hasMore = votersResult.length > limit;
    const voters = votersResult.slice(0, limit);

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(
        and(
          eq(votes.targetId, targetId),
          eq(votes.targetType, targetType),
          eq(votes.voteType, "upvote"),
        ),
      );

    const total = Number(totalResult?.count ?? 0);

    return NextResponse.json({
      voters: voters.map((v) => ({
        id: v.id,
        firstName: v.firstName,
        lastName: v.lastName,
        avatarUrl: v.avatarUrl,
        slug: v.slug,
      })),
      hasMore,
      total,
    });
  } catch (error) {
    console.error("Error fetching voters:", error);
    return NextResponse.json({ error: "Failed to fetch voters" }, { status: 500 });
  }
}
