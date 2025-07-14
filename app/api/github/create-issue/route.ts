import { NextResponse } from 'next/server';

/** GitHub API base URL for all GitHub API requests */
const GITHUB_API_URL = 'https://api.github.com';

/** GitHub repository owner/organization name */
const OWNER = 'joinvai';

/** GitHub repository name where issues will be created */
const REPO = 'vai-vex';

/**
 * Bug report data structure from user submissions
 */
interface BugReportData {
  /** Brief description of the bug */
  title: string;
  /** Detailed steps to reproduce the issue */
  stepsToReproduce: string;
  /** What should happen normally */
  expectedBehavior: string;
  /** What actually happens (the bug) */
  actualBehavior: string;
  /** Bug severity level (critical, high, medium, low) */
  severity: string;
  /** Browser and version information */
  browserInfo: string;
  /** Optional additional information */
  additionalContext?: string;
  /** Optional user information for attribution */
  memberInfo?: {
    /** User's email address */
    email: string;
    /** User's display name */
    name: string;
  };
}

/**
 * Creates a GitHub issue from user-submitted bug report data
 * @param request - HTTP request containing bug report data
 * @returns JSON response with issue creation results
 */
export async function POST(request: Request) {
  try {
    // Verify GitHub API token is configured
    // This token is required for authenticated requests to GitHub's API
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    // Parse and validate incoming bug report data
    const data: BugReportData = await request.json();

    // Construct formatted issue body using GitHub markdown template
    // This template ensures consistent formatting and includes all necessary details
    const issueBody = `## Bug Description
${data.title}

## Steps to Reproduce
${data.stepsToReproduce}

## Expected Behavior
${data.expectedBehavior}

## Actual Behavior
${data.actualBehavior}

## Environment
- Browser: ${data.browserInfo}
- Platform: VAI-VEX
${data.memberInfo ? `- Reported by: ${data.memberInfo.name} (${data.memberInfo.email})` : '- Reported by: Anonymous user'}

## Severity
${data.severity}

${data.additionalContext ? `## Additional Context
${data.additionalContext}` : ''}

---
*This bug report was submitted via the in-app bug reporting system.*`;

    // Initialize base labels for all user-submitted bug reports
    const labels = ['bug', 'user submitted'];
    
    // Map severity levels to GitHub priority labels for proper triage
    // This helps maintainers quickly identify and prioritize issues
    switch (data.severity.toLowerCase()) {
      case 'critical':
        labels.push('priority: critical');
        break;
      case 'high':
        labels.push('priority: high');
        break;
      case 'medium':
        labels.push('priority: medium');
        break;
      case 'low':
        labels.push('priority: low');
        break;
    }

    // Create GitHub issue using the Issues API
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${OWNER}/${REPO}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `[Bug] ${data.title}`, // Prefix for easy identification
          body: issueBody,
          labels,
        }),
      }
    );

    // Handle GitHub API errors gracefully
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('GitHub API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create GitHub issue' },
        { status: response.status }
      );
    }

    // Parse successful response and extract issue details
    const issue = await response.json();

    // Return success response with issue details for client-side handling
    return NextResponse.json({
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      success: true,
    });
  } catch (error) {
    // Log errors for debugging while providing user-friendly error messages
    console.error('Error creating GitHub issue:', error);
    return NextResponse.json(
      { error: 'Failed to create bug report' },
      { status: 500 }
    );
  }
}
