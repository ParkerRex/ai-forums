import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { topics } from "@/db/schema";
import { eq, ilike, or, desc } from "drizzle-orm";

// GET /api/topics - List all topics with optional search
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = request.nextUrl;
		const searchTerm = searchParams.get("search");

		let query = db
			.select()
			.from(topics)
			.where(eq(topics.status, "active"))
			.orderBy(desc(topics.resourceCount));

		if (searchTerm) {
			query = db
				.select()
				.from(topics)
				.where(
					or(
						ilike(topics.name, `%${searchTerm}%`),
						ilike(topics.displayName, `%${searchTerm}%`),
						ilike(topics.description, `%${searchTerm}%`),
					),
				)
				.orderBy(desc(topics.resourceCount));
		}

		const result = await query;

		return NextResponse.json({
			items: result,
		});
	} catch (error) {
		console.error("Get topics error:", error);
		return NextResponse.json(
			{ error: "Failed to get topics" },
			{ status: 500 },
		);
	}
}
