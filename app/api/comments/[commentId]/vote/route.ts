import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { comments, members, votes } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

const voteSchema = z.object({
  voteType: z.enum(["upvote", "downvote"]),
});

type RouteParams = {
  params: Promise<{ commentId: string }>;
};

// POST /api/comments/[commentId]/vote - Vote on a comment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;
    const body = await request.json();
    const parsed = voteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { voteType } = parsed.data;

    // Verify comment exists
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check for existing vote
    const existingVote = await db.query.votes.findFirst({
      where: and(
        eq(votes.userId, member.id),
        eq(votes.targetId, commentId),
        eq(votes.targetType, "comment"),
      ),
    });

    let upvoteDelta = 0;
    let downvoteDelta = 0;

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Remove vote
        await db.delete(votes).where(eq(votes.id, existingVote.id));
        if (voteType === "upvote") upvoteDelta = -1;
        else downvoteDelta = -1;
      } else {
        // Change vote
        await db
          .update(votes)
          .set({ voteType, updatedAt: new Date() })
          .where(eq(votes.id, existingVote.id));
        if (voteType === "upvote") {
          upvoteDelta = 1;
          downvoteDelta = -1;
        } else {
          upvoteDelta = -1;
          downvoteDelta = 1;
        }
      }
    } else {
      // Create new vote
      await db.insert(votes).values({
        userId: member.id,
        targetId: commentId,
        targetType: "comment",
        voteType,
      });
      if (voteType === "upvote") upvoteDelta = 1;
      else downvoteDelta = 1;
    }

    // Update comment vote counts
    const [updatedComment] = await db
      .update(comments)
      .set({
        upvotes: sql`${comments.upvotes} + ${upvoteDelta}`,
        downvotes: sql`${comments.downvotes} + ${downvoteDelta}`,
        netVotes: sql`${comments.netVotes} + ${upvoteDelta} - ${downvoteDelta}`,
      })
      .where(eq(comments.id, commentId))
      .returning({
        upvotes: comments.upvotes,
        downvotes: comments.downvotes,
        netVotes: comments.netVotes,
      });

    // Update comment author's net vote count
    await db
      .update(members)
      .set({
        netVoteCount: sql`${members.netVoteCount} + ${upvoteDelta} - ${downvoteDelta}`,
      })
      .where(eq(members.id, comment.memberId));

    return NextResponse.json({
      upvotes: updatedComment.upvotes,
      downvotes: updatedComment.downvotes,
      netVotes: updatedComment.netVotes,
      userVote: existingVote?.voteType === voteType ? null : voteType,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
