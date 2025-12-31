import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, members, categories, postVersions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";

const updatePostSchema = z.object({
	title: z.string().min(1).max(255).optional(),
	content: z.string().min(1).optional(),
	editReason: z.string().optional(),
	attachments: z
		.array(
			z.object({
				id: z.string(),
				type: z.enum(["image", "video", "pdf", "youtube"]),
				url: z.string().url(),
				thumbnailUrl: z.string().optional(),
				width: z.number().optional(),
				height: z.number().optional(),
				order: z.number(),
			}),
		)
		.optional(),
	isFree: z.boolean().optional(),
});

type RouteParams = {
	params: Promise<{ postId: string }>;
};

// GET /api/posts/[postId] - Get a single post
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { postId } = await params;

		const result = await db
			.select({
				post: posts,
				member: {
					id: members.id,
					firstName: members.firstName,
					lastName: members.lastName,
					slug: members.slug,
					avatarUrl: members.avatarUrl,
					bio: members.bio,
				},
				category: {
					id: categories.id,
					name: categories.name,
					displayName: categories.displayName,
					icon: categories.icon,
				},
			})
			.from(posts)
			.innerJoin(members, eq(posts.memberId, members.id))
			.innerJoin(categories, eq(posts.categoryId, categories.id))
			.where(eq(posts.id, postId))
			.limit(1);

		if (result.length === 0) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		const row = result[0];
		return NextResponse.json({
			...row.post,
			member: row.member,
			category: row.category,
		});
	} catch (error) {
		console.error("Get post error:", error);
		return NextResponse.json({ error: "Failed to get post" }, { status: 500 });
	}
}

// PATCH /api/posts/[postId] - Update a post
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { postId } = await params;
		const body = await request.json();
		const parsed = updatePostSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		// Get existing post
		const existingPost = await db.query.posts.findFirst({
			where: eq(posts.id, postId),
		});

		if (!existingPost) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		// Check ownership or admin
		if (existingPost.memberId !== member.id && member.role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		// Get version count for this post
		const versionCount = await db
			.select({ count: sql<number>`count(*)` })
			.from(postVersions)
			.where(eq(postVersions.postId, postId));

		const nextVersion = (versionCount[0]?.count || 0) + 1;

		// Save current version to history
		await db.insert(postVersions).values({
			postId,
			version: nextVersion,
			editorId: member.id,
			title: existingPost.title,
			content: existingPost.content,
			editReason: parsed.data.editReason,
			type: existingPost.type,
			mediaUrl: existingPost.mediaUrl,
			thumbnailUrl: existingPost.thumbnailUrl,
			linkUrl: existingPost.linkUrl,
			linkTitle: existingPost.linkTitle,
			linkDescription: existingPost.linkDescription,
			linkImage: existingPost.linkImage,
			attachments: existingPost.attachments,
		});

		// Update post
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
			editedAt: new Date(),
		};

		if (parsed.data.title) updateData.title = parsed.data.title;
		if (parsed.data.content) updateData.content = parsed.data.content;
		if (parsed.data.editReason) updateData.editReason = parsed.data.editReason;
		if (parsed.data.attachments) updateData.attachments = parsed.data.attachments;
		if (parsed.data.isFree !== undefined) updateData.isFree = parsed.data.isFree;

		const [updatedPost] = await db
			.update(posts)
			.set(updateData)
			.where(eq(posts.id, postId))
			.returning();

		return NextResponse.json(updatedPost);
	} catch (error) {
		console.error("Update post error:", error);
		return NextResponse.json(
			{ error: "Failed to update post" },
			{ status: 500 },
		);
	}
}

// DELETE /api/posts/[postId] - Soft delete a post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { postId } = await params;

		const existingPost = await db.query.posts.findFirst({
			where: eq(posts.id, postId),
		});

		if (!existingPost) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		// Check ownership or admin
		if (existingPost.memberId !== member.id && member.role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		// Soft delete
		await db
			.update(posts)
			.set({ status: "deleted", updatedAt: new Date() })
			.where(eq(posts.id, postId));

		// Update category post count
		await db
			.update(categories)
			.set({ postCount: sql`${categories.postCount} - 1` })
			.where(eq(categories.id, existingPost.categoryId));

		// Update member post count
		await db
			.update(members)
			.set({ postCount: sql`${members.postCount} - 1` })
			.where(eq(members.id, existingPost.memberId));

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Delete post error:", error);
		return NextResponse.json(
			{ error: "Failed to delete post" },
			{ status: 500 },
		);
	}
}
