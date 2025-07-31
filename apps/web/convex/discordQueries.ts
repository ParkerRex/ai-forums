import { query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to get yesterday's date in YYYY-MM-DD format
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Query to get archived Discord digest for users (database-based digest retrieval)
// Requirements: 4.1, 4.2, 4.3 - Database-based digest retrieval
// This is a separate query file since queries can't be in Node.js files
export const getDiscordDigest = query({
  args: {
    digestDate: v.optional(v.string()), // Defaults to yesterday
    limit: v.optional(v.number()),
    userId: v.optional(v.id("members")),
  },
  handler: async (ctx, args) => {
    const targetDate = args.digestDate || getYesterdayDateString();

    try {
      // Fetch from database archive, sorted by reaction score
      const digestEntries = await ctx.db
        .query("discordDigest")
        .withIndex("by_reaction_score", (q) =>
          q.eq("digestDate", targetDate)
        )
        .order("desc")
        .take(args.limit || 50);

      return digestEntries;

    } catch (error) {
      console.error('Failed to fetch Discord digest:', error);
      return []; // Always return empty array, never throw
    }
  },
});