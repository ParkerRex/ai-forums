import { NextResponse } from 'next/server'

const DISCORD_GUILD_ID = '1355280592962453585'
const DISCORD_WIDGET_URL = `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`

export async function GET() {
  try {
    const response = await fetch(DISCORD_WIDGET_URL, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
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
    console.error('Discord API error:', error)
    return NextResponse.json(
      { presence_count: 0 },
      { status: 500 }
    )
  }
}