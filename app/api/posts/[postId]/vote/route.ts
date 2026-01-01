import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { members, posts, votes } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

const voteSchema = z.object({
  voteType: z.enum(["upvote", "downvote"]),
});

type RouteParams = {
  params: Promise<{ postId: string }>;
};

// POST /api/posts/[postId]/vote - Vote on a post
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;
    const body = await request.json();
    const parsed = voteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { voteType } = parsed.data;

    // Verify post exists
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check for existing vote
    const existingVote = await db.query.votes.findFirst({
      where: and(
        eq(votes.userId, member.id),
        eq(votes.targetId, postId),
        eq(votes.targetType, "post"),
      ),
    });

    let upvoteDelta = 0;
    let downvoteDelta = 0;

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Remove vote (toggle off)
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
        targetId: postId,
        targetType: "post",
        voteType,
      });
      if (voteType === "upvote") upvoteDelta = 1;
      else downvoteDelta = 1;
    }

    // Update post vote counts
    const [updatedPost] = await db
      .update(posts)
      .set({
        upvotes: sql`${posts.upvotes} + ${upvoteDelta}`,
        downvotes: sql`${posts.downvotes} + ${downvoteDelta}`,
        netVotes: sql`${posts.netVotes} + ${upvoteDelta} - ${downvoteDelta}`,
      })
      .where(eq(posts.id, postId))
      .returning({
        upvotes: posts.upvotes,
        downvotes: posts.downvotes,
        netVotes: posts.netVotes,
      });

    // Update post author's net vote count
    await db
      .update(members)
      .set({
        netVoteCount: sql`${members.netVoteCount} + ${upvoteDelta} - ${downvoteDelta}`,
      })
      .where(eq(members.id, post.memberId));

    return NextResponse.json({
      upvotes: updatedPost.upvotes,
      downvotes: updatedPost.downvotes,
      netVotes: updatedPost.netVotes,
      userVote: existingVote?.voteType === voteType ? null : voteType,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
