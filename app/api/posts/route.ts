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
	type: z.enum(["text", "image", "video", "link"]).default("text"),
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
	linkUrl: z.string().url().optional(),
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
		const sortBy = searchParams.get("sortBy") || "newest";
		const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
		const cursor = searchParams.get("cursor");

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
			.where(eq(posts.status, "active"))
			.limit(limit + 1);

		if (categoryId) {
			query = query.where(
				and(eq(posts.status, "active"), eq(posts.categoryId, categoryId)),
			);
		}

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

		const { title, content, categoryId, type, attachments, linkUrl, isFree } =
			parsed.data;

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
				linkUrl,
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

		return NextResponse.json(newPost, { status: 201 });
	} catch (error) {
		console.error("Create post error:", error);
		return NextResponse.json(
			{ error: "Failed to create post" },
			{ status: 500 },
		);
	}
}
