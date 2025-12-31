import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq, desc, like, or, and } from "drizzle-orm";

// GET /api/members - List members with search and pagination
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = request.nextUrl;
		const search = searchParams.get("search");
		const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
		const status = searchParams.get("status") || "active";

		let conditions = [eq(members.status, status)];

		if (search) {
			conditions.push(
				or(
					like(members.firstName, `%${search}%`),
					like(members.lastName, `%${search}%`),
					like(members.email, `%${search}%`),
				) as any,
			);
		}

		const result = await db
			.select({
				id: members.id,
				firstName: members.firstName,
				lastName: members.lastName,
				slug: members.slug,
				avatarUrl: members.avatarUrl,
				bio: members.bio,
				country: members.country,
				location: members.location,
				skills: members.skills,
				postCount: members.postCount,
				commentCount: members.commentCount,
				netVoteCount: members.netVoteCount,
				joinedDate: members.joinedDate,
				lastOnline: members.lastOnline,
				role: members.role,
			})
			.from(members)
			.where(and(...conditions))
			.orderBy(desc(members.lastOnline))
			.limit(limit);

		return NextResponse.json({ items: result });
	} catch (error) {
		console.error("Get members error:", error);
		return NextResponse.json(
			{ error: "Failed to get members" },
			{ status: 500 },
		);
	}
}
