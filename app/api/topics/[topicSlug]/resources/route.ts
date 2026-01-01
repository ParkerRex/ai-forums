import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { members, resources, topics } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ topicSlug: string }>;
};

const createResourceSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  url: z.string().url(),
  type: z
    .enum(["article", "video", "course", "documentation", "tool", "book", "other"])
    .default("article"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  isPaid: z.boolean().default(false),
  isFree: z.boolean().default(true),
});

// GET /api/topics/[topicSlug]/resources - List resources for a topic
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { topicSlug } = await context.params;
    const { searchParams } = request.nextUrl;
    const sortBy = searchParams.get("sortBy") || "newest";
    const searchTerm = searchParams.get("search");

    // Find the topic first
    const topic = await db.query.topics.findFirst({
      where: or(eq(topics.name, topicSlug), eq(topics.id, topicSlug)),
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // Build conditions
    const conditions = [eq(resources.topicId, topic.id), eq(resources.status, "active")];

    if (searchTerm) {
      conditions.push(
        or(
          ilike(resources.title, `%${searchTerm}%`),
          ilike(resources.description, `%${searchTerm}%`),
        ) as ReturnType<typeof eq>,
      );
    }

    // Build query with member join
    const baseQuery = db
      .select({
        resource: resources,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          slug: members.slug,
        },
      })
      .from(resources)
      .innerJoin(members, eq(resources.memberId, members.id))
      .where(and(...conditions));

    const result =
      sortBy === "popular"
        ? await baseQuery.orderBy(desc(resources.netVotes), desc(resources.createdAt))
        : await baseQuery.orderBy(desc(resources.createdAt));

    return NextResponse.json({
      items: result.map((row) => ({
        ...row.resource,
        member: row.member,
      })),
    });
  } catch (error) {
    console.error("Get resources error:", error);
    return NextResponse.json({ error: "Failed to get resources" }, { status: 500 });
  }
}

// POST /api/topics/[topicSlug]/resources - Create a new resource
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicSlug } = await context.params;

    // Find the topic
    const topic = await db.query.topics.findFirst({
      where: or(eq(topics.name, topicSlug), eq(topics.id, topicSlug)),
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { title, description, url, type, difficulty, isPaid, isFree } = parsed.data;

    const [newResource] = await db
      .insert(resources)
      .values({
        title,
        description,
        url,
        topicId: topic.id,
        memberId: member.id,
        type,
        difficulty,
        isPaid,
        isFree,
        status: "active",
      })
      .returning();

    // Update topic resource count
    await db
      .update(topics)
      .set({ resourceCount: sql`${topics.resourceCount} + 1` })
      .where(eq(topics.id, topic.id));

    return NextResponse.json(newResource, { status: 201 });
  } catch (error) {
    console.error("Create resource error:", error);
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}
