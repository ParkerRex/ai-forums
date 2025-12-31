import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, pollVotes } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteParams = {
	params: Promise<{ pollId: string }>;
};

// GET /api/polls/[pollId]/voters - Get voters for each poll option
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { pollId } = await params;

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

		// Get all votes for this poll with member info
		const votes = await db.query.pollVotes.findMany({
			where: eq(pollVotes.pollId, pollId),
			with: {
				member: true,
			},
			orderBy: (pollVotes, { desc }) => [desc(pollVotes.votedAt)],
		});

		// Group votes by option
		const votesByOption: Record<
			string,
			Array<{
				memberId: string;
				firstName: string;
				lastName: string;
				email: string;
				slug: string;
				avatarUrl: string | null;
				votedAt: number;
			}>
		> = {};

		// Initialize empty arrays for each option
		for (const option of post.pollOptions) {
			votesByOption[option.id] = [];
		}

		// Populate votes
		for (const vote of votes) {
			if (vote.member && votesByOption[vote.optionId]) {
				votesByOption[vote.optionId].push({
					memberId: vote.member.id,
					firstName: vote.member.firstName,
					lastName: vote.member.lastName,
					email: vote.member.email,
					slug: vote.member.slug,
					avatarUrl: vote.member.avatarUrl,
					votedAt: vote.votedAt.getTime(),
				});
			}
		}

		return NextResponse.json({ votesByOption });
	} catch (error) {
		console.error("Get poll voters error:", error);
		return NextResponse.json({ error: "Failed to get voters" }, { status: 500 });
	}
}
