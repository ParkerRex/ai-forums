/**
 * @fileoverview Discord Messages API Route
 * 
 * This API endpoint fetches Discord messages from the VAI Discord server
 * for the Discord Daily Digest feature. It integrates with the Convex backend
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

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

// Initialize Convex client for server-side API calls
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
    const { guildId, channels, since, limit } = body;

    // Validate required parameters
    if (!since || typeof since !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid "since" parameter (Unix timestamp required)' },
        { status: 400 }
      );
    }

    // Call Convex action to fetch Discord messages
    const messages = await convex.action(api.discord.fetchDiscordMessages, {
      guildId,
      channels,
      since,
      limit,
    });

    // Return successful response
    return NextResponse.json(
      { messages },
      {
        headers: {
          // Cache for 5 minutes to reduce Discord API calls
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );

  } catch (error) {
    const err = error as Error;
    console.error('Discord messages API error:', err);

    // Return graceful error response
    // Use 200 status to prevent breaking the news feed
    return NextResponse.json(
      { 
        messages: [], 
        error: err.message,
        warning: 'Discord messages unavailable - returning empty results'
      },
      { 
        status: 200, // Return 200 to prevent breaking news feed
        headers: {
          // Cache error responses briefly to prevent repeated failed requests
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  }
}

/**
 * Handle GET requests with a helpful error message
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'This endpoint requires POST method',
      usage: 'POST /api/discord/messages with body: { guildId?, channels?, since: number, limit? }'
    },
    { status: 405 }
  );
}