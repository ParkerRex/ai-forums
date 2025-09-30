import type { DiscordNewsSource, NewsSource, RawItem } from "./types";

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

export interface DiscordDigestEntry {
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

export async function fetchItems(source: NewsSource): Promise<RawItem[]> {
  // Type guard to ensure this is a Discord source
  if (source.type !== "discord") {
    throw new Error("Invalid source type for Discord fetcher");
  }

  const discordSource = source as DiscordNewsSource;

  try {
    // Fetch Discord digest from database archive (yesterday's processed messages)
    const digestEntries = await fetchDiscordDigestFromArchive({
      guildId: discordSource.guildId,
      channels: discordSource.channels,
      limit: 20, // Reasonable limit for news feed
    });

    // Transform archived Discord messages to RawItem format
    const rawItems = digestEntries.map((entry) => transformDigestEntryToRawItem(entry));

    return rawItems;
  } catch (error) {
    console.error(`Failed to fetch Discord digest for ${discordSource.name}:`, error);

    // Graceful degradation - return empty array to not break news feed
    return [];
  }
}

/**
 * Fetches Discord digest from database archive via Convex API
 */
async function fetchDiscordDigestFromArchive(args: {
  guildId: string;
  channels?: string[];
  limit?: number;
}): Promise<DiscordDigestEntry[]> {
  try {
    const response = await fetch("/api/discord/digest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        guildId: args.guildId,
        channels: args.channels,
        limit: args.limit || 20,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Discord digest API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.digest || [];
  } catch (error) {
    console.error("Error fetching Discord digest:", error);
    throw new Error(
      `Failed to fetch Discord digest: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Fetches Discord messages using the Discord API (PRESERVED for scheduled processing)
 * This function will be moved to the scheduled processing in convex/discord.ts
 */
async function _fetchDiscordMessages(args: {
  guildId: string;
  channels?: string[];
  since: number;
  limit?: number;
}): Promise<DiscordMessage[]> {
  try {
    const response = await fetch("/api/discord/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      throw new Error(`Discord API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error("Error fetching Discord messages:", error);
    throw new Error(
      `Failed to fetch Discord messages: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
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
 * Transforms Discord digest entry to RawItem interface format (for archive-based fetching)
 * Requirements: 2.1, 2.4
 */
function transformDigestEntryToRawItem(entry: DiscordDigestEntry): RawItem {
  // Create a meaningful title from the digest entry
  const title = createDigestEntryTitle(entry);

  // Create Discord message URL using the guild ID from the digest entry
  // Note: We'll need to get the guild ID from the source or store it in the digest entry
  const url = `https://discord.com/channels/1355280592962453585/${entry.channelId}/${entry.messageId}`;

  return {
    title,
    url,
    publishedDate: new Date(entry.timestamp).toISOString(),
    text:
      entry.summary ||
      entry.content ||
      `Message from ${entry.author.username} in #${entry.channelName}`,
  };
}

/**
 * Transforms Discord message to RawItem interface format (PRESERVED for scheduled processing)
 * Requirements: 2.1, 2.4
 */
function _transformDiscordToRawItem(message: DiscordMessage): RawItem {
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
 * Creates a meaningful title for a Discord digest entry
 */
function createDigestEntryTitle(entry: DiscordDigestEntry): string {
  const maxContentLength = 100;

  // If entry has content, use it (truncated)
  if (entry.content?.trim()) {
    const truncatedContent =
      entry.content.length > maxContentLength
        ? `${entry.content.substring(0, maxContentLength)}...`
        : entry.content;

    // Add reaction indicator using pre-calculated reaction score
    const reactionIndicator = entry.reactionScore > 0 ? ` (${entry.reactionScore} reactions)` : "";

    return `${entry.author.username}: ${truncatedContent}${reactionIndicator}`;
  }

  // Fallback title for entries without content (e.g., media only)
  const reactionIndicator = entry.reactionScore > 0 ? ` with ${entry.reactionScore} reactions` : "";
  return `${entry.author.username} in #${entry.channelName}${reactionIndicator}`;
}

/**
 * Creates a meaningful title for a Discord message (PRESERVED for scheduled processing)
 */
function createMessageTitle(message: DiscordMessage): string {
  const maxContentLength = 100;
  const reactionCount = message.reactions.reduce((sum, r) => sum + r.count, 0);

  // If message has content, use it (truncated)
  if (message.content?.trim()) {
    const truncatedContent =
      message.content.length > maxContentLength
        ? `${message.content.substring(0, maxContentLength)}...`
        : message.content;

    // Add reaction indicator if there are reactions
    const reactionIndicator = reactionCount > 0 ? ` (${reactionCount} reactions)` : "";

    return `${message.author.username}: ${truncatedContent}${reactionIndicator}`;
  }

  // Fallback title for messages without content (e.g., media only)
  const reactionIndicator = reactionCount > 0 ? ` with ${reactionCount} reactions` : "";
  return `${message.author.username} in #${message.channelName}${reactionIndicator}`;
}
