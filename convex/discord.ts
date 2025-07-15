"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createDiscordClient, DiscordMessage, handleDiscordError, RateLimiter } from "../lib/discord";

// Rate limiter instance for Discord API calls
const rateLimiter = new RateLimiter(50, 60000); // 50 requests per minute

export const testDiscordConnection = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; message: string; botUser?: string }> => {
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

// Internal function to fetch Discord messages
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

  try {
    await rateLimiter.waitIfNeeded();
    
    const client = await createDiscordClient(botToken);
    const sinceDate = new Date(args.since);
    
    console.log(`Fetching Discord messages from guild ${guildId} since ${sinceDate.toISOString()}`);
    
    const messages = await client.fetchMessagesFromGuild(
      guildId,
      sinceDate,
      args.channels
    );
    
    await client.disconnect();
    
    // Sort messages by reaction count (descending), then by timestamp (newest first)
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
    console.error("Failed to fetch Discord messages:", discordError);
    throw new Error(`Discord fetch failed: ${discordError.message}`);
  }
}

export const fetchDiscordMessages = action({
  args: {
    guildId: v.optional(v.string()),
    channels: v.optional(v.array(v.string())),
    since: v.number(), // Unix timestamp for "yesterday"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<DiscordMessage[]> => {
    return await _fetchDiscordMessages(args);
  },
});

export const getDiscordDigest = action({
  args: {
    userId: v.optional(v.id("members")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Calculate yesterday's timestamp
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0); // Start of yesterday
      
      const messages = await _fetchDiscordMessages({
        since: yesterday.getTime(),
        limit: args.limit || 20,
      });
      
      // Transform Discord messages to NewsItem format
      // This will be implemented in later tasks when we have the NewsItem interface
      return messages;
      
    } catch (error) {
      console.error("Failed to get Discord digest:", error);
      throw new Error(`Discord digest failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Utility action for testing bot permissions
export const testBotPermissions = action({
  args: {
    guildId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ 
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
      
      // Test guild access and permissions
      const guild = await (client as any).client.guilds.fetch(guildId);
      if (!guild) {
        await client.disconnect();
        return {
          success: false,
          message: `Bot is not in guild ${guildId} or guild not found`
        };
      }
      
      const botMember = await guild.members.fetch((client as any).client.user.id);
      const permissions = botMember.permissions.toArray();
      
      // Test channel access
      const channels = await guild.channels.fetch();
      const textChannels = channels.filter((channel: unknown) => channel?.type === 0);
      
      const channelAccess = [];
      for (const channel of textChannels.values()) {
        const canRead = channel.permissionsFor(botMember)?.has('ViewChannel') && 
                       channel.permissionsFor(botMember)?.has('ReadMessageHistory');
        
        channelAccess.push({
          id: channel.id,
          name: channel.name,
          canRead: !!canRead
        });
      }
      
      await client.disconnect();
      
      return {
        success: true,
        message: "Bot permissions verified successfully",
        permissions,
        channels: channelAccess
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