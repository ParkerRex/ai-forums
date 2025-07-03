import { NextResponse } from 'next/server';

const GITHUB_API_URL = 'https://api.github.com';
const OWNER = 'joinvai';
const REPO = 'vai-vex';

interface BugReportData {
  title: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  severity: string;
  browserInfo: string;
  additionalContext?: string;
  memberInfo?: {
    email: string;
    name: string;
  };
}

export async function POST(request: Request) {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    const data: BugReportData = await request.json();

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

    const labels = ['bug', 'user submitted'];
    
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
          title: `[Bug] ${data.title}`,
          body: issueBody,
          labels,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('GitHub API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create GitHub issue' },
        { status: response.status }
      );
    }

    const issue = await response.json();

    return NextResponse.json({
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      success: true,
    });
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    return NextResponse.json(
      { error: 'Failed to create bug report' },
      { status: 500 }
    );
  }
}
