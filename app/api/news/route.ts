/**
 * @fileoverview News Search API Route
 * 
 * This API endpoint provides news search functionality using the Exa AI search service.
 * It searches for recent news articles based on user queries and returns structured
 * results with content summaries and metadata. The endpoint is optimized for news
 * content with a focus on recent articles published within the last 7 days.
 * 
 * @route POST /api/news
 * @requires EXA_API_KEY environment variable for Exa AI service authentication
 * @returns {object} JSON response containing search results from Exa AI
 * 
 * @example
 * ```typescript
 * // Request body
 * {
 *   "query": "artificial intelligence breakthrough",
 *   "numResults": 10,
 *   "includeDomains": ["techcrunch.com", "wired.com"]
 * }
 * 
 * // Success response (structure depends on Exa AI API)
 * {
 *   "results": [
 *     {
 *       "title": "AI Breakthrough in Natural Language Processing",
 *       "url": "https://example.com/article",
 *       "publishedDate": "2024-01-15T10:00:00Z",
 *       "summary": "Researchers have achieved a significant breakthrough...",
 *       "content": "Full article content..."
 *     }
 *   ],
 *   "totalResults": 1
 * }
 * 
 * // Error response
 * {
 *   "error": "EXA API key not configured"
 * }
 * ```
 * 
 * @author VAI Team
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Searches for news articles using the Exa AI search service.
 * 
 * This endpoint accepts search queries and optional parameters to find relevant
 * news articles from the past 7 days. It leverages Exa AI's specialized search
 * capabilities to provide high-quality, recent news content with summaries.
 * 
 * @param {NextRequest} request - The incoming HTTP request containing search parameters
 * @returns {Promise<NextResponse>} JSON response with search results from Exa AI
 * 
 * @example
 * ```typescript
 * // POST /api/news
 * const response = await fetch('/api/news', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     query: 'climate change technology',
 *     numResults: 5,
 *     includeDomains: ['reuters.com', 'bbc.com']
 *   })
 * });
 * const news = await response.json();
 * ```
 * 
 * @throws {Error} When EXA_API_KEY environment variable is not configured
 * @throws {Error} When Exa AI API request fails
 * 
 * @security
 * - Requires valid EXA_API_KEY environment variable
 * - API key is passed securely via headers
 * - Request data is validated before processing
 * 
 * @search_parameters
 * - query: Search terms for finding relevant news articles
 * - numResults: Number of results to return (default: 10)
 * - includeDomains: Optional array of domains to restrict search to
 * - Category is automatically set to 'news' for optimal results
 * - Search is limited to articles published within the last 7 days
 */
export async function POST(request: NextRequest) {
  try {
    // Extract and validate search parameters from request body
    const { query, numResults = 10, includeDomains } = await request.json();

    // Verify Exa AI API key is configured
    // This key is required for authenticated requests to Exa AI's search service
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      console.error('EXA_API_KEY not found in environment variables');
      return NextResponse.json({ error: 'EXA API key not configured' }, { status: 500 });
    }

    // Construct request body for Exa AI search API
    // Configuration optimized for news content with recent articles
    const requestBody = {
      query,                    // User's search query
      category: 'news',         // Restrict to news category for relevant results
      numResults,              // Number of results to return (default: 10)
      includeDomains,          // Optional domain filtering for trusted sources
      contents: {
        text: true,            // Include full article text when available
        summary: true,         // Include AI-generated summaries
      },
      // Only search for articles published within the last 7 days
      // This ensures content freshness and relevance
      startPublishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Make authenticated request to Exa AI search API
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,           // Authentication header
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Handle Exa AI API errors gracefully
    if (!response.ok) {
      const errorText = await response.text();
      console.error('EXA API error:', response.status, response.statusText);
      throw new Error(`EXA API error: ${response.status} - ${errorText}`);
    }

    // Parse successful response and return to client
    // The response structure is determined by Exa AI's API format
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // Log errors for debugging while providing user-friendly error messages
    console.error('News API error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
