import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query, numResults = 10, includeDomains } = await request.json();

    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      console.error('EXA_API_KEY not found in environment variables');
      return NextResponse.json({ error: 'EXA API key not configured' }, { status: 500 });
    }

    const requestBody = {
      query,
      category: 'news',
      numResults,
      includeDomains,
      contents: {
        text: true,
        summary: true,
      },
      startPublishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('EXA API error:', response.status, response.statusText);
      throw new Error(`EXA API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
