interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score: number;
  text?: string;
  summary?: string;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
  requestId: string;
}

export async function searchNews(
  query: string,
  numResults: number = 10,
  includeDomains?: string[]
): Promise<ExaSearchResponse> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA API key not configured');
  }
  
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      category: 'news',
      numResults,
      includeDomains,
      contents: {
        text: true,
        summary: true,
      },
      startPublishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('EXA API error:', response.status, response.statusText);
    throw new Error(`EXA API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
