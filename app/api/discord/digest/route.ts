/**
 * @fileoverview Discord Digest API Route
 *
 * This API endpoint fetches processed Discord messages from the database archive
 * for the Discord Daily Digest feature. It provides pre-processed, ranked, and
 * summarized Discord messages from yesterday's activity.
 *
 * @route POST /api/discord/digest
 * @returns {object} JSON response containing processed Discord digest entries
 *
 * @example
 * ```typescript
 * // Request body
 * {
 *   "guildId": "1355280592962453585",
 *   "channels": ["general", "announcements"],
 *   "limit": 20
 * }
 *
 * // Success response
 * {
 *   "digest": [
 *     {
 *       "messageId": "123456789",
 *       "content": "Check out this new AI development!",
 *       "author": { "id": "user1", "username": "testuser" },
 *       "timestamp": 1642723200000,
 *       "reactions": [{ "emoji": "👍", "count": 5 }],
 *       "channelId": "general",
 *       "channelName": "general",
 *       "reactionScore": 5,
 *       "summary": "Discussion about new AI development...",
 *       "digestDate": "2025-01-14",
 *       "processedAt": 1642723200000
 *     }
 *   ]
 * }
 * ```
 *
 * @author VAI Team
 * @since 1.0.0
 */

import { desc, gte, inArray, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { discordDigest } from "@/db/schema";

/**
 * Fetches processed Discord digest from the database archive.
 *
 * This endpoint serves as a bridge between the client-side news source fetcher
 * and the database Discord digest table. It provides pre-processed,
 * ranked Discord messages with AI-generated summaries.
 *
 * @param {NextRequest} request - The incoming request with digest fetch parameters
 * @returns {Promise<NextResponse>} JSON response containing Discord digest entries
 *
 * @example
 * ```typescript
 * // POST /api/discord/digest
 * const response = await fetch('/api/discord/digest', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     guildId: '1355280592962453585',
 *     limit: 20
 *   })
 * });
 * const data = await response.json();
 * ```
 *
 * @performance
 * - Reads from pre-processed database archive for optimal performance
 * - Implements proper error handling and graceful degradation
 * - Returns empty array on errors to prevent breaking news feed
 * - Cached for 10 minutes since data is already processed
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { channels, limit, digestDate } = body;

    // Calculate the target date (defaults to yesterday)
    const targetDate = digestDate
      ? new Date(digestDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    targetDate.setHours(0, 0, 0, 0);

    // Query Discord digest from database
    let query = db
      .select()
      .from(discordDigest)
      .where(gte(discordDigest.digestDate, targetDate))
      .orderBy(desc(discordDigest.reactionScore))
      .limit(limit || 20);

    // Apply channel filter if specified
    if (channels && Array.isArray(channels) && channels.length > 0) {
      query = db
        .select()
        .from(discordDigest)
        .where(
          or(
            inArray(discordDigest.channelId, channels),
            inArray(discordDigest.channelName, channels)
          )
        )
        .orderBy(desc(discordDigest.reactionScore))
        .limit(limit || 20);
    }

    const digestEntries = await query;

    // Transform entries to match expected format
    const formattedEntries = digestEntries.map((entry) => ({
      messageId: entry.messageId,
      content: entry.content,
      author: entry.author,
      timestamp: entry.timestamp?.getTime() || 0,
      reactions: entry.reactions || [],
      channelId: entry.channelId,
      channelName: entry.channelName,
      reactionScore: entry.reactionScore,
      summary: entry.summary,
      digestDate: entry.digestDate?.toISOString().split("T")[0],
      processedAt: entry.processedAt?.getTime() || 0,
    }));

    // Return successful response
    return NextResponse.json(
      { digest: formattedEntries },
      {
        headers: {
          // Cache for 10 minutes since data is pre-processed and doesn't change frequently
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      },
    );
  } catch (error) {
    const err = error as Error;
    console.error("Discord digest API error:", err);

    // Return graceful error response
    // Use 200 status to prevent breaking the news feed
    return NextResponse.json(
      {
        digest: [],
        error: err.message,
        warning: "Discord digest unavailable - returning empty results",
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
      usage: "POST /api/discord/digest with body: { guildId?, channels?, limit?, digestDate? }",
    },
    { status: 405 },
  );
}
