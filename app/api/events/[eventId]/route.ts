import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { events, members } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

const locationSchema = z.object({
  type: z.enum(["online", "in-person", "hybrid"]),
  details: z.string().optional(),
  platform: z.string().optional(),
  address: z.string().optional(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

const resourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  timezone: z.string().optional(),
  type: z.enum(["community_call", "watch_party", "workshop", "meetup", "other"]).optional(),
  location: locationSchema.optional(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  requiresRSVP: z.boolean().optional(),
  streamUrl: z.string().url().optional().nullable(),
  recordingUrl: z.string().url().optional().nullable(),
  resources: z.array(resourceSchema).optional(),
  status: z.enum(["upcoming", "live", "completed", "cancelled"]).optional(),
});

type RouteParams = {
  params: Promise<{ eventId: string }>;
};

// GET /api/events/[eventId] - Get a single event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;

    const result = await db
      .select({
        event: events,
        creator: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          slug: members.slug,
          avatarUrl: members.avatarUrl,
        },
      })
      .from(events)
      .innerJoin(members, eq(events.createdBy, members.id))
      .where(eq(events.id, eventId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const row = result[0];
    return NextResponse.json({
      ...row.event,
      startTime: row.event.startTime.getTime(),
      endTime: row.event.endTime?.getTime() ?? null,
      createdAt: row.event.createdAt.getTime(),
      updatedAt: row.event.updatedAt.getTime(),
      creator: row.creator,
    });
  } catch (error) {
    console.error("Get event error:", error);
    return NextResponse.json({ error: "Failed to get event" }, { status: 500 });
  }
}

// PATCH /api/events/[eventId] - Update an event
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Get existing event
    const existingEvent = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check ownership or admin
    if (existingEvent.createdBy !== member.id && member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.startTime !== undefined) updateData.startTime = new Date(parsed.data.startTime);
    if (parsed.data.endTime !== undefined)
      updateData.endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : null;
    if (parsed.data.timezone !== undefined) updateData.timezone = parsed.data.timezone;
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.location !== undefined) updateData.location = parsed.data.location;
    if (parsed.data.maxAttendees !== undefined) updateData.maxAttendees = parsed.data.maxAttendees;
    if (parsed.data.requiresRSVP !== undefined) updateData.requiresRSVP = parsed.data.requiresRSVP;
    if (parsed.data.streamUrl !== undefined) updateData.streamUrl = parsed.data.streamUrl;
    if (parsed.data.recordingUrl !== undefined) updateData.recordingUrl = parsed.data.recordingUrl;
    if (parsed.data.resources !== undefined) updateData.resources = parsed.data.resources;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

    const [updatedEvent] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, eventId))
      .returning();

    return NextResponse.json({
      ...updatedEvent,
      startTime: updatedEvent.startTime.getTime(),
      endTime: updatedEvent.endTime?.getTime() ?? null,
      createdAt: updatedEvent.createdAt.getTime(),
      updatedAt: updatedEvent.updatedAt.getTime(),
    });
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

// DELETE /api/events/[eventId] - Delete an event (or cancel it)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;

    const existingEvent = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check ownership or admin
    if (existingEvent.createdBy !== member.id && member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by setting status to cancelled
    await db
      .update(events)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(events.id, eventId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
