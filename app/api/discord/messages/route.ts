/**
 * @fileoverview Discord Messages API Route
 *
 * This API endpoint fetches Discord messages from the VAI Discord server
 * for the Discord Daily Digest feature. It calls the Discord API directly
 * to retrieve messages from the previous day, ranked by reaction count.
 *
 * @route POST /api/discord/messages
 * @returns {object} JSON response containing Discord messages
 *
 * @example
 * ```typescript
 * // Request body
 * {
 *   "guildId": "1355280592962453585",
 *   "channels": ["general", "announcements"],
 *   "since": 1642723200000,
 *   "limit": 20
 * }
 *
 * // Success response
 * {
 *   "messages": [
 *     {
 *       "id": "123456789",
 *       "content": "Check out this new AI development!",
 *       "author": { "id": "user1", "username": "testuser" },
 *       "timestamp": "2025-01-14T10:00:00Z",
 *       "reactions": [{ "emoji": "👍", "count": 5 }],
 *       "channelId": "general",
 *       "channelName": "general"
 *     }
 *   ]
 * }
 * ```
 *
 * @author VAI Team
 * @since 1.0.0
 */

import { type NextRequest, NextResponse } from "next/server";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DEFAULT_GUILD_ID = "1355280592962453585"; // VAI Discord server

interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  timestamp: string;
  reactions?: Array<{
    emoji: { name: string };
    count: number;
  }>;
  channel_id: string;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

async function fetchDiscordChannels(guildId: string): Promise<DiscordChannel[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("Discord bot token not configured");
  }

  const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
    headers: {
      Authorization: `Bot ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch channels: ${response.status}`);
  }

  return response.json();
}

async function fetchChannelMessages(
  channelId: string,
  since: number,
  limit: number
): Promise<DiscordMessage[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("Discord bot token not configured");
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`,
    {
      headers: {
        Authorization: `Bot ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 403) {
      // Bot doesn't have access to this channel
      return [];
    }
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }

  const messages: DiscordMessage[] = await response.json();

  // Filter by timestamp
  return messages.filter((msg) => new Date(msg.timestamp).getTime() >= since);
}

/**
 * Fetches Discord messages from the specified guild and channels.
 *
 * This endpoint serves as a bridge between the client-side news source fetcher
 * and the Convex backend Discord functions. It handles authentication and
 * error handling for Discord API integration.
 *
 * @param {NextRequest} request - The incoming request with Discord fetch parameters
 * @returns {Promise<NextResponse>} JSON response containing Discord messages
 *
 * @example
 * ```typescript
 * // POST /api/discord/messages
 * const response = await fetch('/api/discord/messages', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     guildId: '1355280592962453585',
 *     since: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
 *     limit: 20
 *   })
 * });
 * const data = await response.json();
 * ```
 *
 * @throws {Error} When Discord API is unreachable or returns an error
 *
 * @performance
 * - Delegates heavy lifting to Convex backend for optimal performance
 * - Implements proper error handling and graceful degradation
 * - Returns empty array on errors to prevent breaking news feed
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { guildId = DEFAULT_GUILD_ID, channels, since, limit = 20 } = body;

    // Validate required parameters
    if (!since || typeof since !== "number") {
      return NextResponse.json(
        { error: 'Missing or invalid "since" parameter (Unix timestamp required)' },
        { status: 400 },
      );
    }

    // Fetch channel list to get channel names
    const allChannels = await fetchDiscordChannels(guildId);
    const channelMap = new Map(allChannels.map((c) => [c.id, c.name]));

    // Filter to text channels only (type 0)
    let targetChannels = allChannels.filter((c) => c.type === 0);

    // If specific channels requested, filter to those
    if (channels && Array.isArray(channels) && channels.length > 0) {
      targetChannels = targetChannels.filter(
        (c) => channels.includes(c.id) || channels.includes(c.name)
      );
    }

    // Fetch messages from each channel
    const allMessages: Array<{
      id: string;
      content: string;
      author: { id: string; username: string; avatar?: string };
      timestamp: string;
      reactions: Array<{ emoji: string; count: number }>;
      channelId: string;
      channelName: string;
    }> = [];

    for (const channel of targetChannels.slice(0, 10)) {
      // Limit to 10 channels to avoid rate limits
      try {
        const messages = await fetchChannelMessages(channel.id, since, limit);
        for (const msg of messages) {
          allMessages.push({
            id: msg.id,
            content: msg.content,
            author: {
              id: msg.author.id,
              username: msg.author.username,
              avatar: msg.author.avatar,
            },
            timestamp: msg.timestamp,
            reactions: (msg.reactions || []).map((r) => ({
              emoji: r.emoji.name,
              count: r.count,
            })),
            channelId: msg.channel_id,
            channelName: channelMap.get(msg.channel_id) || "unknown",
          });
        }
      } catch (channelError) {
        console.warn(`Failed to fetch messages from channel ${channel.name}:`, channelError);
        // Continue with other channels
      }
    }

    // Sort by reaction count (descending) and limit results
    const sortedMessages = allMessages
      .sort((a, b) => {
        const aScore = a.reactions.reduce((sum, r) => sum + r.count, 0);
        const bScore = b.reactions.reduce((sum, r) => sum + r.count, 0);
        return bScore - aScore;
      })
      .slice(0, limit);

    // Return successful response
    return NextResponse.json(
      { messages: sortedMessages },
      {
        headers: {
          // Cache for 5 minutes to reduce Discord API calls
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const err = error as Error;
    console.error("Discord messages API error:", err);

    // Return graceful error response
    // Use 200 status to prevent breaking the news feed
    return NextResponse.json(
      {
        messages: [],
        error: err.message,
        warning: "Discord messages unavailable - returning empty results",
      },
      {
        status: 200, // Return 200 to prevent breaking news feed
        headers: {
          // Cache error responses briefly to prevent repeated failed requests
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  }
}

/**
 * Handle GET requests with a helpful error message
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "This endpoint requires POST method",
      usage: "POST /api/discord/messages with body: { guildId?, channels?, since: number, limit? }",
    },
    { status: 405 },
  );
}
