import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { resources, votes } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ resourceId: string }>;
};

const voteSchema = z.object({
  voteType: z.enum(["upvote", "downvote", "remove"]),
});

// GET /api/resources/[resourceId]/vote - Get current user's vote
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ voteType: null });
    }

    const { resourceId } = await context.params;

    const existingVote = await db.query.votes.findFirst({
      where: and(
        eq(votes.userId, member.id),
        eq(votes.targetId, resourceId),
        eq(votes.targetType, "resource"),
      ),
    });

    return NextResponse.json({
      voteType: existingVote?.voteType || null,
    });
  } catch (error) {
    console.error("Get vote error:", error);
    return NextResponse.json({ voteType: null });
  }
}

// POST /api/resources/[resourceId]/vote - Vote on a resource
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await context.params;

    // Check if resource exists
    const resource = await db.query.resources.findFirst({
      where: eq(resources.id, resourceId),
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = voteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { voteType } = parsed.data;

    // Find existing vote
    const existingVote = await db.query.votes.findFirst({
      where: and(
        eq(votes.userId, member.id),
        eq(votes.targetId, resourceId),
        eq(votes.targetType, "resource"),
      ),
    });

    let upvoteDelta = 0;
    let downvoteDelta = 0;
    let newVoteType: string | null = null;

    if (voteType === "remove") {
      if (existingVote) {
        // Remove existing vote
        if (existingVote.voteType === "upvote") {
          upvoteDelta = -1;
        } else if (existingVote.voteType === "downvote") {
          downvoteDelta = -1;
        }
        await db.delete(votes).where(eq(votes.id, existingVote.id));
      }
      newVoteType = null;
    } else {
      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Same vote - remove it (toggle off)
          if (voteType === "upvote") {
            upvoteDelta = -1;
          } else {
            downvoteDelta = -1;
          }
          await db.delete(votes).where(eq(votes.id, existingVote.id));
          newVoteType = null;
        } else {
          // Different vote - update it
          if (voteType === "upvote") {
            upvoteDelta = 1;
            downvoteDelta = -1;
          } else {
            upvoteDelta = -1;
            downvoteDelta = 1;
          }
          await db
            .update(votes)
            .set({ voteType, updatedAt: new Date() })
            .where(eq(votes.id, existingVote.id));
          newVoteType = voteType;
        }
      } else {
        // New vote
        if (voteType === "upvote") {
          upvoteDelta = 1;
        } else {
          downvoteDelta = 1;
        }
        await db.insert(votes).values({
          userId: member.id,
          targetId: resourceId,
          targetType: "resource",
          voteType,
        });
        newVoteType = voteType;
      }
    }

    // Update resource vote counts
    const [updatedResource] = await db
      .update(resources)
      .set({
        upvotes: sql`${resources.upvotes} + ${upvoteDelta}`,
        downvotes: sql`${resources.downvotes} + ${downvoteDelta}`,
        netVotes: sql`${resources.netVotes} + ${upvoteDelta} - ${downvoteDelta}`,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, resourceId))
      .returning();

    return NextResponse.json({
      upvotes: updatedResource.upvotes,
      downvotes: updatedResource.downvotes,
      netVotes: updatedResource.netVotes,
      userVote: newVoteType,
      newVoteType,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
