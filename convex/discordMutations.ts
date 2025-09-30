import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Internal mutation to store Discord messages in the database
export const storeDiscordMessage = internalMutation({
  args: {
    messageId: v.string(),
    content: v.string(),
    author: v.object({
      id: v.string(),
      username: v.string(),
      avatar: v.optional(v.string()),
    }),
    timestamp: v.number(),
    reactions: v.array(
      v.object({
        emoji: v.string(),
        count: v.number(),
      }),
    ),
    channelId: v.string(),
    channelName: v.string(),
    reactionScore: v.number(),
    summary: v.optional(v.string()),
    digestDate: v.string(),
    processedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if message already exists to prevent duplicates
    const existing = await ctx.db
      .query("discordDigest")
      .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
      .first();

    if (existing) {
      console.log(`Skipping duplicate message ${args.messageId}`);
      return { inserted: false, reason: "duplicate" };
    }

    // Store in database
    await ctx.db.insert("discordDigest", args);

    console.log(`Inserted Discord message ${args.messageId}`);
    return { inserted: true };
  },
});

// Helper function to get yesterday's date in YYYY-MM-DD format
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

// Internal query to get Discord digest data (for actions to call)
export const getDiscordDigestQuery = internalQuery({
  args: {
    digestDate: v.optional(v.string()),
    limit: v.optional(v.number()),
    userId: v.optional(v.id("members")),
  },
  handler: async (ctx, args) => {
    const targetDate = args.digestDate || getYesterdayDateString();

    try {
      // Fetch from database archive, sorted by reaction score
      const digestEntries = await ctx.db
        .query("discordDigest")
        .withIndex("by_reaction_score", (q) => q.eq("digestDate", targetDate))
        .order("desc")
        .take(args.limit || 50);

      return digestEntries;
    } catch (error) {
      console.error("Failed to fetch Discord digest:", error);
      return []; // Always return empty array, never throw
    }
  },
});
