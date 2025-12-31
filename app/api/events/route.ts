import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, members } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { z } from "zod";
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

const createEventSchema = z.object({
	title: z.string().min(1).max(255),
	description: z.string().optional(),
	startTime: z.number(), // Unix timestamp in milliseconds
	endTime: z.number().optional(),
	timezone: z.string().default("UTC"),
	type: z
		.enum(["community_call", "watch_party", "workshop", "meetup", "other"])
		.default("other"),
	location: locationSchema.optional(),
	maxAttendees: z.number().int().positive().optional(),
	requiresRSVP: z.boolean().default(false),
	streamUrl: z.string().url().optional(),
	resources: z.array(resourceSchema).optional(),
});

// GET /api/events - List events with optional filters
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = request.nextUrl;
		const year = searchParams.get("year");
		const month = searchParams.get("month");
		const status = searchParams.get("status");
		const type = searchParams.get("type");
		const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

		// Build conditions array
		const conditions = [];

		// Filter by month/year if provided
		if (year && month) {
			const yearNum = parseInt(year);
			const monthNum = parseInt(month);
			const startOfMonth = new Date(yearNum, monthNum, 1);
			const endOfMonth = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);

			conditions.push(gte(events.startTime, startOfMonth));
			conditions.push(lte(events.startTime, endOfMonth));
		}

		// Filter by status if provided
		if (status) {
			conditions.push(eq(events.status, status));
		}

		// Filter by type if provided
		if (type) {
			conditions.push(eq(events.type, type));
		}

		const query = db
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
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(desc(events.startTime))
			.limit(limit);

		const result = await query;

		return NextResponse.json({
			items: result.map((row) => ({
				...row.event,
				// Convert timestamps to numbers for consistency
				startTime: row.event.startTime.getTime(),
				endTime: row.event.endTime?.getTime() ?? null,
				createdAt: row.event.createdAt.getTime(),
				updatedAt: row.event.updatedAt.getTime(),
				creator: row.creator,
			})),
		});
	} catch (error) {
		console.error("Get events error:", error);
		return NextResponse.json(
			{ error: "Failed to get events" },
			{ status: 500 },
		);
	}
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const parsed = createEventSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const {
			title,
			description,
			startTime,
			endTime,
			timezone,
			type,
			location,
			maxAttendees,
			requiresRSVP,
			streamUrl,
			resources,
		} = parsed.data;

		const [newEvent] = await db
			.insert(events)
			.values({
				title,
				description,
				startTime: new Date(startTime),
				endTime: endTime ? new Date(endTime) : null,
				timezone,
				type,
				location,
				createdBy: member.id,
				maxAttendees,
				requiresRSVP,
				streamUrl,
				resources: resources || [],
				attendees: [],
				waitlist: [],
				status: "upcoming",
			})
			.returning();

		return NextResponse.json(
			{
				...newEvent,
				startTime: newEvent.startTime.getTime(),
				endTime: newEvent.endTime?.getTime() ?? null,
				createdAt: newEvent.createdAt.getTime(),
				updatedAt: newEvent.updatedAt.getTime(),
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Create event error:", error);
		return NextResponse.json(
			{ error: "Failed to create event" },
			{ status: 500 },
		);
	}
}
