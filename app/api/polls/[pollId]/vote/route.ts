import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pollVotes, posts } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

const voteSchema = z.object({
  optionId: z.string().min(1),
});

type RouteParams = {
  params: Promise<{ pollId: string }>;
};

// GET /api/polls/[pollId]/vote - Get current user's vote on a poll
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ userVotedOptionId: null });
    }

    const { pollId } = await params;

    const existingVote = await db.query.pollVotes.findFirst({
      where: and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, member.id)),
    });

    return NextResponse.json({
      userVotedOptionId: existingVote?.optionId ?? null,
    });
  } catch (error) {
    console.error("Get poll vote error:", error);
    return NextResponse.json({ error: "Failed to get vote" }, { status: 500 });
  }
}

// POST /api/polls/[pollId]/vote - Vote on a poll
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pollId } = await params;
    const body = await request.json();
    const parsed = voteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { optionId } = parsed.data;

    // Verify post exists and has poll options
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, pollId),
    });

    if (!post) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (!post.pollOptions || post.pollOptions.length === 0) {
      return NextResponse.json({ error: "This post is not a poll" }, { status: 400 });
    }

    // Check if poll has ended
    if (post.pollEndsAt && new Date(post.pollEndsAt) < new Date()) {
      return NextResponse.json({ error: "This poll has ended" }, { status: 400 });
    }

    // Verify the option exists
    const optionExists = post.pollOptions.some((opt) => opt.id === optionId);
    if (!optionExists) {
      return NextResponse.json({ error: "Invalid poll option" }, { status: 400 });
    }

    // Check for existing vote
    const existingVote = await db.query.pollVotes.findFirst({
      where: and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, member.id)),
    });

    let changed = false;
    let oldOptionId: string | null = null;

    if (existingVote) {
      if (existingVote.optionId === optionId) {
        // Same vote, no change needed
        return NextResponse.json({
          success: true,
          changed: false,
          userVotedOptionId: optionId,
        });
      }

      // Change vote
      oldOptionId = existingVote.optionId;
      await db
        .update(pollVotes)
        .set({ optionId, votedAt: new Date() })
        .where(eq(pollVotes.id, existingVote.id));
      changed = true;
    } else {
      // Create new vote
      await db.insert(pollVotes).values({
        pollId,
        userId: member.id,
        optionId,
      });
    }

    // Update poll option vote counts
    const updatedOptions = post.pollOptions.map((opt) => {
      if (opt.id === optionId) {
        return { ...opt, votes: opt.votes + 1 };
      }
      if (oldOptionId && opt.id === oldOptionId) {
        return { ...opt, votes: Math.max(0, opt.votes - 1) };
      }
      return opt;
    });

    // Calculate total votes
    const totalVotes = existingVote
      ? post.totalPollVotes || 0 // Total stays the same when changing vote
      : (post.totalPollVotes || 0) + 1; // Increment for new vote

    await db
      .update(posts)
      .set({
        pollOptions: updatedOptions,
        totalPollVotes: totalVotes,
      })
      .where(eq(posts.id, pollId));

    return NextResponse.json({
      success: true,
      changed,
      userVotedOptionId: optionId,
      pollOptions: updatedOptions.map((opt) => ({
        id: opt.id,
        text: opt.text,
        voteCount: opt.votes,
      })),
      totalVotes,
    });
  } catch (error) {
    console.error("Poll vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
