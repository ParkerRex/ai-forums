import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { members, resources, topics } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ resourceId: string }>;
};

const updateResourceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  type: z.enum(["article", "video", "course", "documentation", "tool", "book", "other"]).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  isPaid: z.boolean().optional(),
  isFree: z.boolean().optional(),
});

// GET /api/resources/[resourceId] - Get a single resource
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { resourceId } = await context.params;

    const result = await db
      .select({
        resource: resources,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          slug: members.slug,
        },
        topic: {
          id: topics.id,
          name: topics.name,
          displayName: topics.displayName,
        },
      })
      .from(resources)
      .innerJoin(members, eq(resources.memberId, members.id))
      .innerJoin(topics, eq(resources.topicId, topics.id))
      .where(eq(resources.id, resourceId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const row = result[0];
    return NextResponse.json({
      ...row.resource,
      member: row.member,
      topic: row.topic,
    });
  } catch (error) {
    console.error("Get resource error:", error);
    return NextResponse.json({ error: "Failed to get resource" }, { status: 500 });
  }
}

// PATCH /api/resources/[resourceId] - Update a resource
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await context.params;

    // Check if resource exists and user owns it
    const existingResource = await db.query.resources.findFirst({
      where: eq(resources.id, resourceId),
    });

    if (!existingResource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Only allow owner or admin to update
    if (existingResource.memberId !== member.id && member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const [updatedResource] = await db
      .update(resources)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, resourceId))
      .returning();

    return NextResponse.json(updatedResource);
  } catch (error) {
    console.error("Update resource error:", error);
    return NextResponse.json({ error: "Failed to update resource" }, { status: 500 });
  }
}

// DELETE /api/resources/[resourceId] - Delete a resource
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await context.params;

    // Check if resource exists and user owns it
    const existingResource = await db.query.resources.findFirst({
      where: eq(resources.id, resourceId),
    });

    if (!existingResource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Only allow owner or admin to delete
    if (existingResource.memberId !== member.id && member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by setting status
    await db
      .update(resources)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(resources.id, resourceId));

    // Update topic resource count
    await db
      .update(topics)
      .set({ resourceCount: sql`${topics.resourceCount} - 1` })
      .where(eq(topics.id, existingResource.topicId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete resource error:", error);
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
  }
}
