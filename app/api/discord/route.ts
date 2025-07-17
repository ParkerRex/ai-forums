/**
 * @fileoverview Discord Presence Count API Route
 * 
 * This API endpoint fetches the current online member count from the VAI Discord server
 * using Discord's Guild Widget API. The endpoint provides real-time presence information
 * for display in the application's UI components.
 * 
 * @route GET /api/discord
 * @returns {object} JSON response containing presence count and optional error information
 * 
 * @example
 * ```typescript
 * // Success response
 * {
 *   "presence_count": 42
 * }
 * 
 * // Error response (widget disabled)
 * {
 *   "presence_count": 0,
 *   "error": "Widget not enabled"
 * }
 * ```
 * 
 * @author VAI Team
 * @since 1.0.0
 */

import { NextResponse } from 'next/server'

/** Discord Guild ID for the VAI server */
const DISCORD_GUILD_ID = '1355280592962453585'

/** Discord Widget API URL for fetching guild presence information */
const DISCORD_WIDGET_URL = `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`

/**
 * Fetches the current online member count from the VAI Discord server.
 * 
 * This endpoint provides real-time presence information by querying Discord's Guild Widget API.
 * The response is cached for 60 seconds to optimize performance and reduce API calls.
 * 
 * @returns {Promise<NextResponse>} JSON response containing presence count
 * 
 * @example
 * ```typescript
 * // GET /api/discord
 * const response = await fetch('/api/discord');
 * const data = await response.json();
 * console.log(`Online members: ${data.presence_count}`);
 * ```
 * 
 * @throws {Error} When Discord API is unreachable or returns an error
 * 
 * @performance
 * - Response is cached for 60 seconds via Cache-Control headers
 * - Stale-while-revalidate strategy for better user experience
 * - Graceful fallback to 0 count on errors to prevent UI breakage
 */
export async function GET() {
  try {
    // Fetch presence data from Discord's Guild Widget API
    // This API provides real-time information about online members
    const response = await fetch(DISCORD_WIDGET_URL, {
      next: { revalidate: 60 }, // Cache for 60 seconds to optimize performance
    })

    // Handle API response errors gracefully
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Discord API returned ${response.status}: ${errorText}`)
      
      // Special handling for 403 errors (widget disabled)
      // This is a common scenario when server admins haven't enabled the widget
      if (response.status === 403) {
        return NextResponse.json(
          { presence_count: 0, error: 'Widget not enabled' },
          {
            headers: {
              // Cache error responses to prevent repeated failed requests
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
          }
        )
      }
      
      // Throw error for other HTTP status codes
      throw new Error(`Discord API returned ${response.status}`)
    }

    // Parse the JSON response from Discord's API
    const data = await response.json()
    
    // Return the presence count with appropriate caching headers
    // presence_count may be undefined in some cases, so we default to 0
    return NextResponse.json(
      { presence_count: data.presence_count || 0 },
      {
        headers: {
          // Public cache with 60 second max age and stale-while-revalidate
          // This provides optimal performance while keeping data relatively fresh
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    // Type assertion for better error handling
    const err = error as Error;
    console.error('Discord API error:', err);
    
    // Always return 200 status with 0 count to prevent UI breakage
    // This ensures the application continues to function even when Discord is unavailable
    return NextResponse.json(
      { presence_count: 0, error: err.message },
      { 
        status: 200, // Return 200 even on error so the UI doesn't break
        headers: {
          // Cache error responses to prevent repeated failed requests
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  }
}