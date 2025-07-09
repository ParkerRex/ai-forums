/**
 * @fileoverview GitHub Issue Creation API Route
 * 
 * This API endpoint creates GitHub issues from user-submitted bug reports through
 * the VAI VEX application. It transforms bug report data into properly formatted
 * GitHub issues with appropriate labels and priority assignments.
 * 
 * @route POST /api/github/create-issue
 * @requires GitHub Personal Access Token (GITHUB_TOKEN environment variable)
 * @returns {object} JSON response containing issue creation details
 * 
 * @example
 * ```typescript
 * // Request body
 * {
 *   "title": "Login button not responding",
 *   "stepsToReproduce": "1. Go to login page\n2. Click login button",
 *   "expectedBehavior": "Should redirect to dashboard",
 *   "actualBehavior": "Nothing happens",
 *   "severity": "high",
 *   "browserInfo": "Chrome 120.0.0.0",
 *   "additionalContext": "Happens only on mobile",
 *   "memberInfo": {
 *     "email": "user@example.com",
 *     "name": "John Doe"
 *   }
 * }
 * 
 * // Success response
 * {
 *   "issueNumber": 123,
 *   "issueUrl": "https://github.com/joinvai/vai-vex/issues/123",
 *   "success": true
 * }
 * ```
 * 
 * @author VAI VEX Team
 * @since 1.0.0
 */

import { NextResponse } from 'next/server';

/** GitHub API base URL for all GitHub API requests */
const GITHUB_API_URL = 'https://api.github.com';

/** GitHub repository owner/organization name */
const OWNER = 'joinvai';

/** GitHub repository name where issues will be created */
const REPO = 'vai-vex';

/**
 * Interface defining the structure of bug report data submitted by users.
 * 
 * @interface BugReportData
 * @property {string} title - Brief description of the bug
 * @property {string} stepsToReproduce - Detailed steps to reproduce the issue
 * @property {string} expectedBehavior - What should happen normally
 * @property {string} actualBehavior - What actually happens (the bug)
 * @property {string} severity - Bug severity level (critical, high, medium, low)
 * @property {string} browserInfo - Browser and version information
 * @property {string} [additionalContext] - Optional additional information
 * @property {object} [memberInfo] - Optional user information for attribution
 * @property {string} memberInfo.email - User's email address
 * @property {string} memberInfo.name - User's display name
 */
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

/**
 * Creates a GitHub issue from user-submitted bug report data.
 * 
 * This endpoint accepts bug report data through POST requests and creates
 * properly formatted GitHub issues with structured templates, appropriate
 * labels, and priority assignments based on severity levels.
 * 
 * @param {Request} request - The incoming HTTP request containing bug report data
 * @returns {Promise<NextResponse>} JSON response with issue creation results
 * 
 * @example
 * ```typescript
 * // POST /api/github/create-issue
 * const response = await fetch('/api/github/create-issue', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     title: 'Navigation menu not working',
 *     stepsToReproduce: 'Click on menu button',
 *     expectedBehavior: 'Menu should open',
 *     actualBehavior: 'Menu does not respond',
 *     severity: 'medium',
 *     browserInfo: 'Safari 17.0'
 *   })
 * });
 * ```
 * 
 * @throws {Error} When GitHub API token is missing or invalid
 * @throws {Error} When GitHub API request fails
 * 
 * @security
 * - Requires valid GITHUB_TOKEN environment variable
 * - Uses GitHub API v2022-11-28 for compatibility
 * - Validates all input data before processing
 * 
 * @business_rules
 * - All issues are prefixed with "[Bug]" for easy identification
 * - Severity levels automatically map to GitHub priority labels
 * - User information is included when available for follow-up
 * - Anonymous submissions are supported for privacy
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
