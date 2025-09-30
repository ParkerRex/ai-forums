/**
 * @fileoverview Last Commit Information API Route
 *
 * This API endpoint fetches information about the most recent commit from the VAI
 * GitHub repository. It provides commit metadata including timestamp, SHA, message,
 * and author information for display in the application's activity feed or status indicators.
 *
 * @route GET /api/last-commit
 * @requires GitHub Personal Access Token (GITHUB_TOKEN environment variable)
 * @returns {object} JSON response containing commit information
 *
 * @example
 * ```typescript
 * // Success response
 * {
 *   "timestamp": "2024-01-15T10:30:00Z",
 *   "sha": "abc123def456",
 *   "message": "feat: add user authentication",
 *   "author": "John Developer"
 * }
 *
 * // Error response (with fallback)
 * {
 *   "timestamp": "2024-01-15T07:30:00Z",
 *   "sha": "mock-sha",
 *   "message": "feat: add footer with Discord status and countdown timer",
 *   "author": "Developer"
 * }
 * ```
 *
 * @fallback_behavior
 * When GitHub API is unavailable, returns mock data to ensure UI functionality
 *
 * @author VAI Team
 * @since 1.0.0
 */

import { NextResponse } from "next/server";

/** GitHub API base URL for all GitHub API requests */
const GITHUB_API_URL = "https://api.github.com";

/** GitHub repository owner/organization name */
const OWNER = "joinvai";

/** GitHub repository name from which to fetch commit information */
const REPO = "VAI";

/**
 * Fetches information about the most recent commit from the VAI repository.
 *
 * This endpoint retrieves the latest commit information from the main branch,
 * including commit metadata such as timestamp, SHA, commit message, and author.
 * The response is cached for 60 seconds to optimize performance while providing
 * reasonably up-to-date information.
 *
 * @returns {Promise<NextResponse>} JSON response containing commit information
 *
 * @example
 * ```typescript
 * // GET /api/last-commit
 * const response = await fetch('/api/last-commit');
 * const commit = await response.json();
 * console.log(`Last commit: ${commit.message} by ${commit.author}`);
 * ```
 *
 * @throws {Error} When GitHub API is unreachable (gracefully handled with fallback)
 *
 * @performance
 * - Response is cached for 60 seconds via Cache-Control headers
 * - Fetches only the most recent commit (per_page=1) to minimize data transfer
 * - Provides mock data fallback for development and error scenarios
 *
 * @fallback_strategy
 * When GitHub API fails, returns mock commit data to prevent UI breakage
 * This ensures the application remains functional even when external services are down
 */
export async function GET() {
  try {
    // Verify GitHub API token is configured
    // This token is required for authenticated requests to GitHub's API
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    // Fetch the most recent commit from the repository
    // Using per_page=1 to get only the latest commit for efficiency
    const response = await fetch(`${GITHUB_API_URL}/repos/${OWNER}/${REPO}/commits?per_page=1`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    // Handle API errors gracefully with fallback data
    if (!response.ok) {
      // Note: Error response reading is skipped to avoid noisy logs

      // Return mock data to maintain application functionality
      // This is especially useful during development and when GitHub API is down
      const mockCommitTime = new Date();
      mockCommitTime.setHours(mockCommitTime.getHours() - 3); // 3 hours ago

      return NextResponse.json(
        {
          timestamp: mockCommitTime.toISOString(),
          sha: "mock-sha",
          message: "feat: add footer with Discord status and countdown timer",
          author: "Developer",
        },
        {
          headers: {
            // Cache mock data for 60 seconds to prevent repeated failures
            "Cache-Control": "s-maxage=60, stale-while-revalidate",
          },
        },
      );
    }

    // Parse the response containing commit data
    const commits = await response.json();

    // Validate that we received commit data
    if (!commits || commits.length === 0) {
      return NextResponse.json({ error: "No commits found" }, { status: 404 });
    }

    // Extract information from the most recent commit
    const lastCommit = commits[0];
    const commitDate = lastCommit.commit.author.date;

    // Return formatted commit information
    return NextResponse.json(
      {
        timestamp: new Date(commitDate).toISOString(), // Standardized ISO timestamp
        sha: lastCommit.sha, // Commit SHA for reference
        message: lastCommit.commit.message, // Commit message
        author: lastCommit.commit.author.name, // Author name
      },
      {
        headers: {
          // Cache for 60 seconds to balance freshness with performance
          "Cache-Control": "s-maxage=60, stale-while-revalidate",
        },
      },
    );
  } catch (error) {
    // Log errors for debugging while maintaining service availability
    console.error("Error fetching last commit:", error);
    return NextResponse.json({ error: "Failed to fetch last commit" }, { status: 500 });
  }
}
