import { NextResponse } from 'next/server'

const DISCORD_GUILD_ID = '1355280592962453585'

const DISCORD_WIDGET_URL = `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`


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