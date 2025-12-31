import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, comments, members, categories } from "@/db/schema";
import { eq, or, like, desc, and } from "drizzle-orm";

// GET /api/search - Search across content
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = request.nextUrl;
		const query = searchParams.get("q");
		const type = searchParams.get("type"); // 'posts' | 'members' | 'all'
		const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

		if (!query || query.length < 2) {
			return NextResponse.json(
				{ error: "Search query must be at least 2 characters" },
				{ status: 400 },
			);
		}

		const searchPattern = `%${query}%`;
		const results: {
			posts?: unknown[];
			members?: unknown[];
		} = {};

		// Search posts
		if (!type || type === "posts" || type === "all") {
			const postResults = await db
				.select({
					id: posts.id,
					title: posts.title,
					slug: posts.slug,
					preview: posts.preview,
					createdAt: posts.createdAt,
					netVotes: posts.netVotes,
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
					},
				})
				.from(posts)
				.innerJoin(members, eq(posts.memberId, members.id))
				.innerJoin(categories, eq(posts.categoryId, categories.id))
				.where(
					and(
						eq(posts.status, "active"),
						or(
							like(posts.title, searchPattern),
							like(posts.content, searchPattern),
						),
					),
				)
				.orderBy(desc(posts.netVotes))
				.limit(limit);

			results.posts = postResults;
		}

		// Search members
		if (!type || type === "members" || type === "all") {
			const memberResults = await db
				.select({
					id: members.id,
					firstName: members.firstName,
					lastName: members.lastName,
					slug: members.slug,
					avatarUrl: members.avatarUrl,
					bio: members.bio,
					postCount: members.postCount,
				})
				.from(members)
				.where(
					and(
						eq(members.status, "active"),
						or(
							like(members.firstName, searchPattern),
							like(members.lastName, searchPattern),
							like(members.bio, searchPattern),
						),
					),
				)
				.orderBy(desc(members.postCount))
				.limit(limit);

			results.members = memberResults;
		}

		return NextResponse.json(results);
	} catch (error) {
		console.error("Search error:", error);
		return NextResponse.json({ error: "Search failed" }, { status: 500 });
	}
}
