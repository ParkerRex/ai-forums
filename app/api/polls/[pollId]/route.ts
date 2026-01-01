import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pollVotes, posts } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ pollId: string }>;
};

// GET /api/polls/[pollId] - Get poll results with current user's vote
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { pollId } = await params;
    const member = await getCurrentMember();

    // Get the post/poll
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, pollId),
    });

    if (!post) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (!post.pollOptions || post.pollOptions.length === 0) {
      return NextResponse.json({ error: "This post is not a poll" }, { status: 400 });
    }

    // Get user's vote if logged in
    let userVotedOptionId: string | null = null;
    if (member) {
      const existingVote = await db.query.pollVotes.findFirst({
        where: and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, member.id)),
      });
      userVotedOptionId = existingVote?.optionId ?? null;
    }

    const hasEnded = post.pollEndsAt ? new Date(post.pollEndsAt) < new Date() : false;

    return NextResponse.json({
      pollOptions: post.pollOptions.map((opt) => ({
        id: opt.id,
        text: opt.text,
        voteCount: opt.votes,
      })),
      totalVotes: post.totalPollVotes || 0,
      userVotedOptionId,
      hasEnded,
      endsAt: post.pollEndsAt ? post.pollEndsAt.getTime() : undefined,
    });
  } catch (error) {
    console.error("Get poll results error:", error);
    return NextResponse.json({ error: "Failed to get poll results" }, { status: 500 });
  }
}
