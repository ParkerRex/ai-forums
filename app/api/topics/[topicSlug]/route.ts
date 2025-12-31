import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { topics } from "@/db/schema";
import { eq, or } from "drizzle-orm";

type RouteContext = {
	params: Promise<{ topicSlug: string }>;
};

// GET /api/topics/[topicSlug] - Get a single topic by name or id
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const { topicSlug } = await context.params;

		// Try to find by name first, then by id
		const topic = await db.query.topics.findFirst({
			where: or(eq(topics.name, topicSlug), eq(topics.id, topicSlug)),
		});

		if (!topic) {
			return NextResponse.json({ error: "Topic not found" }, { status: 404 });
		}

		return NextResponse.json(topic);
	} catch (error) {
		console.error("Get topic error:", error);
		return NextResponse.json(
			{ error: "Failed to get topic" },
			{ status: 500 },
		);
	}
}
