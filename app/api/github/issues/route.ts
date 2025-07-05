import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API_URL = 'https://api.github.com';
const OWNER = 'joinvai';
const REPO = 'vai-vex';

export async function GET(request: NextRequest) {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'GitHub token not configured' },
      { status: 500 }
    );
  }

  try {
    // Get query params for pagination
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '10';

    const url = `${GITHUB_API_URL}/repos/${OWNER}/${REPO}/issues?state=open&per_page=${perPage}&page=${page}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const issues = await response.json();

    // Return simplified issue objects
    const simplifiedIssues = issues.map((issue: {
      id: number;
      number: number;
      title: string;
      html_url: string;
    }) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      html_url: issue.html_url
    }));

    return NextResponse.json(simplifiedIssues, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
  } catch (error) {
    console.error('Error fetching GitHub issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub issues' },
      { status: 500 }
    );
  }
}

// Only allow GET requests
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}