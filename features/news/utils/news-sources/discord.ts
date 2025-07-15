import { NewsSource, DiscordNewsSource, RawItem } from "./types";

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

export async function fetchItems(source: NewsSource): Promise<RawItem[]> {
  // Type guard to ensure this is a Discord source
  if (source.type !== "discord") {
    throw new Error("Invalid source type for Discord fetcher");
  }
  
  const discordSource = source as DiscordNewsSource;
  
  try {
    // Calculate yesterday's timestamp (previous day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // Start of yesterday
    
    // Fetch Discord messages from the previous day
    const messages = await fetchDiscordMessages({
      guildId: discordSource.guildId,
      channels: discordSource.channels,
      since: yesterday.getTime(),
      limit: 20 // Reasonable limit for news feed
    });
    
    // Rank messages by reaction count with chronological fallback
    const rankedMessages = rankDiscordMessages(messages);
    
    // Transform Discord messages to RawItem format
    const rawItems = rankedMessages.map(message => transformDiscordToRawItem(message));
    
    return rawItems;
    
  } catch (error) {
    console.error(`Failed to fetch Discord messages for ${discordSource.name}:`, error);
    
    // Graceful degradation - return empty array to not break news feed
    return [];
  }
}

/**
 * Fetches Discord messages using the Convex backend
 */
async function fetchDiscordMessages(args: {
  guildId: string;
  channels?: string[];
  since: number;
  limit?: number;
}): Promise<DiscordMessage[]> {
  try {
    const response = await fetch('/api/discord/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    
    if (!response.ok) {
      throw new Error(`Discord API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.messages || [];
    
  } catch (error) {
    console.error('Error fetching Discord messages:', error);
    throw new Error(`Failed to fetch Discord messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Ranks Discord messages by reaction count with chronological fallback
 * Requirements: 2.2, 2.3, 2.4
 */
export function rankDiscordMessages(messages: DiscordMessage[]): DiscordMessage[] {
  return messages.sort((a, b) => {
    // Calculate total reaction count for each message
    const aReactions = a.reactions.reduce((sum, r) => sum + r.count, 0);
    const bReactions = b.reactions.reduce((sum, r) => sum + r.count, 0);
    
    // Primary sort: reaction count (descending)
    if (aReactions !== bReactions) {
      return bReactions - aReactions;
    }
    
    // Secondary sort: timestamp (newest first) - chronological fallback
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Transforms Discord message to RawItem interface format
 * Requirements: 2.1, 2.4
 */
function transformDiscordToRawItem(message: DiscordMessage): RawItem {
  // Create a meaningful title from the message
  const title = createMessageTitle(message);
  
  // Create Discord message URL (need guild ID for proper Discord URL format)
  // Note: We'll need to pass guild ID through the message or get it from context
  const url = `https://discord.com/channels/${message.channelId}/${message.id}`;
  
  return {
    title,
    url,
    publishedDate: message.timestamp,
    text: message.content || `Message from ${message.author.username} in #${message.channelName}`,
  };
}

/**
 * Creates a meaningful title for a Discord message
 */
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