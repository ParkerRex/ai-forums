import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, categories, members } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";

const createPostSchema = z.object({
	title: z.string().min(1).max(255),
	content: z.string().min(1),
	categoryId: z.string().uuid(),
	type: z.enum(["text", "image", "video", "link", "poll"]).default("text"),
	attachments: z
		.array(
			z.object({
				id: z.string(),
				type: z.enum(["image", "video", "pdf", "youtube"]),
				url: z.string().url(),
				thumbnailUrl: z.string().optional(),
				width: z.number().optional(),
				height: z.number().optional(),
				aspectRatio: z.number().optional(),
				order: z.number(),
				// PDF specific
				pageCount: z.number().optional(),
				fileSize: z.number().optional(),
				// YouTube specific
				videoId: z.string().optional(),
				title: z.string().optional(),
				duration: z.string().optional(),
				channelName: z.string().optional(),
				// Video specific
				videoDuration: z.string().optional(),
				format: z.string().optional(),
				resolution: z.string().optional(),
				codec: z.string().optional(),
			}),
		)
		.optional(),
	// Media fields
	mediaUrl: z.string().url().optional(),
	thumbnailUrl: z.string().url().optional(),
	aspectRatio: z.number().optional(),
	mediaWidth: z.number().optional(),
	mediaHeight: z.number().optional(),
	// Link fields
	linkUrl: z.string().url().optional(),
	linkTitle: z.string().optional(),
	linkDescription: z.string().optional(),
	linkImage: z.string().optional(),
	// Poll fields
	pollOptions: z.array(z.string().min(1)).optional(),
	pollDuration: z.number().optional(), // Duration in hours
	// Preview
	preview: z.string().optional(),
	isFree: z.boolean().default(true),
});

function generateSlug(title: string): string {
	const base = title
		.toLowerCase()
		.replace(/[^a-z0-9-\s]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.substring(0, 100);
	const suffix = Math.random().toString(36).substring(2, 8);
	return `${base}-${suffix}`;
}

// GET /api/posts - List posts with pagination
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = request.nextUrl;
		const categoryId = searchParams.get("categoryId");
		const slug = searchParams.get("slug");
		const sortBy = searchParams.get("sortBy") || "newest";
		const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
		const cursor = searchParams.get("cursor");

		// Build conditions array
		const conditions = [eq(posts.status, "active")];

		if (categoryId) {
			conditions.push(eq(posts.categoryId, categoryId));
		}

		if (slug) {
			conditions.push(eq(posts.slug, slug));
		}

		let query = db
			.select({
				post: posts,
				member: {
					id: members.id,
					firstName: members.firstName,
					lastName: members.lastName,
					slug: members.slug,
					avatarUrl: members.avatarUrl,
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
			.where(and(...conditions))
			.limit(limit + 1);

		if (sortBy === "popular") {
			query = query.orderBy(desc(posts.netVotes), desc(posts.createdAt));
		} else {
			query = query.orderBy(desc(posts.createdAt));
		}

		const result = await query;

		const hasMore = result.length > limit;
		const items = hasMore ? result.slice(0, -1) : result;

		return NextResponse.json({
			items: items.map((row) => ({
				...row.post,
				member: row.member,
				category: row.category,
			})),
			nextCursor: hasMore ? items[items.length - 1].post.id : null,
		});
	} catch (error) {
		console.error("Get posts error:", error);
		return NextResponse.json(
			{ error: "Failed to get posts" },
			{ status: 500 },
		);
	}
}

// POST /api/posts - Create a new post
export async function POST(request: NextRequest) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const parsed = createPostSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const {
			title,
			content,
			categoryId,
			type,
			attachments,
			mediaUrl,
			thumbnailUrl,
			aspectRatio,
			mediaWidth,
			mediaHeight,
			linkUrl,
			linkTitle,
			linkDescription,
			linkImage,
			pollOptions,
			pollDuration,
			preview,
			isFree,
		} = parsed.data;

		// Verify category exists
		const category = await db.query.categories.findFirst({
			where: eq(categories.id, categoryId),
		});

		if (!category) {
			return NextResponse.json(
				{ error: "Category not found" },
				{ status: 404 },
			);
		}

		const slug = generateSlug(title);

		// Convert poll options to proper format if it's a poll post
		let formattedPollOptions: Array<{ id: string; text: string; votes: number }> | undefined;
		let pollEndsAt: Date | undefined;

		if (type === "poll" && pollOptions && pollOptions.length >= 2) {
			formattedPollOptions = pollOptions.map((text, index) => ({
				id: `option-${index + 1}`,
				text,
				votes: 0,
			}));
			if (pollDuration) {
				pollEndsAt = new Date(Date.now() + pollDuration * 60 * 60 * 1000);
			}
		}

		const [newPost] = await db
			.insert(posts)
			.values({
				title,
				content,
				slug,
				categoryId,
				memberId: member.id,
				type,
				attachments: attachments || [],
				mediaUrl,
				thumbnailUrl,
				aspectRatio,
				mediaWidth,
				mediaHeight,
				linkUrl,
				linkTitle,
				linkDescription,
				linkImage,
				pollOptions: formattedPollOptions,
				pollEndsAt,
				preview,
				isFree,
				status: "active",
			})
			.returning();

		// Update category post count
		await db
			.update(categories)
			.set({ postCount: sql`${categories.postCount} + 1` })
			.where(eq(categories.id, categoryId));

		// Update member post count
		await db
			.update(members)
			.set({ postCount: sql`${members.postCount} + 1` })
			.where(eq(members.id, member.id));

		return NextResponse.json({
			...newPost,
			postId: newPost.id,
			categoryName: category.name,
		}, { status: 201 });
	} catch (error) {
		console.error("Create post error:", error);
		return NextResponse.json(
			{ error: "Failed to create post" },
			{ status: 500 },
		);
	}
}
