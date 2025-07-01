import { NextResponse } from 'next/server'

const DISCORD_GUILD_ID = '1355280592962453585'
const DISCORD_WIDGET_URL = `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`

export async function GET() {
  try {
    const response = await fetch(DISCORD_WIDGET_URL, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Discord API returned ${response.status}: ${errorText}`)
      
      // If widget is not enabled (403), return 0 instead of erroring
      if (response.status === 403) {
        return NextResponse.json(
          { presence_count: 0, error: 'Widget not enabled' },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
          }
        )
      }
      
      throw new Error(`Discord API returned ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json(
      { presence_count: data.presence_count || 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    const err = error as Error;
    console.error('Discord API error:', err);
    return NextResponse.json(
      { presence_count: 0, error: err.message },
      { 
        status: 200, // Return 200 even on error so the UI doesn't break
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  }
}