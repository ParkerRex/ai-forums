/**
 * Skool Agent - Complete automation agent for Skool.com
 *
 * This module provides a comprehensive agent that can perform all discovered
 * actions on Skool including posting, liking, commenting, DMing, and more.
 *
 * @see docs/SKOOL_API_SPEC.md for complete API specification
 */

import {
  getSkoolConfigFromEnv,
  postToSkool,
  type SkoolConfig,
  type SkoolPost,
  type SkoolPostResponse,
  validateSkoolToken,
} from "./skool-poster";

// ============================================================================
// Types
// ============================================================================

export interface CreateCommentData {
  postId: string;
  content: string;
  parentCommentId?: string; // For replies
}

export interface SendDMData {
  userId: string;
  content: string;
}

export interface SearchQuery {
  query: string;
  type?: "post" | "user" | "all";
  limit?: number;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AgentStats {
  postsCreated: number;
  likesGiven: number;
  commentsCreated: number;
  dmsSent: number;
  followsAdded: number;
}

// ============================================================================
// Skool Agent Class
// ============================================================================

export class SkoolAgent {
  private config: SkoolConfig;
  private stats: AgentStats = {
    postsCreated: 0,
    likesGiven: 0,
    commentsCreated: 0,
    dmsSent: 0,
    followsAdded: 0,
  };

  constructor(config: SkoolConfig) {
    this.config = config;
  }

  /**
   * Create agent from environment variables
   */
  static fromEnv(): SkoolAgent {
    const config = getSkoolConfigFromEnv();
    return new SkoolAgent(config);
  }

  /**
   * Validate authentication
   */
  async validateAuth(): Promise<{
    valid: boolean;
    expiresAt?: Date;
    daysUntilExpiration?: number;
  }> {
    return validateSkoolToken(this.config.authToken);
  }

  /**
   * Get agent statistics
   */
  getStats(): AgentStats {
    return { ...this.stats };
  }

  // ========================================================================
  // Content Management
  // ========================================================================

  /**
   * Create a post
   */
  async createPost(post: SkoolPost): Promise<SkoolPostResponse> {
    const result = await postToSkool(this.config, post);
    if (result.success) {
      this.stats.postsCreated++;
    }
    return result;
  }

  /**
   * Edit a post
   *
   * NOTE: Endpoint structure needs to be confirmed via discovery tool
   */
  async editPost(postId: string, updates: Partial<SkoolPost>): Promise<SkoolPostResponse> {
    // TODO: Implement after running discovery tool
    // Expected endpoint: PUT/PATCH https://api.skool.com/posts/{postId}

    const url = `https://api.skool.com/posts/${postId}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method: "PUT", // or PATCH
        headers,
        body: JSON.stringify({
          metadata: {
            title: updates.title,
            content: updates.content,
            ...(updates.categoryId && { labels: updates.categoryId }),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to edit post: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        id: result.id,
        success: true,
        url: `https://www.skool.com/${this.config.groupName}/${result.name}`,
      };
    } catch (error) {
      console.error("Error editing post:", error);
      return {
        id: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a post
   *
   * NOTE: Endpoint structure needs to be confirmed via discovery tool
   */
  async deletePost(postId: string): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement after running discovery tool
    // Expected endpoint: DELETE https://api.skool.com/posts/{postId}

    const url = `https://api.skool.com/posts/${postId}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete post: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ========================================================================
  // Engagement
  // ========================================================================

  /**
   * Like a post
   *
   * NOTE: Endpoint structure needs to be confirmed via discovery tool
   */
  async likePost(postId: string): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement after running discovery tool
    // Expected endpoint: POST https://api.skool.com/posts/{postId}/like
    // or POST https://api.skool.com/reactions

    const url = `https://api.skool.com/posts/${postId}/like`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          // Body structure to be determined
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to like post: ${response.statusText}`);
      }

      this.stats.likesGiven++;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Unlike a post
   *
   * NOTE: Endpoint structure needs to be confirmed via discovery tool
   */
  async unlikePost(postId: string): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement after running discovery tool
    // Expected endpoint: DELETE https://api.skool.com/posts/{postId}/like

    const url = `https://api.skool.com/posts/${postId}/like`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to unlike post: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a comment on a post
   *
   * NOTE: Endpoint structure needs to be confirmed via discovery tool
   */
  async createComment(
    data: CreateCommentData,
  ): Promise<{ success: boolean; commentId?: string; error?: string }> {
    // TODO: Implement after running discovery tool
    // Expected endpoint: POST https://api.skool.com/posts/{postId}/comments
    // or POST https://api.skool.com/posts with post_type: "comment"

    const url = "https://api.skool.com/posts";
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          group_id: this.config.groupId,
          parent_id: data.parentCommentId || data.postId,
          root_id: data.postId,
          post_type: "comment",
          metadata: {
            content: data.content,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create comment: ${response.statusText}`);
      }

      const result = await response.json();
      this.stats.commentsCreated++;

      return {
        success: true,
        commentId: result.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(
    commentId: string,
    content: string,
    postId: string,
  ): Promise<{ success: boolean; commentId?: string; error?: string }> {
    return this.createComment({
      postId,
      content,
      parentCommentId: commentId,
    });
  }

  // ========================================================================
  // Social Actions
  // ========================================================================

  /**
   * Send a direct message
   *
   * NOTE: Endpoint structure needs to be confirmed via discovery tool
   */
  async sendDM(
    data: SendDMData,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement after running discovery tool
    // Expected endpoint: POST https://api.skool.com/messages
    // or POST https://api.skool.com/conversations

    const url = "https://api.skool.com/messages";
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          recipient_id: data.userId,
          content: data.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send DM: ${response.statusText}`);
      }

      const result = await response.json();
      this.stats.dmsSent++;

      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Follow a user
   *
   * NOTE: Endpoint structure needs to be confirmed via discovery tool
   */
  async followUser(userId: string): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement after running discovery tool
    // Expected endpoint: POST https://api.skool.com/users/{userId}/follow

    const url = `https://api.skool.com/users/${userId}/follow`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to follow user: ${response.statusText}`);
      }

      this.stats.followsAdded++;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Unfollow a user
   *
   * NOTE: Endpoint structure needs to be confirmed via discovery tool
   */
  async unfollowUser(userId: string): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement after running discovery tool
    // Expected endpoint: DELETE https://api.skool.com/users/{userId}/follow

    const url = `https://api.skool.com/users/${userId}/follow`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to unfollow user: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ========================================================================
  // Search & Discovery
  // ========================================================================

  /**
   * Search for posts or users
   *
   * NOTE: Endpoint structure needs to be confirmed via discovery tool
   */
  async search(query: SearchQuery): Promise<{
    success: boolean;
    results?: Array<unknown>;
    error?: string;
  }> {
    // TODO: Implement after running discovery tool
    // Expected endpoint: GET https://api.skool.com/search

    const params = new URLSearchParams({
      q: query.query,
      ...(query.type && { type: query.type }),
      ...(query.limit && { limit: query.limit.toString() }),
      "group-id": this.config.groupId,
    });

    const url = `https://api.skool.com/search?${params}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const results = await response.json();
      return {
        success: true,
        results: results.items || results.results || results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get notifications
   *
   * NOTE: Endpoint structure needs to be confirmed via discovery tool
   */
  async getNotifications(): Promise<{
    success: boolean;
    notifications?: Notification[];
    error?: string;
  }> {
    // TODO: Implement after running discovery tool
    // Expected endpoint: GET https://api.skool.com/notifications

    const url = "https://api.skool.com/notifications?limit=50";
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get notifications: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        notifications: data.notifications || data.items || data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ========================================================================
  // Utilities
  // ========================================================================

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      cookie: `client_id=${this.config.clientId}; auth_token=${this.config.authToken}`,
      origin: "https://www.skool.com",
      referer: `https://www.skool.com/${this.config.groupName}`,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "x-aws-waf-token": this.config.wafToken,
      "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a Skool agent with environment configuration
 */
export function createSkoolAgent(): SkoolAgent {
  return SkoolAgent.fromEnv();
}

/**
 * Execute multiple actions in sequence with rate limiting
 */
export async function executeBatch(
  _agent: SkoolAgent,
  actions: Array<() => Promise<unknown>>,
  delayMs = 2000,
): Promise<Array<{ success: boolean; result?: unknown; error?: string }>> {
  const results: Array<{ success: boolean; result?: unknown; error?: string }> = [];

  for (let i = 0; i < actions.length; i++) {
    try {
      const result = await actions[i]();
      results.push({ success: true, result });
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Add delay between actions (except after last one)
    if (i < actions.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
