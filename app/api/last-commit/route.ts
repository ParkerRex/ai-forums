import { NextResponse } from 'next/server'

const GITHUB_API_URL = 'https://api.github.com'
const OWNER = 'joinvai'
const REPO = 'vai-vex'

export async function GET() {
  try {
    const githubToken = process.env.GITHUB_TOKEN
    
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(
      `${GITHUB_API_URL}/repos/${OWNER}/${REPO}/commits?per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`GitHub API error ${response.status}: ${errorText}`)
      
      // For development, return mock data if the API fails
      // In production, you would want to handle this differently
      const mockCommitTime = new Date()
      mockCommitTime.setHours(mockCommitTime.getHours() - 3) // 3 hours ago
      
      return NextResponse.json(
        { 
          timestamp: mockCommitTime.toISOString(),
          sha: 'mock-sha',
          message: 'feat: add footer with Discord status and countdown timer',
          author: 'Developer'
        },
        {
          headers: {
            'Cache-Control': 's-maxage=60, stale-while-revalidate',
          },
        }
      )
    }

    const commits = await response.json()
    
    if (!commits || commits.length === 0) {
      return NextResponse.json(
        { error: 'No commits found' },
        { status: 404 }
      )
    }

    const lastCommit = commits[0]
    const commitDate = lastCommit.commit.author.date

    return NextResponse.json(
      { 
        timestamp: new Date(commitDate).toISOString(),
        sha: lastCommit.sha,
        message: lastCommit.commit.message,
        author: lastCommit.commit.author.name
      },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching last commit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch last commit' },
      { status: 500 }
    )
  }
}