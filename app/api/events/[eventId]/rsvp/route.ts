import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";

const rsvpSchema = z.object({
	action: z.enum(["rsvp", "cancel"]),
});

type RouteParams = {
	params: Promise<{ eventId: string }>;
};

// POST /api/events/[eventId]/rsvp - RSVP to an event
export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { eventId } = await params;
		const body = await request.json();
		const parsed = rsvpSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const { action } = parsed.data;

		// Get existing event
		const existingEvent = await db.query.events.findFirst({
			where: eq(events.id, eventId),
		});

		if (!existingEvent) {
			return NextResponse.json({ error: "Event not found" }, { status: 404 });
		}

		// Check if event is still open for RSVPs
		if (
			existingEvent.status === "cancelled" ||
			existingEvent.status === "completed"
		) {
			return NextResponse.json(
				{ error: "Event is no longer accepting RSVPs" },
				{ status: 400 },
			);
		}

		const currentAttendees = existingEvent.attendees || [];
		const currentWaitlist = existingEvent.waitlist || [];
		const isAttending = currentAttendees.includes(member.id);
		const isOnWaitlist = currentWaitlist.includes(member.id);

		let newAttendees = [...currentAttendees];
		let newWaitlist = [...currentWaitlist];
		let rsvpStatus: "attending" | "waitlisted" | "cancelled" = "cancelled";

		if (action === "rsvp") {
			if (isAttending) {
				// Already attending
				return NextResponse.json({
					status: "attending",
					attendeeCount: newAttendees.length,
					waitlistCount: newWaitlist.length,
					maxAttendees: existingEvent.maxAttendees,
				});
			}

			if (isOnWaitlist) {
				// Already on waitlist
				return NextResponse.json({
					status: "waitlisted",
					attendeeCount: newAttendees.length,
					waitlistCount: newWaitlist.length,
					maxAttendees: existingEvent.maxAttendees,
				});
			}

			// Check if there's room
			if (
				existingEvent.maxAttendees &&
				newAttendees.length >= existingEvent.maxAttendees
			) {
				// Add to waitlist
				newWaitlist.push(member.id);
				rsvpStatus = "waitlisted";
			} else {
				// Add to attendees
				newAttendees.push(member.id);
				rsvpStatus = "attending";
			}
		} else {
			// Cancel RSVP
			if (isAttending) {
				newAttendees = newAttendees.filter((id) => id !== member.id);

				// Move first person from waitlist to attendees if there's room
				if (newWaitlist.length > 0) {
					const nextAttendee = newWaitlist.shift()!;
					newAttendees.push(nextAttendee);
				}
			} else if (isOnWaitlist) {
				newWaitlist = newWaitlist.filter((id) => id !== member.id);
			}
			rsvpStatus = "cancelled";
		}

		// Update event
		await db
			.update(events)
			.set({
				attendees: newAttendees,
				waitlist: newWaitlist,
				updatedAt: new Date(),
			})
			.where(eq(events.id, eventId));

		return NextResponse.json({
			status: rsvpStatus,
			attendeeCount: newAttendees.length,
			waitlistCount: newWaitlist.length,
			maxAttendees: existingEvent.maxAttendees,
		});
	} catch (error) {
		console.error("RSVP error:", error);
		return NextResponse.json({ error: "Failed to RSVP" }, { status: 500 });
	}
}

// GET /api/events/[eventId]/rsvp - Get current user's RSVP status
export async function GET(request: NextRequest, { params }: RouteParams) {
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

		const currentAttendees = existingEvent.attendees || [];
		const currentWaitlist = existingEvent.waitlist || [];
		const isAttending = currentAttendees.includes(member.id);
		const isOnWaitlist = currentWaitlist.includes(member.id);

		let status: "attending" | "waitlisted" | "not_attending" = "not_attending";
		if (isAttending) status = "attending";
		else if (isOnWaitlist) status = "waitlisted";

		return NextResponse.json({
			status,
			attendeeCount: currentAttendees.length,
			waitlistCount: currentWaitlist.length,
			maxAttendees: existingEvent.maxAttendees,
		});
	} catch (error) {
		console.error("Get RSVP status error:", error);
		return NextResponse.json(
			{ error: "Failed to get RSVP status" },
			{ status: 500 },
		);
	}
}
