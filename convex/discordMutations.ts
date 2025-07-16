import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

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
    reactions: v.array(v.object({
      emoji: v.string(),
      count: v.number(),
    })),
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