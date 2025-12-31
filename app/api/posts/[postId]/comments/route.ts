import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, comments, members } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";

const createCommentSchema = z.object({
	content: z.string().min(1).max(10000),
	parentCommentId: z.string().uuid().optional(),
	replyToMemberId: z.string().uuid().optional(),
	replyToCommentId: z.string().uuid().optional(),
	attachments: z
		.array(
			z.object({
				id: z.string(),
				type: z.enum(["image", "document", "gif"]),
				url: z.string().url(),
				thumbnailUrl: z.string().optional(),
			}),
		)
		.optional(),
});

type RouteParams = {
	params: Promise<{ postId: string }>;
};

// GET /api/posts/[postId]/comments - Get comments for a post
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { postId } = await params;
		const { searchParams } = request.nextUrl;
		const sortBy = searchParams.get("sortBy") || "newest";
		const flat = searchParams.get("flat") === "true";

		// Verify post exists
		const post = await db.query.posts.findFirst({
			where: eq(posts.id, postId),
		});

		if (!post) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		const orderBy =
			sortBy === "popular"
				? [desc(comments.netVotes), desc(comments.createdAt)]
				: [desc(comments.createdAt)];

		const conditions = [
			eq(comments.postId, postId),
			eq(comments.status, "active"),
		];

		// For threaded view, only get root comments first
		if (!flat) {
			conditions.push(sql`${comments.parentCommentId} IS NULL`);
		}

		const result = await db
			.select({
				comment: comments,
				member: {
					id: members.id,
					firstName: members.firstName,
					lastName: members.lastName,
					slug: members.slug,
					avatarUrl: members.avatarUrl,
				},
			})
			.from(comments)
			.innerJoin(members, eq(comments.memberId, members.id))
			.where(and(...conditions))
			.orderBy(...orderBy);

		return NextResponse.json({
			items: result.map((row) => ({
				...row.comment,
				member: row.member,
			})),
		});
	} catch (error) {
		console.error("Get comments error:", error);
		return NextResponse.json(
			{ error: "Failed to get comments" },
			{ status: 500 },
		);
	}
}

// POST /api/posts/[postId]/comments - Create a comment
export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { postId } = await params;
		const body = await request.json();
		const parsed = createCommentSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		// Verify post exists
		const post = await db.query.posts.findFirst({
			where: eq(posts.id, postId),
		});

		if (!post) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		const {
			content,
			parentCommentId,
			replyToMemberId,
			replyToCommentId,
			attachments,
		} = parsed.data;

		let depth = 0;

		// If replying to a comment, get parent info
		if (parentCommentId) {
			const parentComment = await db.query.comments.findFirst({
				where: eq(comments.id, parentCommentId),
			});

			if (!parentComment) {
				return NextResponse.json(
					{ error: "Parent comment not found" },
					{ status: 404 },
				);
			}

			depth = parentComment.depth + 1;

			// Update parent's child count
			await db
				.update(comments)
				.set({ childCount: sql`${comments.childCount} + 1` })
				.where(eq(comments.id, parentCommentId));
		}

		const [newComment] = await db
			.insert(comments)
			.values({
				content,
				postId,
				memberId: member.id,
				parentCommentId,
				replyToMemberId,
				replyToCommentId,
				depth,
				attachments: attachments || [],
				status: "active",
			})
			.returning();

		// Update post comment count
		await db
			.update(posts)
			.set({ commentCount: sql`${posts.commentCount} + 1` })
			.where(eq(posts.id, postId));

		// Update member comment count
		await db
			.update(members)
			.set({ commentCount: sql`${members.commentCount} + 1` })
			.where(eq(members.id, member.id));

		return NextResponse.json(
			{
				...newComment,
				member: {
					id: member.id,
					firstName: member.firstName,
					lastName: member.lastName,
					slug: member.slug,
					avatarUrl: member.avatarUrl,
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Create comment error:", error);
		return NextResponse.json(
			{ error: "Failed to create comment" },
			{ status: 500 },
		);
	}
}
