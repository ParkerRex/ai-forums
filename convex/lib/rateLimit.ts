/**
 * Rate limiting helper for preventing abuse
 *
 * Implements sliding window rate limiting using the rate_limits table
 * to track and enforce request limits across different operations.
 */

import type { MutationCtx } from "../_generated/server";

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and enforce rate limits for a given operation
 *
 * Uses a sliding window approach with the rate_limits table.
 * Creates or updates a rate limit record for the given key.
 *
 * @param ctx - Convex mutation context
 * @param key - Unique rate limit key (e.g., "signin:user@example.com")
 * @param maxAttempts - Maximum allowed attempts within the window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result with allowed status, remaining attempts, and reset time
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now;
  const windowEnd = now + windowMs;

  // Query existing rate limit record
  const existing = await ctx.db
    .query("rate_limits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  // No existing record or window expired - create new window
  if (!existing || existing.windowEnd < now) {
    await ctx.db.insert("rate_limits", {
      key,
      attempts: 1,
      windowStart,
      windowEnd,
      firstAttemptAt: now,
      lastAttemptAt: now,
    });

    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt: windowEnd,
    };
  }

  // Within current window - check if limit exceeded
  if (existing.attempts >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.windowEnd,
    };
  }

  // Increment attempts within current window
  await ctx.db.patch(existing._id, {
    attempts: existing.attempts + 1,
    lastAttemptAt: now,
  });

  return {
    allowed: true,
    remaining: maxAttempts - (existing.attempts + 1),
    resetAt: existing.windowEnd,
  };
}
