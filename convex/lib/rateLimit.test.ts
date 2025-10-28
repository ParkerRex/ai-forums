/**
 * Unit tests for rate limiting helper
 *
 * Tests the sliding window rate limiting implementation
 * to ensure proper enforcement of request limits.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { checkRateLimit } from "./rateLimit";
import type { MutationCtx } from "../_generated/server";

// Mock database implementation for testing
class MockDatabase {
  private records: Map<string, any> = new Map();
  private nextId = 1;

  query(table: string) {
    return {
      withIndex: (indexName: string, fn: (q: any) => any) => {
        // Mock index query for "by_key"
        return {
          first: async () => {
            // Find record by key
            const allRecords = Array.from(this.records.values()).filter(
              (r) => r._table === table,
            );
            const keyFilter = fn({
              eq: (field: string, value: string) => ({
                field,
                value,
              }),
            });
            const found = allRecords.find(
              (r) => r[keyFilter.field] === keyFilter.value,
            );
            return found || null;
          },
        };
      },
    };
  }

  async insert(table: string, data: any) {
    const id = `id_${this.nextId++}` as any;
    const record = {
      _id: id,
      _table: table,
      _creationTime: Date.now(),
      ...data,
    };
    this.records.set(id, record);
    return id;
  }

  async patch(id: any, updates: any) {
    const existing = this.records.get(id);
    if (!existing) {
      throw new Error(`Record ${id} not found`);
    }
    this.records.set(id, { ...existing, ...updates });
  }

  clear() {
    this.records.clear();
    this.nextId = 1;
  }

  // Helper to get all records for inspection
  getRecords() {
    return Array.from(this.records.values());
  }
}

// Create mock context
function createMockContext(): MutationCtx {
  const db = new MockDatabase();
  return {
    db: db as any,
  } as MutationCtx;
}

// Helper to advance time
function advanceTime(ms: number) {
  const originalNow = Date.now;
  const targetTime = originalNow() + ms;
  Date.now = () => targetTime;
  return () => {
    Date.now = originalNow;
  };
}

describe("checkRateLimit", () => {
  let ctx: MutationCtx;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe("first request", () => {
    it("should allow first request", async () => {
      const result = await checkRateLimit(ctx, "test:key", 5, 60000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it("should create rate limit record in database", async () => {
      await checkRateLimit(ctx, "test:key", 5, 60000);

      const records = (ctx.db as any).getRecords();
      expect(records.length).toBe(1);
      expect(records[0].key).toBe("test:key");
      expect(records[0].attempts).toBe(1);
    });
  });

  describe("within limit", () => {
    it("should allow requests within limit", async () => {
      const maxAttempts = 5;
      const key = "test:within-limit";

      // Make 5 requests (all should be allowed)
      for (let i = 0; i < maxAttempts; i++) {
        const result = await checkRateLimit(ctx, key, maxAttempts, 60000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(maxAttempts - (i + 1));
      }
    });

    it("should increment attempts correctly", async () => {
      const key = "test:increment";
      await checkRateLimit(ctx, key, 5, 60000); // 1st
      await checkRateLimit(ctx, key, 5, 60000); // 2nd
      const result = await checkRateLimit(ctx, key, 5, 60000); // 3rd

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // 5 - 3 = 2 remaining
    });
  });

  describe("limit enforcement", () => {
    it("should block requests exceeding limit", async () => {
      const maxAttempts = 5;
      const key = "test:exceed-limit";

      // Make 5 requests (all allowed)
      for (let i = 0; i < maxAttempts; i++) {
        await checkRateLimit(ctx, key, maxAttempts, 60000);
      }

      // 6th request should be blocked
      const blockedResult = await checkRateLimit(ctx, key, maxAttempts, 60000);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.remaining).toBe(0);
    });

    it("should continue blocking subsequent requests", async () => {
      const maxAttempts = 3;
      const key = "test:continue-blocking";

      // Exceed limit
      for (let i = 0; i < maxAttempts; i++) {
        await checkRateLimit(ctx, key, maxAttempts, 60000);
      }

      // Multiple blocked requests
      const blocked1 = await checkRateLimit(ctx, key, maxAttempts, 60000);
      const blocked2 = await checkRateLimit(ctx, key, maxAttempts, 60000);

      expect(blocked1.allowed).toBe(false);
      expect(blocked2.allowed).toBe(false);
    });
  });

  describe("window expiry", () => {
    it("should reset counter after window expires", async () => {
      const windowMs = 60000; // 1 minute
      const key = "test:window-expiry";

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(ctx, key, 5, windowMs);
      }

      // 6th request blocked
      const blocked = await checkRateLimit(ctx, key, 5, windowMs);
      expect(blocked.allowed).toBe(false);

      // Advance time past window
      const restore = advanceTime(windowMs + 1000);

      // Should allow new request after window expires
      const allowed = await checkRateLimit(ctx, key, 5, windowMs);
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(4); // Fresh start

      restore(); // Restore original Date.now
    });

    it("should create new window with fresh counter", async () => {
      const windowMs = 30000;
      const key = "test:fresh-window";

      // First window - use all attempts
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(ctx, key, 3, windowMs);
      }

      // Advance time
      const restore = advanceTime(windowMs + 1000);

      // New window should start fresh
      const result = await checkRateLimit(ctx, key, 3, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);

      restore();
    });
  });

  describe("remaining calculation", () => {
    it("should calculate remaining attempts correctly", async () => {
      const maxAttempts = 10;
      const key = "test:remaining";

      const results = [];
      for (let i = 0; i < maxAttempts; i++) {
        results.push(await checkRateLimit(ctx, key, maxAttempts, 60000));
      }

      // Check remaining counts down: 9, 8, 7, ..., 0
      for (let i = 0; i < maxAttempts; i++) {
        expect(results[i].remaining).toBe(maxAttempts - (i + 1));
      }
    });

    it("should show 0 remaining when limit reached", async () => {
      const key = "test:zero-remaining";

      for (let i = 0; i < 3; i++) {
        await checkRateLimit(ctx, key, 3, 60000);
      }

      // Blocked request shows 0 remaining
      const blocked = await checkRateLimit(ctx, key, 3, 60000);
      expect(blocked.remaining).toBe(0);
    });
  });

  describe("resetAt timestamp", () => {
    it("should return consistent resetAt for same window", async () => {
      const key = "test:reset-at";

      const result1 = await checkRateLimit(ctx, key, 5, 60000);
      const result2 = await checkRateLimit(ctx, key, 5, 60000);

      // Both requests in same window should have same resetAt
      expect(result1.resetAt).toBe(result2.resetAt);
    });

    it("should return resetAt in the future", async () => {
      const now = Date.now();
      const result = await checkRateLimit(ctx, "test:future", 5, 60000);

      expect(result.resetAt).toBeGreaterThan(now);
      expect(result.resetAt).toBeLessThanOrEqual(now + 60000);
    });
  });

  describe("different keys", () => {
    it("should track limits independently for different keys", async () => {
      const maxAttempts = 3;
      const windowMs = 60000;

      // Exhaust limit for key1
      for (let i = 0; i < maxAttempts; i++) {
        await checkRateLimit(ctx, "key1", maxAttempts, windowMs);
      }
      const key1Blocked = await checkRateLimit(
        ctx,
        "key1",
        maxAttempts,
        windowMs,
      );

      // key2 should still be allowed
      const key2Allowed = await checkRateLimit(
        ctx,
        "key2",
        maxAttempts,
        windowMs,
      );

      expect(key1Blocked.allowed).toBe(false);
      expect(key2Allowed.allowed).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle limit of 1", async () => {
      const key = "test:limit-one";

      const first = await checkRateLimit(ctx, key, 1, 60000);
      const second = await checkRateLimit(ctx, key, 1, 60000);

      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(0);
      expect(second.allowed).toBe(false);
    });

    it("should handle very short windows", async () => {
      const key = "test:short-window";
      const windowMs = 100; // 100ms

      await checkRateLimit(ctx, key, 2, windowMs);

      // Advance past window
      const restore = advanceTime(150);
      const result = await checkRateLimit(ctx, key, 2, windowMs);

      expect(result.allowed).toBe(true);
      restore();
    });

    it("should handle very long windows", async () => {
      const key = "test:long-window";
      const windowMs = 24 * 60 * 60 * 1000; // 24 hours

      const result = await checkRateLimit(ctx, key, 100, windowMs);

      expect(result.allowed).toBe(true);
      expect(result.resetAt).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    });

    it("should handle large attempt limits", async () => {
      const key = "test:large-limit";
      const maxAttempts = 1000;

      const result = await checkRateLimit(ctx, key, maxAttempts, 60000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999);
    });
  });

  describe("realistic scenarios", () => {
    it("should enforce sign-in rate limit (5 per 15 min)", async () => {
      const email = "user@example.com";
      const key = `signin:${email}`;
      const maxAttempts = 5;
      const windowMs = 15 * 60 * 1000; // 15 minutes

      // 5 failed sign-in attempts
      for (let i = 0; i < maxAttempts; i++) {
        const result = await checkRateLimit(ctx, key, maxAttempts, windowMs);
        expect(result.allowed).toBe(true);
      }

      // 6th attempt blocked
      const blocked = await checkRateLimit(ctx, key, maxAttempts, windowMs);
      expect(blocked.allowed).toBe(false);

      // User must wait 15 minutes
      const waitTime = blocked.resetAt - Date.now();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(windowMs);
    });

    it("should enforce password reset rate limit (3 per hour)", async () => {
      const email = "user@example.com";
      const key = `reset:${email}`;
      const maxAttempts = 3;
      const windowMs = 60 * 60 * 1000; // 1 hour

      // 3 reset requests
      for (let i = 0; i < maxAttempts; i++) {
        await checkRateLimit(ctx, key, maxAttempts, windowMs);
      }

      // 4th blocked
      const blocked = await checkRateLimit(ctx, key, maxAttempts, windowMs);
      expect(blocked.allowed).toBe(false);
    });

    it("should enforce email verification rate limit (3 per hour)", async () => {
      const email = "user@example.com";
      const key = `verify:${email}`;
      const maxAttempts = 3;
      const windowMs = 60 * 60 * 1000; // 1 hour

      for (let i = 0; i < maxAttempts; i++) {
        await checkRateLimit(ctx, key, maxAttempts, windowMs);
      }

      const blocked = await checkRateLimit(ctx, key, maxAttempts, windowMs);
      expect(blocked.allowed).toBe(false);
    });
  });
});
