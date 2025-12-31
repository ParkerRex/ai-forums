import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comments, posts, members } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";

const updateCommentSchema = z.object({
	content: z.string().min(1).max(10000),
	editReason: z.string().optional(),
});

type RouteParams = {
	params: Promise<{ commentId: string }>;
};

// PATCH /api/comments/[commentId] - Update a comment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { commentId } = await params;
		const body = await request.json();
		const parsed = updateCommentSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const existingComment = await db.query.comments.findFirst({
			where: eq(comments.id, commentId),
		});

		if (!existingComment) {
			return NextResponse.json(
				{ error: "Comment not found" },
				{ status: 404 },
			);
		}

		// Check ownership or admin
		if (existingComment.memberId !== member.id && member.role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { content, editReason } = parsed.data;

		// Save edit history
		const editHistory = [
			...(existingComment.editHistory || []),
			{
				content: existingComment.content,
				attachments: existingComment.attachments,
				editedAt: new Date().toISOString(),
			},
		];

		const [updatedComment] = await db
			.update(comments)
			.set({
				content,
				editHistory,
				editReason,
				editedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(comments.id, commentId))
			.returning();

		return NextResponse.json(updatedComment);
	} catch (error) {
		console.error("Update comment error:", error);
		return NextResponse.json(
			{ error: "Failed to update comment" },
			{ status: 500 },
		);
	}
}

// DELETE /api/comments/[commentId] - Soft delete a comment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { commentId } = await params;

		const existingComment = await db.query.comments.findFirst({
			where: eq(comments.id, commentId),
		});

		if (!existingComment) {
			return NextResponse.json(
				{ error: "Comment not found" },
				{ status: 404 },
			);
		}

		// Check ownership or admin
		if (existingComment.memberId !== member.id && member.role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		// Soft delete
		await db
			.update(comments)
			.set({ status: "deleted", updatedAt: new Date() })
			.where(eq(comments.id, commentId));

		// Update post comment count
		await db
			.update(posts)
			.set({ commentCount: sql`${posts.commentCount} - 1` })
			.where(eq(posts.id, existingComment.postId));

		// Update member comment count
		await db
			.update(members)
			.set({ commentCount: sql`${members.commentCount} - 1` })
			.where(eq(members.id, existingComment.memberId));

		// Update parent's child count if applicable
		if (existingComment.parentCommentId) {
			await db
				.update(comments)
				.set({ childCount: sql`${comments.childCount} - 1` })
				.where(eq(comments.id, existingComment.parentCommentId));
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Delete comment error:", error);
		return NextResponse.json(
			{ error: "Failed to delete comment" },
			{ status: 500 },
		);
	}
}
