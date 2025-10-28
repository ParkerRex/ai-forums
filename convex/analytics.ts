/**
 * Analytics Functions
 *
 * Convex functions for tracking and querying analytics events.
 * Provides mutations for event ingestion and queries for analytics dashboards.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Track an analytics event
 *
 * Stores the event in the analyticsEvents table for later analysis.
 * Automatically captures timestamp and supports optional user context.
 */
export const trackEvent = mutation({
  args: {
    event: v.string(),
    properties: v.optional(v.any()),
    sessionId: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  returns: v.id("analyticsEvents"),
  handler: async (ctx, args) => {
    // Get current user if authenticated
    const identity = await ctx.auth.getUserIdentity();
    let userId = undefined;

    if (identity) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
        .unique();
      userId = member?._id;
    }

    // Store the analytics event
    const eventId = await ctx.db.insert("analyticsEvents", {
      event: args.event,
      userId,
      properties: args.properties,
      timestamp: Date.now(),
      sessionId: args.sessionId,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });

    return eventId;
  },
});

/**
 * Get events by type
 *
 * Retrieves all events of a specific type, ordered by timestamp (newest first).
 * Useful for analyzing specific user actions or funnel steps.
 */
export const getEventsByType = query({
  args: {
    event: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    return await ctx.db
      .query("analyticsEvents")
      .withIndex("by_event", (q) => q.eq("event", args.event))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get events by user
 *
 * Retrieves all events for a specific user, ordered by timestamp (newest first).
 * Useful for analyzing individual user behavior and journey.
 */
export const getEventsByUser = query({
  args: {
    userId: v.id("members"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    return await ctx.db
      .query("analyticsEvents")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get event count by type
 *
 * Returns the total count of events for a specific event type.
 * Useful for dashboard metrics and KPIs.
 */
export const getEventCount = query({
  args: {
    event: v.string(),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_event", (q) => q.eq("event", args.event))
      .collect();

    // Filter by time range if provided
    if (args.startTime || args.endTime) {
      return events.filter((e) => {
        if (args.startTime && e.timestamp < args.startTime) return false;
        if (args.endTime && e.timestamp > args.endTime) return false;
        return true;
      }).length;
    }

    return events.length;
  },
});

/**
 * Get recent events
 *
 * Retrieves the most recent events across all types.
 * Useful for real-time monitoring dashboards.
 */
export const getRecentEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    return await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});
