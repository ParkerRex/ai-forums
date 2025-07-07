/**
 * @fileoverview GitHub Issues Listing API Route
 * 
 * This API endpoint fetches and displays open GitHub issues from the VAI VEX repository.
 * It provides pagination support and returns simplified issue data for display in the
 * application's issue tracking interface.
 * 
 * @route GET /api/github/issues
 * @requires GitHub Personal Access Token (GITHUB_TOKEN environment variable)
 * @returns {array} JSON array of simplified issue objects
 * 
 * @example
 * ```typescript
 * // GET /api/github/issues?page=1&per_page=10
 * 
 * // Success response
 * [
 *   {
 *     "id": 1234567890,
 *     "number": 123,
 *     "title": "[Bug] Login form validation error",
 *     "html_url": "https://github.com/joinvai/vai-vex/issues/123"
 *   },
 *   {
 *     "id": 1234567891,
 *     "number": 124,
 *     "title": "[Feature] Add dark mode support",
 *     "html_url": "https://github.com/joinvai/vai-vex/issues/124"
 *   }
 * ]
 * 
 * // Error response
 * {
 *   "error": "GitHub token not configured"
 * }
 * ```
 * 
 * @query_params
 * - page: Page number for pagination (default: 1)
 * - per_page: Number of issues per page (default: 10)
 * 
 * @author VAI VEX Team
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';

/** GitHub API base URL for all GitHub API requests */
const GITHUB_API_URL = 'https://api.github.com';

/** GitHub repository owner/organization name */
const OWNER = 'joinvai';

/** GitHub repository name from which to fetch issues */
const REPO = 'vai-vex';

/**
 * Fetches open GitHub issues from the VAI VEX repository with pagination support.
 * 
 * This endpoint retrieves a paginated list of open issues from the GitHub repository,
 * returning simplified issue objects optimized for display in the application UI.
 * The response is cached for 60 seconds to balance data freshness with performance.
 * 
 * @param {NextRequest} request - The incoming HTTP request with optional query parameters
 * @returns {Promise<NextResponse>} JSON array of simplified issue objects
 * 
 * @example
 * ```typescript
 * // GET /api/github/issues?page=2&per_page=5
 * const response = await fetch('/api/github/issues?page=2&per_page=5');
 * const issues = await response.json();
 * console.log(`Found ${issues.length} issues`);
 * ```
 * 
 * @throws {Error} When GitHub API token is missing or invalid
 * @throws {Error} When GitHub API request fails
 * 
 * @security
 * - Requires valid GITHUB_TOKEN environment variable
 * - Uses GitHub API v2022-11-28 for compatibility
 * - Only fetches public issue data (no sensitive information)
 * 
 * @performance
 * - Response is cached for 60 seconds with stale-while-revalidate
 * - Returns simplified issue objects to reduce payload size
 * - Supports pagination to handle large numbers of issues
 */
export async function GET(request: NextRequest) {
  // Verify GitHub API token is configured
  // This token is required for authenticated requests to GitHub's API
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'GitHub token not configured' },
      { status: 500 }
    );
  }

  try {
    // Extract pagination parameters from query string
    // Default values ensure the API works without explicit parameters
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '10';

    // Construct GitHub API URL with pagination and filter for open issues only
    const url = `${GITHUB_API_URL}/repos/${OWNER}/${REPO}/issues?state=open&per_page=${perPage}&page=${page}`;

    // Fetch issues from GitHub API with proper authentication headers
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    // Handle GitHub API errors gracefully
    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    // Parse the response containing the array of issue objects
    const issues = await response.json();

    // Transform full GitHub issue objects into simplified objects for the UI
    // This reduces payload size and only includes necessary information
    const simplifiedIssues = issues.map((issue: {
      id: number;
      number: number;
      title: string;
      html_url: string;
    }) => ({
      id: issue.id,        // Unique GitHub issue ID
      number: issue.number, // Human-readable issue number
      title: issue.title,   // Issue title for display
      html_url: issue.html_url // Direct link to the issue on GitHub
    }));

    // Return simplified issues with appropriate caching headers
    return NextResponse.json(simplifiedIssues, {
      headers: {
        // Cache for 60 seconds with stale-while-revalidate for better UX
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
  } catch (error) {
    // Log errors for debugging while providing user-friendly error messages
    console.error('Error fetching GitHub issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub issues' },
      { status: 500 }
    );
  }
}

/**
 * Rejects POST requests to the issues endpoint.
 * 
 * This endpoint is read-only and only supports GET requests for fetching issues.
 * Use the /api/github/create-issue endpoint for creating new issues.
 * 
 * @returns {Promise<NextResponse>} 405 Method Not Allowed error response
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

/**
 * Rejects PUT requests to the issues endpoint.
 * 
 * This endpoint is read-only and doesn't support issue modification.
 * Issue updates should be performed directly on GitHub or through dedicated endpoints.
 * 
 * @returns {Promise<NextResponse>} 405 Method Not Allowed error response
 */
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

/**
 * Rejects DELETE requests to the issues endpoint.
 * 
 * This endpoint is read-only and doesn't support issue deletion.
 * Issue management should be performed directly on GitHub.
 * 
 * @returns {Promise<NextResponse>} 405 Method Not Allowed error response
 */
export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

/**
 * Rejects PATCH requests to the issues endpoint.
 * 
 * This endpoint is read-only and doesn't support partial issue updates.
 * Issue modifications should be performed directly on GitHub.
 * 
 * @returns {Promise<NextResponse>} 405 Method Not Allowed error response
 */
export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}