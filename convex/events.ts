import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedMember } from "./auth";

export const getEventsByMonth = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, { year, month }) => {
    const startOfMonth = new Date(year, month, 1).getTime();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    
    const events = await ctx.db
      .query("events")
      .withIndex("by_startTime")
      .filter((q) => 
        q.and(
          q.gte(q.field("startTime"), startOfMonth),
          q.lte(q.field("startTime"), endOfMonth),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const creator = await ctx.db.get(event.createdBy);
        return {
          ...event,
          creator: creator ? {
            _id: creator._id,
            firstName: creator.firstName,
            lastName: creator.lastName,
            slug: creator.slug,
          } : null,
        };
      })
    );

    return enrichedEvents;
  },
});

export const getEventById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) return null;

    const creator = await ctx.db.get(event.createdBy);
    return {
      ...event,
      creator: creator ? {
        _id: creator._id,
        firstName: creator.firstName,
        lastName: creator.lastName,
        slug: creator.slug,
      } : null,
    };
  },
});

export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    timezone: v.string(),
    type: v.union(
      v.literal("community_call"),
      v.literal("watch_party"),
      v.literal("workshop"),
      v.literal("meetup"),
      v.literal("other")
    ),
    location: v.object({
      type: v.union(v.literal("virtual"), v.literal("physical")),
      details: v.string(),
      platform: v.optional(v.union(
        v.literal("zoom"),
        v.literal("discord"),
        v.literal("youtube"),
        v.literal("other")
      )),
    }),
    maxAttendees: v.optional(v.number()),
    requiresRSVP: v.boolean(),
    streamUrl: v.optional(v.string()),
    resources: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const member = await getAuthenticatedMember(ctx);
    const now = Date.now();

    const eventId = await ctx.db.insert("events", {
      ...args,
      createdBy: member._id,
      attendees: [],
      waitlist: [],
      status: "upcoming",
      resources: args.resources || [],
      createdAt: now,
      updatedAt: now,
    });

    return eventId;
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    timezone: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("community_call"),
      v.literal("watch_party"),
      v.literal("workshop"),
      v.literal("meetup"),
      v.literal("other")
    )),
    location: v.optional(v.object({
      type: v.union(v.literal("virtual"), v.literal("physical")),
      details: v.string(),
      platform: v.optional(v.union(
        v.literal("zoom"),
        v.literal("discord"),
        v.literal("youtube"),
        v.literal("other")
      )),
    })),
    maxAttendees: v.optional(v.number()),
    requiresRSVP: v.optional(v.boolean()),
    streamUrl: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("upcoming"),
      v.literal("live"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    resources: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
    }))),
  },
  handler: async (ctx, { eventId, ...updates }) => {
    const member = await getAuthenticatedMember(ctx);
    const event = await ctx.db.get(eventId);
    
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.createdBy !== member._id && member.role !== "admin") {
      throw new Error("Not authorized to edit this event");
    }

    await ctx.db.patch(eventId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return eventId;
  },
});

export const deleteEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const member = await getAuthenticatedMember(ctx);
    const event = await ctx.db.get(eventId);
    
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.createdBy !== member._id && member.role !== "admin") {
      throw new Error("Not authorized to delete this event");
    }

    await ctx.db.patch(eventId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return eventId;
  },
});

export const rsvpToEvent = mutation({
  args: { 
    eventId: v.id("events"),
    action: v.union(v.literal("attend"), v.literal("cancel"))
  },
  handler: async (ctx, { eventId, action }) => {
    const member = await getAuthenticatedMember(ctx);
    const event = await ctx.db.get(eventId);
    
    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.requiresRSVP) {
      throw new Error("This event does not require RSVP");
    }

    const currentAttendees = event.attendees || [];
    const currentWaitlist = event.waitlist || [];
    
    if (action === "attend") {
      const newWaitlist = currentWaitlist.filter(id => id !== member._id);
      
      if (!currentAttendees.includes(member._id)) {
        if (!event.maxAttendees || currentAttendees.length < event.maxAttendees) {
          await ctx.db.patch(eventId, {
            attendees: [...currentAttendees, member._id],
            waitlist: newWaitlist,
            updatedAt: Date.now(),
          });
        } else {
          await ctx.db.patch(eventId, {
            waitlist: [...newWaitlist, member._id],
            updatedAt: Date.now(),
          });
        }
      }
    } else {
      const newAttendees = currentAttendees.filter(id => id !== member._id);
      const newWaitlist = currentWaitlist.filter(id => id !== member._id);
      
      await ctx.db.patch(eventId, {
        attendees: newAttendees,
        waitlist: newWaitlist,
        updatedAt: Date.now(),
      });
    }

    return eventId;
  },
});
