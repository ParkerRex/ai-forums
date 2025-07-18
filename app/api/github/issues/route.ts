import { NextRequest, NextResponse } from 'next/server';

/** GitHub API base URL for all GitHub API requests */
const GITHUB_API_URL = 'https://api.github.com';

/** GitHub repository owner/organization name */
const OWNER = 'joinvai';

/** GitHub repository name from which to fetch issues */
const REPO = 'vai-vex';

/**
 * Fetches open GitHub issues from the VAI repository.
 * 
 * @param request - The incoming HTTP request with optional query parameters
 * @returns JSON array of simplified issue objects
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
 * @returns 405 Method Not Allowed error response
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
 * @returns 405 Method Not Allowed error response
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
 * @returns 405 Method Not Allowed error response
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
 * @returns 405 Method Not Allowed error response
 */
export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}