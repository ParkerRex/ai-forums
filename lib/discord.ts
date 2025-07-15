import { Client, GatewayIntentBits, TextChannel, Message } from 'discord.js';

export interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  timestamp: string;
  reactions: Array<{
    emoji: string;
    count: number;
  }>;
  channelId: string;
  channelName: string;
}

export class DiscordClient {
  private client: Client;
  private isReady: boolean = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.client.on('ready', () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
      this.isReady = true;
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });
  }

  async connect(token: string): Promise<void> {
    try {
      await this.client.login(token);
      
      // Wait for the client to be ready
      if (!this.isReady) {
        await new Promise((resolve) => {
          this.client.once('ready', resolve);
        });
      }
    } catch (error) {
      console.error('Failed to connect to Discord:', error);
      throw new Error(`Discord connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.destroy();
      this.isReady = false;
    } catch (error) {
      console.error('Error disconnecting from Discord:', error);
    }
  }

  async fetchMessagesFromGuild(
    guildId: string,
    since: Date,
    channels?: string[]
  ): Promise<DiscordMessage[]> {
    if (!this.isReady) {
      throw new Error('Discord client is not ready');
    }

    try {
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) {
        throw new Error(`Guild with ID ${guildId} not found`);
      }

      const allMessages: DiscordMessage[] = [];
      const guildChannels = await guild.channels.fetch();
      
      // Filter to text channels only
      const textChannels = guildChannels.filter(
        (channel): channel is TextChannel => 
          channel?.type === 0 && // GUILD_TEXT
          (!channels || channels.includes(channel.id) || channels.includes(channel.name))
      );

      for (const channel of textChannels.values()) {
        try {
          const messages = await this.fetchMessagesFromChannel(channel, since);
          allMessages.push(...messages);
        } catch (error) {
          console.error(`Error fetching messages from channel ${channel.name}:`, error);
          // Continue with other channels even if one fails
        }
      }

      return allMessages;
    } catch (error) {
      console.error('Error fetching messages from guild:', error);
      throw new Error(`Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchMessagesFromChannel(
    channel: TextChannel,
    since: Date
  ): Promise<DiscordMessage[]> {
    const messages: DiscordMessage[] = [];
    let lastMessageId: string | undefined;
    const limit = 100; // Discord API limit per request

    try {
      while (true) {
        const fetchedMessages = await channel.messages.fetch({
          limit,
          before: lastMessageId,
        });

        if (fetchedMessages.size === 0) break;

        const relevantMessages = fetchedMessages.filter(
          (message) => message.createdAt >= since
        );

        if (relevantMessages.size === 0) break;

        for (const message of relevantMessages.values()) {
          const discordMessage = await this.transformMessage(message, channel.name);
          messages.push(discordMessage);
        }

        lastMessageId = fetchedMessages.last()?.id;
        
        // If we got fewer messages than the limit, we've reached the end
        if (fetchedMessages.size < limit) break;
        
        // Check if the oldest message is before our since date
        const oldestMessage = fetchedMessages.last();
        if (oldestMessage && oldestMessage.createdAt < since) break;
      }

      return messages;
    } catch (error) {
      console.error(`Error fetching messages from channel ${channel.name}:`, error);
      throw error;
    }
  }

  private async transformMessage(message: Message, channelName: string): Promise<DiscordMessage> {
    const reactions: Array<{ emoji: string; count: number }> = [];
    
    // Process reactions
    for (const reaction of message.reactions.cache.values()) {
      reactions.push({
        emoji: reaction.emoji.name || reaction.emoji.toString(),
        count: reaction.count,
      });
    }

    return {
      id: message.id,
      content: message.content,
      author: {
        id: message.author.id,
        username: message.author.username,
        avatar: message.author.avatar || undefined,
      },
      timestamp: message.createdAt.toISOString(),
      reactions,
      channelId: message.channelId,
      channelName,
    };
  }

  isConnected(): boolean {
    return this.isReady && this.client.readyAt !== null;
  }
}

// Utility function to create and manage a Discord client instance
export async function createDiscordClient(token: string): Promise<DiscordClient> {
  const client = new DiscordClient();
  await client.connect(token);
  return client;
}

// Error handling utilities
export class DiscordError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'DiscordError';
  }
}

export function handleDiscordError(error: unknown): DiscordError {
  if (error instanceof DiscordError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new DiscordError(error.message);
  }
  
  return new DiscordError('Unknown Discord error occurred');
}

// Rate limiting utilities
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number = 50, timeWindowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}