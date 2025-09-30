"use node";

/**
 * Skool Automation - Automated posting from external triggers
 *
 * This module provides Convex actions to automatically post content to Skool
 * based on external events like GitHub releases or Discord messages.
 */

import { v } from "convex/values";
import {
  formatDiscordMessageForSkool,
  formatGitHubReleaseForSkool,
  getSkoolConfigFromEnv,
  postToSkool,
  SkoolRateLimiter,
  validateSkoolToken,
} from "../lib/skool-poster";
import { action, internalAction } from "./_generated/server";

// Rate limiter singleton
const rateLimiter = new SkoolRateLimiter(60); // 60 posts per hour

/**
 * Post a GitHub release to Skool
 *
 * This action can be triggered by a GitHub webhook or scheduled job
 */
export const postGitHubRelease = internalAction({
  args: {
    name: v.string(),
    tagName: v.string(),
    body: v.string(),
    htmlUrl: v.string(),
    publishedAt: v.string(),
    categoryId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    postId: v.optional(v.string()),
    postUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    try {
      // Get Skool configuration
      const config = getSkoolConfigFromEnv();

      // Validate token
      const tokenStatus = validateSkoolToken(config.authToken);
      if (!tokenStatus.valid) {
        throw new Error("Skool auth token is expired or invalid");
      }

      // Warn if token expires soon
      if (tokenStatus.daysUntilExpiration !== undefined && tokenStatus.daysUntilExpiration < 7) {
        console.warn(`⚠️  Skool token expires in ${tokenStatus.daysUntilExpiration} days`);
      }

      // Format release for Skool
      const post = formatGitHubReleaseForSkool({
        name: args.name,
        tag_name: args.tagName,
        body: args.body,
        html_url: args.htmlUrl,
        published_at: args.publishedAt,
      });

      // Add category if provided
      if (args.categoryId) {
        post.categoryId = args.categoryId;
      }

      // Respect rate limits
      await rateLimiter.waitIfNeeded();

      // Post to Skool
      const result = await postToSkool(config, post);

      if (result.success) {
        console.log(`✅ Posted GitHub release to Skool: ${result.url}`);
        return {
          success: true,
          postId: result.id,
          postUrl: result.url,
        };
      } else {
        throw new Error(result.error || "Failed to post to Skool");
      }
    } catch (error) {
      console.error("Error posting GitHub release to Skool:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Post a Discord message highlight to Skool
 *
 * Only posts messages that meet engagement threshold (default 5+ reactions)
 */
export const postDiscordHighlight = internalAction({
  args: {
    messageId: v.string(),
    content: v.string(),
    author: v.object({
      username: v.string(),
      avatar: v.optional(v.string()),
    }),
    channelName: v.string(),
    reactionCount: v.number(),
    timestamp: v.string(),
    engagementThreshold: v.optional(v.number()), // Default: 5
    categoryId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    postId: v.optional(v.string()),
    postUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    skipped: v.optional(v.boolean()),
    reason: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const threshold = args.engagementThreshold ?? 5;

    // Skip if below engagement threshold
    if (args.reactionCount < threshold) {
      return {
        success: false,
        skipped: true,
        reason: `Message has ${args.reactionCount} reactions, need ${threshold}+`,
      };
    }

    try {
      // Get Skool configuration
      const config = getSkoolConfigFromEnv();

      // Validate token
      const tokenStatus = validateSkoolToken(config.authToken);
      if (!tokenStatus.valid) {
        throw new Error("Skool auth token is expired or invalid");
      }

      // Format Discord message for Skool
      const post = formatDiscordMessageForSkool({
        content: args.content,
        author: args.author,
        channelName: args.channelName,
        reactionCount: args.reactionCount,
        timestamp: args.timestamp,
      });

      // Add category if provided
      if (args.categoryId) {
        post.categoryId = args.categoryId;
      }

      // Respect rate limits
      await rateLimiter.waitIfNeeded();

      // Post to Skool
      const result = await postToSkool(config, post);

      if (result.success) {
        console.log(`✅ Posted Discord highlight to Skool: ${result.url}`);
        return {
          success: true,
          postId: result.id,
          postUrl: result.url,
        };
      } else {
        throw new Error(result.error || "Failed to post to Skool");
      }
    } catch (error) {
      console.error("Error posting Discord highlight to Skool:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Check Skool token status
 *
 * Public action to check if tokens are valid and when they expire
 */
export const checkTokenStatus = action({
  args: {},
  returns: v.object({
    valid: v.boolean(),
    expiresAt: v.optional(v.string()),
    daysUntilExpiration: v.optional(v.number()),
    needsRefresh: v.boolean(),
  }),
  handler: async (_ctx, _args) => {
    try {
      const config = getSkoolConfigFromEnv();
      const status = validateSkoolToken(config.authToken);

      return {
        valid: status.valid,
        expiresAt: status.expiresAt?.toISOString(),
        daysUntilExpiration: status.daysUntilExpiration,
        needsRefresh:
          !status.valid ||
          (status.daysUntilExpiration !== undefined && status.daysUntilExpiration < 7),
      };
    } catch (_error) {
      return {
        valid: false,
        needsRefresh: true,
      };
    }
  },
});

/**
 * Get rate limiter status
 *
 * Check how many requests we've made and how many are remaining
 */
export const getRateLimitStatus = action({
  args: {},
  returns: v.object({
    requestsInLastHour: v.number(),
    remainingRequests: v.number(),
    resetTime: v.optional(v.string()),
  }),
  handler: async (_ctx, _args) => {
    const status = rateLimiter.getStatus();
    return {
      requestsInLastHour: status.requestsInLastHour,
      remainingRequests: status.remainingRequests,
      resetTime: status.resetTime?.toISOString(),
    };
  },
});

/**
 * Test posting to Skool
 *
 * Use this to verify your credentials and setup are working
 */
export const testPost = action({
  args: {
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    postId: v.optional(v.string()),
    postUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    try {
      const config = getSkoolConfigFromEnv();

      const post = {
        title: args.title || "🧪 Test Post from VAI Platform",
        content:
          args.content ||
          `
This is a test post created by the automated posting system.

Generated at: ${new Date().toISOString()}

If you see this, the integration is working! 🎉
        `.trim(),
      };

      // Respect rate limits
      await rateLimiter.waitIfNeeded();

      const result = await postToSkool(config, post);

      if (result.success) {
        console.log(`✅ Test post successful: ${result.url}`);
      }

      return {
        success: result.success,
        postId: result.id,
        postUrl: result.url,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
