/**
 * Migration Status Tracking
 * Queries for monitoring Clerk -> Custom Auth migration progress
 */

import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

/**
 * Get migration status overview
 * Returns total users, migrated count, pending count, and percentage
 */
export const getMigrationStatus = query({
  args: {},
  returns: v.object({
    total: v.number(),
    migrated: v.number(),
    pending: v.number(),
    percentageMigrated: v.number(),
    lastUpdated: v.number(),
  }),
  handler: async (ctx) => {
    // Count total users (those with externalId are Clerk users)
    const allMembers = await ctx.db.query("members").collect();
    const clerkUsers = allMembers.filter((m) => m.externalId);
    const total = clerkUsers.length;

    // Count migrated users (those who have set a password)
    const migrated = clerkUsers.filter((m) => m.passwordHash).length;

    // Count pending users (Clerk users without password)
    const pending = total - migrated;

    // Calculate percentage
    const percentageMigrated = total > 0 ? (migrated / total) * 100 : 0;

    return {
      total,
      migrated,
      pending,
      percentageMigrated: Math.round(percentageMigrated * 100) / 100,
      lastUpdated: Date.now(),
    };
  },
});

/**
 * Get detailed list of pending migrations
 * Returns users who haven't migrated yet with their email and migration status
 */
export const getPendingMigrations = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("members"),
      email: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      externalId: v.string(),
      hasMigrationToken: v.boolean(),
      lastLoginAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    // Get all Clerk users without passwordHash
    const allMembers = await ctx.db.query("members").collect();
    const pendingUsers = allMembers
      .filter((m) => m.externalId && !m.passwordHash)
      .slice(0, limit);

    // Check if each user has a migration token
    const results = await Promise.all(
      pendingUsers.map(async (member) => {
        const tokens = await ctx.db
          .query("password_resets")
          .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
          .collect();

        const hasMigrationToken = tokens.some(
          (t) => t.expiresAt > Date.now() && !t.usedAt
        );

        return {
          _id: member._id,
          email: member.email,
          firstName: member.firstName || "",
          lastName: member.lastName || "",
          externalId: member.externalId!,
          hasMigrationToken,
          lastLoginAt: member.lastLoginAt,
        };
      })
    );

    return results;
  },
});

/**
 * Get migration timeline data
 * Returns migration progress over time for charts
 */
export const getMigrationTimeline = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      migrated: v.number(),
      total: v.number(),
      percentage: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const days = args.days ?? 7;

    // Get all members
    const allMembers = await ctx.db.query("members").collect();
    const clerkUsers = allMembers.filter((m) => m.externalId);
    const total = clerkUsers.length;

    // For each day, calculate how many users had migrated by that point
    const timeline: Array<{
      date: string;
      migrated: number;
      total: number;
      percentage: number;
    }> = [];

    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    for (let i = days - 1; i >= 0; i--) {
      const targetDate = now - i * msPerDay;
      const dateStr = new Date(targetDate).toISOString().split("T")[0];

      // Count users who had migrated by this date
      // (approximation: check if passwordHash exists and member was created before this date)
      const migratedCount = clerkUsers.filter((m) => {
        if (!m.passwordHash) return false;
        // If we had lastPasswordChangeAt, we'd use that
        // For now, just count current state
        return true;
      }).length;

      const percentage =
        total > 0 ? Math.round((migratedCount / total) * 10000) / 100 : 0;

      timeline.push({
        date: dateStr,
        migrated: migratedCount,
        total,
        percentage,
      });
    }

    return timeline;
  },
});

/**
 * Get migration statistics by category
 * Returns breakdown by verification status, activity, etc.
 */
export const getMigrationStats = query({
  args: {},
  returns: v.object({
    byVerification: v.object({
      verified: v.number(),
      unverified: v.number(),
    }),
    byActivity: v.object({
      activeLastWeek: v.number(),
      activeLastMonth: v.number(),
      inactive: v.number(),
    }),
    byTokenStatus: v.object({
      tokenSent: v.number(),
      noToken: v.number(),
      tokenExpired: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const allMembers = await ctx.db.query("members").collect();
    const pendingUsers = allMembers.filter((m) => m.externalId && !m.passwordHash);

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Count by verification status
    const verified = pendingUsers.filter((m) => m.emailVerified).length;
    const unverified = pendingUsers.length - verified;

    // Count by activity
    const activeLastWeek = pendingUsers.filter(
      (m) => m.lastLoginAt && m.lastLoginAt > oneWeekAgo
    ).length;
    const activeLastMonth = pendingUsers.filter(
      (m) => m.lastLoginAt && m.lastLoginAt > oneMonthAgo
    ).length;
    const inactive = pendingUsers.length - activeLastMonth;

    // Count by token status
    let tokenSent = 0;
    let noToken = 0;
    let tokenExpired = 0;

    for (const member of pendingUsers) {
      const tokens = await ctx.db
        .query("password_resets")
        .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
        .collect();

      if (tokens.length === 0) {
        noToken++;
      } else {
        const hasValidToken = tokens.some(
          (t) => t.expiresAt > now && !t.usedAt
        );
        if (hasValidToken) {
          tokenSent++;
        } else {
          tokenExpired++;
        }
      }
    }

    return {
      byVerification: {
        verified,
        unverified,
      },
      byActivity: {
        activeLastWeek,
        activeLastMonth,
        inactive,
      },
      byTokenStatus: {
        tokenSent,
        noToken,
        tokenExpired,
      },
    };
  },
});

/**
 * Record migration event (internal use)
 * Logs migration milestones for audit trail
 */
export const recordMigrationEvent = internalMutation({
  args: {
    memberId: v.id("members"),
    event: v.string(),
    details: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // We could create a migration_events table, but for now just log
    console.log(
      `[Migration Event] Member ${args.memberId}: ${args.event}${args.details ? ` - ${args.details}` : ""}`
    );
    return null;
  },
});
