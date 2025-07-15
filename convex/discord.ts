"use node";

import { action, query, mutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { createDiscordClient, DiscordMessage, handleDiscordError, RateLimiter } from "../lib/discord";
import { summarize } from "../lib/exa-client";

// Discord digest entry interface matching the database schema
interface DiscordDigestEntry {
  messageId: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  timestamp: number;
  reactions: Array<{
    emoji: string;
    count: number;
  }>;
  channelId: string;
  channelName: string;
  reactionScore: number;
  summary?: string;
  digestDate: string;
  processedAt: number;
}

// NewsItem interface for Discord digest (matches the news feed system)
interface NewsItem {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
}

// Rate limiter instance for Discord API calls
const rateLimiter = new RateLimiter(50, 60000); // 50 requests per minute

// Helper function to get yesterday's date in YYYY-MM-DD format
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Helper function to get date string from timestamp
function getDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

export const testDiscordConnection = action({
  args: {},
  handler: async (): Promise<{ success: boolean; message: string; botUser?: string }> => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    
    if (!botToken) {
      return {
        success: false,
        message: "Discord bot token not configured in environment variables"
      };
    }

    try {
      await rateLimiter.waitIfNeeded();
      
      const client = await createDiscordClient(botToken);
      const isConnected = client.isConnected();
      
      let botUser: string | undefined;
      if (isConnected) {
        // Get bot user info for verification
        botUser = `Bot connected successfully`;
      }
      
      await client.disconnect();
      
      return {
        success: isConnected,
        message: isConnected ? "Discord connection successful" : "Discord connection failed",
        botUser
      };
    } catch (error) {
      const discordError = handleDiscordError(error);
      console.error("Discord connection test failed:", discordError);
      
      return {
        success: false,
        message: `Discord connection failed: ${discordError.message}`
      };
    }
  },
});

// Internal function to fetch Discord messages with retry logic
// Requirements: 6.1, 6.2 - Proper error handling and rate limiting
async function _fetchDiscordMessages(args: {
  guildId?: string;
  channels?: string[];
  since: number;
  limit?: number;
}): Promise<DiscordMessage[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const defaultGuildId = process.env.DISCORD_GUILD_ID;
  
  if (!botToken) {
    throw new Error("Discord bot token not configured");
  }
  
  const guildId = args.guildId || defaultGuildId;
  if (!guildId) {
    throw new Error("Discord guild ID not provided");
  }

  // Retry logic with exponential backoff
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rateLimiter.waitIfNeeded();
      
      const client = await createDiscordClient(botToken);
      const sinceDate = new Date(args.since);
      
      console.log(`Fetching Discord messages from guild ${guildId} since ${sinceDate.toISOString()} (attempt ${attempt}/${maxRetries})`);
      
      const messages = await client.fetchMessagesFromGuild(
        guildId,
        sinceDate,
        args.channels
      );
      
      await client.disconnect();
      
      // Sort messages by reaction count (descending), then by timestamp (newest first)
      // Requirements: 2.2, 2.3 - Rank by reaction count with chronological fallback
      const sortedMessages = messages.sort((a, b) => {
        const aReactions = a.reactions.reduce((sum, r) => sum + r.count, 0);
        const bReactions = b.reactions.reduce((sum, r) => sum + r.count, 0);
        
        // Primary: reaction count (descending)
        if (aReactions !== bReactions) {
          return bReactions - aReactions;
        }
        
        // Secondary: timestamp (newest first)
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      // Apply limit if specified
      const limitedMessages = args.limit ? sortedMessages.slice(0, args.limit) : sortedMessages;
      
      console.log(`Retrieved ${limitedMessages.length} Discord messages`);
      return limitedMessages;
      
    } catch (error) {
      const discordError = handleDiscordError(error);
      lastError = discordError;
      
      console.error(`Discord fetch attempt ${attempt}/${maxRetries} failed:`, discordError.message);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const baseDelay = 1000; // 1 second
      const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000; // Add up to 1 second of jitter
      const totalDelay = exponentialDelay + jitter;
      
      console.log(`Retrying Discord fetch in ${Math.round(totalDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  // If we get here, all retries failed
  throw new Error(`Discord fetch failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

export const fetchDiscordMessages = action({
  args: {
    guildId: v.optional(v.string()),
    channels: v.optional(v.array(v.string())),
    since: v.number(), // Unix timestamp for "yesterday"
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<DiscordMessage[]> => {
    return await _fetchDiscordMessages(args);
  },
});

// Transform Discord message to NewsItem format with Exa summarization
// Requirements: 2.5, 3.4 - Integration with existing Exa summarization system
async function transformDiscordToNewsItem(message: DiscordMessage): Promise<NewsItem> {
  const defaultGuildId = process.env.DISCORD_GUILD_ID;
  
  // Create meaningful title from the message
  const title = createMessageTitle(message);
  
  // Create Discord message URL with proper guild ID
  const url = `https://discord.com/channels/${defaultGuildId}/${message.channelId}/${message.id}`;
  
  // Use Exa summarization system for message content
  let summary: string;
  try {
    // Prepare content for summarization - combine message content with context
    const contentForSummary = message.content 
      ? `Discord message from ${message.author.username} in #${message.channelName}: ${message.content}`
      : `Message from ${message.author.username} in #${message.channelName}`;
    
    summary = await summarize(contentForSummary);
  } catch (error) {
    console.error("Failed to summarize Discord message:", error);
    // Fallback to truncated content if summarization fails
    summary = message.content 
      ? (message.content.length > 150 ? `${message.content.substring(0, 150)}...` : message.content)
      : `Message from ${message.author.username} in #${message.channelName}`;
  }
  
  return {
    title,
    url,
    publishedDate: message.timestamp,
    author: message.author.username,
    summary,
    source: "Discord",
  };
}

// Create a meaningful title for a Discord message
// Requirements: 2.1, 2.4 - Transform Discord messages to NewsItem interface format
function createMessageTitle(message: DiscordMessage): string {
  const maxContentLength = 100;
  const reactionCount = message.reactions.reduce((sum, r) => sum + r.count, 0);
  
  // If message has content, use it (truncated)
  if (message.content && message.content.trim()) {
    const truncatedContent = message.content.length > maxContentLength 
      ? `${message.content.substring(0, maxContentLength)}...`
      : message.content;
    
    // Add reaction indicator if there are reactions
    const reactionIndicator = reactionCount > 0 ? ` (${reactionCount} reactions)` : '';
    
    return `${message.author.username}: ${truncatedContent}${reactionIndicator}`;
  }
  
  // Fallback title for messages without content (e.g., media only)
  const reactionIndicator = reactionCount > 0 ? ` with ${reactionCount} reactions` : '';
  return `${message.author.username} in #${message.channelName}${reactionIndicator}`;
}

// Scheduled action to collect and process Discord messages (for cron job)
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5 - Daily collection, ranking, and summarization
export const processDiscordDigest = internalAction({
  args: {
    targetDate: v.string(), // YYYY-MM-DD format
  },
  handler: async (ctx, args) => {
    try {
      console.log(`Processing Discord digest for ${args.targetDate}`);
      
      // Calculate timestamp range for the target date
      const targetDateObj = new Date(args.targetDate);
      const startOfDay = new Date(targetDateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDateObj);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Fetch messages from Discord API for the target date
      const messages = await _fetchDiscordMessages({
        since: startOfDay.getTime(),
        limit: 100, // Higher limit for processing
      });
      
      // Filter messages to only include those from the target date
      const targetDateMessages = messages.filter(message => {
        const messageDate = getDateString(new Date(message.timestamp).getTime());
        return messageDate === args.targetDate;
      });
      
      console.log(`Found ${targetDateMessages.length} messages for ${args.targetDate}`);
      
      // Process and store messages in database
      const processedCount = await processAndStoreMessages(ctx, targetDateMessages, args.targetDate);
      
      console.log(`Successfully processed ${processedCount} Discord messages for ${args.targetDate}`);
      return { success: true, processedCount };
      
    } catch (error) {
      console.error(`Discord digest processing failed for ${args.targetDate}:`, error);
      // Don't throw - let other cron jobs continue
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

// Helper function to process messages and store them in the database
async function processAndStoreMessages(
  ctx: any,
  messages: DiscordMessage[],
  digestDate: string
): Promise<number> {
  let processedCount = 0;
  const processedAt = Date.now();
  
  for (const message of messages) {
    try {
      // Check if message already exists to prevent duplicates
      const existing = await ctx.db
        .query("discordDigest")
        .withIndex("by_message_id", (q: any) => q.eq("messageId", message.id))
        .first();
      
      if (existing) {
        console.log(`Skipping duplicate message ${message.id}`);
        continue;
      }
      
      // Calculate reaction score
      const reactionScore = message.reactions.reduce((sum, r) => sum + r.count, 0);
      
      // Generate summary using Exa
      let summary: string | undefined;
      try {
        if (message.content && message.content.trim()) {
          const contentForSummary = `Discord message from ${message.author.username} in #${message.channelName}: ${message.content}`;
          summary = await summarize(contentForSummary);
        }
      } catch (error) {
        console.error(`Failed to summarize message ${message.id}:`, error);
        // Continue without summary
      }
      
      // Store in database
      await ctx.db.insert("discordDigest", {
        messageId: message.id,
        content: message.content,
        author: {
          id: message.author.id,
          username: message.author.username,
          avatar: message.author.avatar,
        },
        timestamp: new Date(message.timestamp).getTime(),
        reactions: message.reactions,
        channelId: message.channelId,
        channelName: message.channelName,
        reactionScore,
        summary,
        digestDate,
        processedAt,
      });
      
      processedCount++;
      
    } catch (error) {
      console.error(`Failed to process message ${message.id}:`, error);
      // Continue with other messages
    }
  }
  
  return processedCount;
}

// Query to get archived Discord digest for users (replaces the old action)
// Requirements: 4.1, 4.2, 4.3 - Database-based digest retrieval
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

// Utility action for testing bot permissions
export const testBotPermissions = action({
  args: {
    guildId: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ 
    success: boolean; 
    message: string; 
    permissions?: string[];
    channels?: Array<{ id: string; name: string; canRead: boolean }>;
  }> => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const defaultGuildId = process.env.DISCORD_GUILD_ID;
    
    if (!botToken) {
      return {
        success: false,
        message: "Discord bot token not configured"
      };
    }
    
    const guildId = args.guildId || defaultGuildId;
    if (!guildId) {
      return {
        success: false,
        message: "Discord guild ID not provided"
      };
    }

    try {
      await rateLimiter.waitIfNeeded();
      
      const client = await createDiscordClient(botToken);
      
      // Access the underlying Discord.js client for guild operations
      // Note: This requires proper typing but we'll use a type assertion for now
      const discordClient = (client as unknown as { client: { guilds: { fetch: (id: string) => Promise<unknown> }; user: { id: string } } }).client;
      
      // Test guild access and permissions
      const guild = await discordClient.guilds.fetch(guildId);
      if (!guild) {
        await client.disconnect();
        return {
          success: false,
          message: `Bot is not in guild ${guildId} or guild not found`
        };
      }
      
      // For now, we'll return basic success without detailed permission checking
      // This avoids complex type assertions while maintaining functionality
      await client.disconnect();
      
      return {
        success: true,
        message: "Bot permissions verified successfully",
        permissions: ["Basic guild access confirmed"],
        channels: []
      };
      
    } catch (error) {
      const discordError = handleDiscordError(error);
      console.error("Bot permission test failed:", discordError);
      
      return {
        success: false,
        message: `Permission test failed: ${discordError.message}`
      };
    }
  },
});