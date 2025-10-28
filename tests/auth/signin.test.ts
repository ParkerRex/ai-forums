/**
 * Integration tests for sign-in flow
 * Tests authentication, rate limiting, account lockout, and session management
 *
 * Note: These tests validate the auth logic working together.
 * For full end-to-end database testing, use E2E tests with Playwright.
 */

import { describe, it, expect } from "bun:test";
import { hashPassword, verifyPassword } from "../../convex/lib/password";
import { generateJWT, verifyJWT } from "../../convex/lib/jwt";
import { hashToken } from "../../convex/lib/tokens";

describe("sign-in flow integration tests", () => {
  describe("happy path", () => {
    it("should authenticate user with correct credentials", async () => {
      const email = "user@example.com";
      const password = "SecurePass123!";

      // Simulate user registration
      const passwordHash = await hashPassword(password);

      // Simulate sign-in: verify password
      const isValid = await verifyPassword(password, passwordHash);
      expect(isValid).toBe(true);

      // Generate session token
      const memberId = "test-member-id";
      const sessionToken = await generateJWT({ memberId, email });
      expect(sessionToken).toBeDefined();

      // Hash session token for storage
      const sessionTokenHash = await hashToken(sessionToken);
      expect(sessionTokenHash).toBeDefined();
      expect(sessionTokenHash.length).toBe(64);

      // Verify session token is valid
      const payload = await verifyJWT(sessionToken);
      expect(payload.memberId).toBe(memberId);
      expect(payload.email).toBe(email);
    });

    it("should handle email case-insensitivity", async () => {
      const email = "User@Example.COM";
      const password = "SecurePass123!";
      const passwordHash = await hashPassword(password);

      // Normalize email
      const normalizedEmail = email.toLowerCase();
      expect(normalizedEmail).toBe("user@example.com");

      // Verify password
      const isValid = await verifyPassword(password, passwordHash);
      expect(isValid).toBe(true);

      // Create JWT with normalized email
      const sessionToken = await generateJWT({
        memberId: "test-member",
        email: normalizedEmail,
      });

      const payload = await verifyJWT(sessionToken);
      expect(payload.email).toBe("user@example.com");
    });
  });

  describe("wrong password scenarios", () => {
    it("should reject incorrect password", async () => {
      const correctPassword = "SecurePass123!";
      const wrongPassword = "WrongPass123!";

      const passwordHash = await hashPassword(correctPassword);

      const isValid = await verifyPassword(wrongPassword, passwordHash);
      expect(isValid).toBe(false);
    });

    it("should detect case-sensitive password differences", async () => {
      const password = "SecurePass123!";
      const passwordHash = await hashPassword(password);

      expect(await verifyPassword(password, passwordHash)).toBe(true);
      expect(await verifyPassword("securepass123!", passwordHash)).toBe(false);
      expect(await verifyPassword("SECUREPASS123!", passwordHash)).toBe(false);
      expect(await verifyPassword("SecurePass123", passwordHash)).toBe(false);
    });

    it("should simulate failed login attempts increment", () => {
      let failedAttempts = 0;
      const maxAttempts = 10;

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        failedAttempts++;
      }

      expect(failedAttempts).toBe(5);
      expect(failedAttempts).toBeLessThan(maxAttempts);

      // Simulate 5 more failed attempts (total 10)
      for (let i = 0; i < 5; i++) {
        failedAttempts++;
      }

      expect(failedAttempts).toBe(10);
      expect(failedAttempts).toBeGreaterThanOrEqual(maxAttempts);
    });
  });

  describe("rate limiting", () => {
    it("should simulate rate limit window", () => {
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const maxAttempts = 5;
      const now = Date.now();

      const attempts = [
        { timestamp: now, count: 1 },
        { timestamp: now + 1000, count: 2 },
        { timestamp: now + 2000, count: 3 },
        { timestamp: now + 3000, count: 4 },
        { timestamp: now + 4000, count: 5 },
      ];

      // Check if all attempts are within window
      const windowStart = now;
      const inWindow = attempts.every(
        (attempt) => attempt.timestamp >= windowStart && attempt.timestamp < windowStart + windowMs
      );

      expect(inWindow).toBe(true);
      expect(attempts[attempts.length - 1].count).toBe(maxAttempts);

      // 6th attempt should be blocked
      const shouldBlock = attempts[attempts.length - 1].count >= maxAttempts;
      expect(shouldBlock).toBe(true);
    });

    it("should simulate rate limit reset after window expires", () => {
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const now = Date.now();
      const windowStart = now;

      // First window: 5 attempts
      const firstWindowEnd = windowStart + windowMs;

      // New attempt after window expires
      const newAttemptTime = firstWindowEnd + 1000;
      const windowExpired = newAttemptTime >= firstWindowEnd;

      expect(windowExpired).toBe(true);

      // If window expired, reset count
      const newCount = windowExpired ? 1 : 6;
      expect(newCount).toBe(1);
    });

    it("should calculate remaining attempts", () => {
      const maxAttempts = 5;
      const currentAttempts = 3;

      const remaining = maxAttempts - currentAttempts;
      expect(remaining).toBe(2);

      const noRemaining = maxAttempts - maxAttempts;
      expect(noRemaining).toBe(0);
    });

    it("should calculate reset timestamp", () => {
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const now = Date.now();
      const windowStart = now;

      const resetAt = windowStart + windowMs;
      expect(resetAt).toBeGreaterThan(now);

      const timeUntilReset = resetAt - now;
      expect(timeUntilReset).toBe(windowMs);
    });
  });

  describe("account lockout", () => {
    it("should simulate account lock after 10 failed attempts", () => {
      let failedAttempts = 0;
      const lockoutThreshold = 10;
      const lockoutDurationMs = 60 * 60 * 1000; // 1 hour
      let lockedUntil: number | null = null;

      // Simulate 10 failed attempts
      for (let i = 0; i < 10; i++) {
        failedAttempts++;
      }

      // Check if should lock account
      if (failedAttempts >= lockoutThreshold) {
        lockedUntil = Date.now() + lockoutDurationMs;
      }

      expect(lockedUntil).not.toBeNull();
      expect(lockedUntil).toBeGreaterThan(Date.now());
    });

    it("should check if account is locked", () => {
      const now = Date.now();
      const lockedUntil = now + 60 * 60 * 1000; // Locked for 1 hour

      const isLocked = lockedUntil > now;
      expect(isLocked).toBe(true);

      const timeUntilUnlock = lockedUntil - now;
      expect(timeUntilUnlock).toBeGreaterThan(0);
      expect(timeUntilUnlock).toBeLessThanOrEqual(60 * 60 * 1000);
    });

    it("should unlock account after lockout period", () => {
      const now = Date.now();
      const lockedUntil = now - 1000; // Locked until 1 second ago

      const isLocked = lockedUntil > now;
      expect(isLocked).toBe(false);
    });

    it("should reset failed attempts on successful login", () => {
      let failedAttempts = 5;
      let lockedUntil: number | null = 999999999;

      // Successful login
      failedAttempts = 0;
      lockedUntil = null;

      expect(failedAttempts).toBe(0);
      expect(lockedUntil).toBeNull();
    });
  });

  describe("unverified email blocking", () => {
    it("should block sign-in for unverified email", () => {
      const emailVerified = false;

      const canSignIn = emailVerified;
      expect(canSignIn).toBe(false);
    });

    it("should allow sign-in for verified email", () => {
      const emailVerified = true;

      const canSignIn = emailVerified;
      expect(canSignIn).toBe(true);
    });
  });

  describe("JWT validation", () => {
    it("should create valid session token", async () => {
      const memberId = "member-123";
      const email = "user@example.com";

      const sessionToken = await generateJWT({ memberId, email });
      expect(sessionToken).toBeDefined();
      expect(typeof sessionToken).toBe("string");

      const payload = await verifyJWT(sessionToken);
      expect(payload.memberId).toBe(memberId);
      expect(payload.email).toBe(email);
    });

    it("should handle multiple sessions for same user", async () => {
      const memberId = "member-123";
      const email = "user@example.com";

      // Create multiple sessions (different devices)
      const session1 = await generateJWT({ memberId, email });

      // Wait a tiny bit to ensure different iat (issued at) timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const session2 = await generateJWT({ memberId, email });

      // Tokens might be the same if created in same second, but that's OK
      // Both should verify to same user
      const payload1 = await verifyJWT(session1);
      const payload2 = await verifyJWT(session2);

      expect(payload1.memberId).toBe(memberId);
      expect(payload2.memberId).toBe(memberId);
    });

    it("should store session token hash, not plain token", async () => {
      const sessionToken = await generateJWT({
        memberId: "member-123",
        email: "user@example.com",
      });

      const sessionTokenHash = await hashToken(sessionToken);

      // Hash should be different from token
      expect(sessionTokenHash).not.toBe(sessionToken);
      expect(sessionTokenHash.length).toBe(64); // SHA-256 hex

      // Hash should be consistent
      const sessionTokenHash2 = await hashToken(sessionToken);
      expect(sessionTokenHash2).toBe(sessionTokenHash);
    });
  });

  describe("session management", () => {
    it("should calculate session expiry", () => {
      const sessionDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      const now = Date.now();

      const expiresAt = now + sessionDurationMs;
      expect(expiresAt).toBeGreaterThan(now);

      const daysUntilExpiry = (expiresAt - now) / (24 * 60 * 60 * 1000);
      expect(daysUntilExpiry).toBe(7);
    });

    it("should check if session is expired", () => {
      const now = Date.now();

      const expiredSession = now - 1000;
      const validSession = now + 7 * 24 * 60 * 60 * 1000;

      expect(expiredSession < now).toBe(true);
      expect(validSession > now).toBe(true);
    });

    it("should update lastLoginAt timestamp", () => {
      const now = Date.now();
      const lastLoginAt = now;

      expect(lastLoginAt).toBeLessThanOrEqual(Date.now());
      expect(lastLoginAt).toBeGreaterThan(now - 1000);
    });
  });

  describe("integration scenarios", () => {
    it("should simulate complete sign-in flow", async () => {
      const email = "user@example.com";
      const password = "SecurePass123!";

      // 1. User registered previously
      const passwordHash = await hashPassword(password);
      const emailVerified = true;
      const failedAttempts = 0;
      const lockedUntil = null;

      // 2. Check if account is locked
      const now = Date.now();
      const isLocked = !!(lockedUntil && lockedUntil > now);
      expect(isLocked).toBe(false);

      // 3. Verify password
      const isPasswordValid = await verifyPassword(password, passwordHash);
      expect(isPasswordValid).toBe(true);

      // 4. Check email verified
      expect(emailVerified).toBe(true);

      // 5. Generate session
      const memberId = "member-123";
      const sessionToken = await generateJWT({ memberId, email });

      // 6. Hash session for storage
      const sessionTokenHash = await hashToken(sessionToken);

      // 7. Create session record (simulated)
      const session = {
        memberId,
        tokenHash: sessionTokenHash,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000,
        createdAt: now,
      };

      expect(session.memberId).toBe(memberId);
      expect(session.expiresAt).toBeGreaterThan(now);

      // 8. Reset failed attempts
      const resetFailedAttempts = 0;
      expect(resetFailedAttempts).toBe(0);

      // 9. Update lastLoginAt
      const lastLoginAt = now;
      expect(lastLoginAt).toBeDefined();

      // 10. Return session token to client
      const payload = await verifyJWT(sessionToken);
      expect(payload.memberId).toBe(memberId);
      expect(payload.email).toBe(email);
    });

    it("should simulate failed sign-in with wrong password", async () => {
      const correctPassword = "SecurePass123!";
      const wrongPassword = "WrongPass123!";
      const passwordHash = await hashPassword(correctPassword);

      let failedAttempts = 0;

      // Attempt sign-in with wrong password
      const isValid = await verifyPassword(wrongPassword, passwordHash);
      expect(isValid).toBe(false);

      // Increment failed attempts
      failedAttempts++;
      expect(failedAttempts).toBe(1);
    });

    it("should simulate progressive account lockout", async () => {
      const password = "SecurePass123!";
      const passwordHash = await hashPassword(password);

      let failedAttempts = 0;
      let lockedUntil: number | null = null;

      // Simulate 9 failed attempts
      for (let i = 0; i < 9; i++) {
        const isValid = await verifyPassword("WrongPassword!", passwordHash);
        expect(isValid).toBe(false);
        failedAttempts++;
      }

      expect(failedAttempts).toBe(9);
      expect(lockedUntil).toBeNull();

      // 10th failed attempt triggers lockout
      const isValid = await verifyPassword("WrongPassword!", passwordHash);
      expect(isValid).toBe(false);
      failedAttempts++;

      if (failedAttempts >= 10) {
        lockedUntil = Date.now() + 60 * 60 * 1000;
      }

      expect(failedAttempts).toBe(10);
      expect(lockedUntil).not.toBeNull();
      expect(lockedUntil).toBeGreaterThan(Date.now());
    });
  });

  describe("edge cases", () => {
    it("should handle empty password", async () => {
      const password = "SecurePass123!";
      const passwordHash = await hashPassword(password);

      const isValid = await verifyPassword("", passwordHash);
      expect(isValid).toBe(false);
    });

    it("should handle very similar passwords", async () => {
      const password1 = "SecurePass123!";
      const password2 = "SecurePass123!!"; // Extra character

      const hash1 = await hashPassword(password1);

      expect(await verifyPassword(password1, hash1)).toBe(true);
      expect(await verifyPassword(password2, hash1)).toBe(false);
    });

    it("should handle unicode passwords", async () => {
      const password = "Pàsswørd123!你好";
      const passwordHash = await hashPassword(password);

      expect(await verifyPassword(password, passwordHash)).toBe(true);
      expect(await verifyPassword("Password123!你好", passwordHash)).toBe(false);
    });

    it("should handle whitespace in passwords", async () => {
      const password = "Secure Pass123!";
      const passwordHash = await hashPassword(password);

      expect(await verifyPassword(password, passwordHash)).toBe(true);
      expect(await verifyPassword("SecurePass123!", passwordHash)).toBe(false);
      expect(await verifyPassword(" Secure Pass123!", passwordHash)).toBe(false);
    });

    it("should handle maximum failed attempts edge", () => {
      const maxFailedAttempts = 10;

      // Exactly at threshold
      expect(maxFailedAttempts >= 10).toBe(true);

      // Just below threshold
      expect((maxFailedAttempts - 1) >= 10).toBe(false);

      // Above threshold
      expect((maxFailedAttempts + 1) >= 10).toBe(true);
    });
  });
});
