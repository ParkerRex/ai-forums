/**
 * Skool Poster - Automated posting to Skool.com
 *
 * This module provides functionality to programmatically create posts on Skool
 * using cookie-based authentication. Useful for automation workflows like
 * posting GitHub releases or Discord highlights.
 *
 * @see docs/SKOOL_POSTING_GUIDE.md for setup instructions
 */

export interface SkoolConfig {
  groupId: string;
  groupName: string;
  authToken: string;
  clientId: string;
  wafToken: string;
}

export interface SkoolPost {
  title: string;
  content: string;
  categoryId?: string;
}

export interface SkoolPostResponse {
  id: string;
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Get headers for Skool API requests
 */
function getSkoolHeaders(config: SkoolConfig): Record<string, string> {
  return {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    cookie: `client_id=${config.clientId}; auth_token=${config.authToken}`,
    origin: "https://www.skool.com",
    referer: `https://www.skool.com/${config.groupName}`,
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "x-aws-waf-token": config.wafToken,
    "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
  };
}

/**
 * Create a post on Skool
 *
 * @param config - Skool authentication configuration
 * @param post - Post data (title, content, optional categoryId)
 * @returns Promise resolving to post response
 *
 * @throws Error if authentication fails or post creation fails
 *
 * @example
 * ```typescript
 * const config = {
 *   groupId: process.env.SKOOL_GROUP_ID!,
 *   groupName: process.env.SKOOL_GROUP_NAME!,
 *   authToken: process.env.SKOOL_AUTH_TOKEN!,
 *   clientId: process.env.SKOOL_CLIENT_ID!,
 *   wafToken: process.env.SKOOL_WAF_TOKEN!
 * };
 *
 * const result = await postToSkool(config, {
 *   title: "New Release: v2.0.0",
 *   content: "Check out what's new!",
 *   categoryId: "releases"
 * });
 * ```
 */
export async function postToSkool(
  config: SkoolConfig,
  post: SkoolPost,
): Promise<SkoolPostResponse> {
  // NOTE: The exact endpoint and payload structure needs to be confirmed
  // by running scripts/capture-skool-post-request.js
  //
  // This is a best-guess implementation based on the existing API patterns
  // observed in scripts/skool-api-complete.js
  const url = "https://api.skool.com/posts";

  const headers = getSkoolHeaders(config);

  // Construct request body (structure may need adjustment based on captured request)
  const body = {
    group_id: config.groupId,
    post_type: "generic",
    metadata: {
      title: post.title,
      content: post.content,
      ...(post.categoryId && { labels: post.categoryId }),
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to post to Skool: ${response.status} ${response.statusText}\n${errorText}`,
      );
    }

    const result = await response.json();

    return {
      id: result.id || result.post?.id,
      success: true,
      url: `https://www.skool.com/${config.groupName}/${result.name || result.post?.name}`,
    };
  } catch (error) {
    console.error("Error posting to Skool:", error);
    return {
      id: "",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate Skool authentication tokens
 *
 * Checks if the JWT token is still valid by decoding the expiration time
 *
 * @param authToken - JWT authentication token
 * @returns Object with validity status and expiration date
 */
export function validateSkoolToken(authToken: string): {
  valid: boolean;
  expiresAt?: Date;
  daysUntilExpiration?: number;
} {
  try {
    // JWT tokens are base64url encoded, split by "."
    const parts = authToken.split(".");
    if (parts.length !== 3) {
      return { valid: false };
    }

    // Decode the payload (second part)
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));

    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    const daysUntilExpiration = Math.floor(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      valid: expiresAt > now,
      expiresAt,
      daysUntilExpiration,
    };
  } catch (_error) {
    return { valid: false };
  }
}

/**
 * Rate limiter for Skool API requests
 *
 * Ensures we don't exceed Skool's rate limits (estimated at 60 posts/hour)
 */
export class SkoolRateLimiter {
  private requests: number[] = [];
  private readonly maxRequestsPerHour: number;

  constructor(maxRequestsPerHour = 60) {
    this.maxRequestsPerHour = maxRequestsPerHour;
  }

  /**
   * Wait if necessary to respect rate limits
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Remove requests older than 1 hour
    this.requests = this.requests.filter((time) => time > oneHourAgo);

    // If we've hit the limit, wait
    if (this.requests.length >= this.maxRequestsPerHour) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + 60 * 60 * 1000 - now;

      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Record this request
    this.requests.push(now);
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    requestsInLastHour: number;
    remainingRequests: number;
    resetTime?: Date;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    this.requests = this.requests.filter((time) => time > oneHourAgo);

    const status = {
      requestsInLastHour: this.requests.length,
      remainingRequests: this.maxRequestsPerHour - this.requests.length,
      resetTime: undefined as Date | undefined,
    };

    if (this.requests.length > 0) {
      status.resetTime = new Date(this.requests[0] + 60 * 60 * 1000);
    }

    return status;
  }
}

/**
 * Get Skool configuration from environment variables
 *
 * @throws Error if required environment variables are missing
 */
export function getSkoolConfigFromEnv(): SkoolConfig {
  const required = [
    "SKOOL_GROUP_ID",
    "SKOOL_GROUP_NAME",
    "SKOOL_AUTH_TOKEN",
    "SKOOL_CLIENT_ID",
    "SKOOL_WAF_TOKEN",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "See docs/SKOOL_POSTING_GUIDE.md for setup instructions",
    );
  }

  return {
    groupId: process.env.SKOOL_GROUP_ID!,
    groupName: process.env.SKOOL_GROUP_NAME!,
    authToken: process.env.SKOOL_AUTH_TOKEN!,
    clientId: process.env.SKOOL_CLIENT_ID!,
    wafToken: process.env.SKOOL_WAF_TOKEN!,
  };
}

/**
 * Format a GitHub release for Skool
 */
export function formatGitHubReleaseForSkool(release: {
  name: string;
  tag_name: string;
  body: string;
  html_url: string;
  published_at: string;
}): SkoolPost {
  return {
    title: `🚀 New Release: ${release.name || release.tag_name}`,
    content: `
## ${release.name || release.tag_name}

${release.body}

---

📅 Released: ${new Date(release.published_at).toLocaleDateString()}
🔗 [View on GitHub](${release.html_url})
    `.trim(),
  };
}

/**
 * Format a Discord message highlight for Skool
 */
export function formatDiscordMessageForSkool(message: {
  content: string;
  author: { username: string; avatar?: string };
  channelName: string;
  reactionCount: number;
  timestamp: string;
}): SkoolPost {
  return {
    title: `🔥 Hot Take from #${message.channelName}`,
    content: `
${message.content}

---

💬 **${message.author.username}** in #${message.channelName}
❤️ ${message.reactionCount} reactions
🕐 ${new Date(message.timestamp).toLocaleString()}
    `.trim(),
  };
}
