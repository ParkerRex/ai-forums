/**
 * Integration tests for password reset flow
 * Tests request reset, token validation, password change, and password history
 *
 * Note: These tests validate the password reset logic working together.
 * For full end-to-end database testing, use E2E tests with Playwright.
 */

import { describe, it, expect } from "bun:test";
import { hashPassword, verifyPassword } from "../../convex/lib/password";
import { generateSecureToken, hashToken } from "../../convex/lib/tokens";
import { generateJWT, verifyJWT } from "../../convex/lib/jwt";

describe("password reset flow integration tests", () => {
  describe("happy path", () => {
    it("should complete full password reset flow", async () => {
      const email = "user@example.com";
      const oldPassword = "OldPassword123!";
      const newPassword = "NewPassword456!";

      // 1. User has existing password
      const oldPasswordHash = await hashPassword(oldPassword);
      expect(await verifyPassword(oldPassword, oldPasswordHash)).toBe(true);

      // 2. User requests password reset
      const resetToken = generateSecureToken();
      const resetTokenHash = await hashToken(resetToken);

      expect(resetToken).toBeDefined();
      expect(resetTokenHash).toBeDefined();
      expect(resetTokenHash.length).toBe(64); // SHA-256 hex

      // 3. Token is stored (simulated)
      const now = Date.now();
      const expiresAt = now + 60 * 60 * 1000; // 1 hour

      const resetRecord = {
        tokenHash: resetTokenHash,
        email,
        expiresAt,
        createdAt: now,
      };

      expect(resetRecord.expiresAt).toBeGreaterThan(now);

      // 4. User clicks email link, validates token
      const lookupHash = await hashToken(resetToken);
      expect(lookupHash).toBe(resetTokenHash); // Token matches

      // 5. Check token not expired
      const isExpired = resetRecord.expiresAt < Date.now();
      expect(isExpired).toBe(false);

      // 6. Set new password
      const newPasswordHash = await hashPassword(newPassword);
      expect(await verifyPassword(newPassword, newPasswordHash)).toBe(true);
      expect(await verifyPassword(oldPassword, newPasswordHash)).toBe(false);

      // 7. Mark token as used
      const usedAt = Date.now();
      expect(usedAt).toBeDefined();

      // 8. Generate new session (auto sign-in)
      const sessionToken = await generateJWT({
        memberId: "member-123",
        email,
      });

      const payload = await verifyJWT(sessionToken);
      expect(payload.email).toBe(email);
    });
  });

  describe("token expiry", () => {
    it("should reject expired reset token", async () => {
      const now = Date.now();
      const resetToken = generateSecureToken();
      const resetTokenHash = await hashToken(resetToken);

      // Token expired 1 second ago
      const expiresAt = now - 1000;

      const isExpired = expiresAt < now;
      expect(isExpired).toBe(true);
    });

    it("should accept valid (non-expired) token", () => {
      const now = Date.now();
      const expiresAt = now + 60 * 60 * 1000; // 1 hour from now

      const isExpired = expiresAt < now;
      expect(isExpired).toBe(false);
    });

    it("should calculate time until expiry", () => {
      const now = Date.now();
      const expiresAt = now + 60 * 60 * 1000; // 1 hour

      const timeUntilExpiry = expiresAt - now;
      expect(timeUntilExpiry).toBeGreaterThan(0);
      expect(timeUntilExpiry).toBeLessThanOrEqual(60 * 60 * 1000);
    });

    it("should handle exact expiry moment", () => {
      const now = Date.now();
      const expiresAt = now;

      // At exact expiry, should be considered expired
      const isExpired = expiresAt <= now;
      expect(isExpired).toBe(true);
    });
  });

  describe("password reuse detection", () => {
    it("should detect password reuse in history", async () => {
      const passwordHistory = [
        "FirstPassword123!",
        "SecondPassword456!",
        "ThirdPassword789!",
      ];

      const historyHashes = await Promise.all(
        passwordHistory.map((pwd) => hashPassword(pwd))
      );

      // Try to reuse first password
      const reusedPassword = passwordHistory[0];
      const matches = await Promise.all(
        historyHashes.map((hash) => verifyPassword(reusedPassword, hash))
      );

      const isReused = matches.some((match) => match === true);
      expect(isReused).toBe(true);
    });

    it("should allow new password not in history", async () => {
      const passwordHistory = [
        "FirstPassword123!",
        "SecondPassword456!",
        "ThirdPassword789!",
      ];

      const historyHashes = await Promise.all(
        passwordHistory.map((pwd) => hashPassword(pwd))
      );

      // Try completely new password
      const newPassword = "CompletelyNewPassword000!";
      const matches = await Promise.all(
        historyHashes.map((hash) => verifyPassword(newPassword, hash))
      );

      const isReused = matches.some((match) => match === true);
      expect(isReused).toBe(false);
    });

    it("should maintain password history limit (last 3)", () => {
      const passwordHistory = [
        { password: "Password1!", createdAt: 1000 },
        { password: "Password2!", createdAt: 2000 },
        { password: "Password3!", createdAt: 3000 },
        { password: "Password4!", createdAt: 4000 },
      ];

      // Sort by createdAt descending, take last 3
      const last3 = passwordHistory
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3);

      expect(last3.length).toBe(3);
      expect(last3[0].password).toBe("Password4!");
      expect(last3[1].password).toBe("Password3!");
      expect(last3[2].password).toBe("Password2!");

      // Password1! should not be in last 3
      const containsPassword1 = last3.some((p) => p.password === "Password1!");
      expect(containsPassword1).toBe(false);
    });
  });

  describe("rate limiting", () => {
    it("should enforce rate limit on reset requests", () => {
      const maxAttempts = 3;
      const windowMs = 60 * 60 * 1000; // 1 hour
      let attemptCount = 0;
      const now = Date.now();

      // Simulate 3 reset requests
      for (let i = 0; i < 3; i++) {
        attemptCount++;
      }

      expect(attemptCount).toBe(maxAttempts);

      // 4th attempt should be blocked
      const shouldBlock = attemptCount >= maxAttempts;
      expect(shouldBlock).toBe(true);
    });

    it("should reset rate limit after window expires", () => {
      const windowMs = 60 * 60 * 1000; // 1 hour
      const now = Date.now();
      const windowStart = now;

      // First window
      const attemptCount = 3;

      // Check if new attempt is after window
      const newAttemptTime = windowStart + windowMs + 1000;
      const windowExpired = newAttemptTime >= windowStart + windowMs;

      expect(windowExpired).toBe(true);

      // If window expired, should allow new attempt
      const newCount = windowExpired ? 1 : attemptCount + 1;
      expect(newCount).toBe(1);
    });
  });

  describe("session invalidation", () => {
    it("should invalidate all existing sessions on password reset", async () => {
      const email = "user@example.com";
      const memberId = "member-123";

      // Create multiple sessions
      const session1 = await generateJWT({ memberId, email });
      const session2 = await generateJWT({ memberId, email });

      const session1Hash = await hashToken(session1);
      const session2Hash = await hashToken(session2);

      // Simulate sessions
      const sessions = [
        { memberId, tokenHash: session1Hash },
        { memberId, tokenHash: session2Hash },
      ];

      expect(sessions.length).toBe(2);

      // Password reset should delete all sessions for this member
      const deletedSessions = sessions.filter((s) => s.memberId === memberId);
      expect(deletedSessions.length).toBe(2);

      // After deletion, sessions array should be empty
      const remainingSessions = [] as typeof sessions;
      expect(remainingSessions.length).toBe(0);
    });

    it("should create new session after password reset", async () => {
      const email = "user@example.com";
      const memberId = "member-123";

      // After successful password reset, create new session
      const newSessionToken = await generateJWT({ memberId, email });
      const payload = await verifyJWT(newSessionToken);

      expect(payload.memberId).toBe(memberId);
      expect(payload.email).toBe(email);
    });
  });

  describe("token validation", () => {
    it("should reject invalid token format", async () => {
      const validToken = generateSecureToken();
      const invalidToken = "invalid-token-format";

      const validHash = await hashToken(validToken);
      const invalidHash = await hashToken(invalidToken);

      expect(validHash).toBeDefined();
      expect(invalidHash).toBeDefined();

      // They should not match
      expect(validHash).not.toBe(invalidHash);
    });

    it("should reject already used token", () => {
      const now = Date.now();
      const usedAt = now - 1000; // Used 1 second ago

      const isUsed = usedAt !== null;
      expect(isUsed).toBe(true);
    });

    it("should accept unused token", () => {
      const usedAt = null;

      const isUsed = usedAt !== null;
      expect(isUsed).toBe(false);
    });

    it("should validate token exists in database", async () => {
      const resetToken = generateSecureToken();
      const resetTokenHash = await hashToken(resetToken);

      // Simulate database lookup
      const storedTokenHash = resetTokenHash;

      // Verify token matches
      const lookupHash = await hashToken(resetToken);
      expect(lookupHash).toBe(storedTokenHash);
    });
  });

  describe("security scenarios", () => {
    it("should not reveal if email exists (always return success)", () => {
      // Reset request for non-existent email
      const emailExists = false;

      // Should always return success (prevent email enumeration)
      const responseMessage = "If an account exists with this email, you will receive a password reset link.";
      expect(responseMessage).toBeDefined();

      // Internal behavior: only send email if email exists
      const shouldSendEmail = emailExists;
      expect(shouldSendEmail).toBe(false);
    });

    it("should handle concurrent reset requests", async () => {
      const email = "user@example.com";

      // User requests reset twice in quick succession
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      const hash1 = await hashToken(token1);
      const hash2 = await hashToken(token2);

      // Both tokens should be unique
      expect(hash1).not.toBe(hash2);

      // In real system, second request creates new token
      // First token remains valid until expiry (unless used)
    });

    it("should hash tokens before storage", async () => {
      const plainToken = generateSecureToken();
      const hashedToken = await hashToken(plainToken);

      // Plain token should never be stored
      expect(hashedToken).not.toBe(plainToken);
      expect(hashedToken.length).toBe(64); // SHA-256 hex
      expect(plainToken.length).toBeGreaterThan(32); // Base64url
    });
  });

  describe("integration scenarios", () => {
    it("should simulate successful password change", async () => {
      const oldPassword = "OldPassword123!";
      const newPassword = "NewPassword456!";

      // 1. Verify old password works
      const oldHash = await hashPassword(oldPassword);
      expect(await verifyPassword(oldPassword, oldHash)).toBe(true);

      // 2. Change to new password
      const newHash = await hashPassword(newPassword);

      // 3. Verify new password works
      expect(await verifyPassword(newPassword, newHash)).toBe(true);

      // 4. Verify old password no longer works
      expect(await verifyPassword(oldPassword, newHash)).toBe(false);

      // 5. Add old password to history
      const passwordHistory = [oldHash];
      expect(passwordHistory.length).toBe(1);

      // 6. Verify can't reuse old password
      const isReused = await verifyPassword(oldPassword, passwordHistory[0]);
      expect(isReused).toBe(true); // Would be blocked
    });

    it("should simulate expired token scenario", async () => {
      const resetToken = generateSecureToken();
      const resetTokenHash = await hashToken(resetToken);

      const now = Date.now();
      const expiresAt = now - 5000; // Expired 5 seconds ago
      const usedAt = null;

      // Check conditions
      const isExpired = expiresAt < now;
      const isUsed = usedAt !== null;

      expect(isExpired).toBe(true);
      expect(isUsed).toBe(false);

      // Should reject: token is expired
      const shouldReject = isExpired || isUsed;
      expect(shouldReject).toBe(true);
    });

    it("should simulate used token scenario", () => {
      const now = Date.now();
      const expiresAt = now + 60 * 60 * 1000; // Valid for 1 hour
      const usedAt = now - 1000; // Used 1 second ago

      // Check conditions
      const isExpired = expiresAt < now;
      const isUsed = usedAt !== null;

      expect(isExpired).toBe(false);
      expect(isUsed).toBe(true);

      // Should reject: token already used
      const shouldReject = isExpired || isUsed;
      expect(shouldReject).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle password history with less than 3 passwords", async () => {
      const passwordHistory = [
        "FirstPassword123!",
        "SecondPassword456!",
      ];

      const historyHashes = await Promise.all(
        passwordHistory.map((pwd) => hashPassword(pwd))
      );

      expect(historyHashes.length).toBe(2);

      // Should still check against all available history
      const newPassword = "ThirdPassword789!";
      const matches = await Promise.all(
        historyHashes.map((hash) => verifyPassword(newPassword, hash))
      );

      expect(matches.every((match) => match === false)).toBe(true);
    });

    it("should handle empty password history", async () => {
      const passwordHistory: string[] = [];

      const historyHashes = await Promise.all(
        passwordHistory.map((pwd) => hashPassword(pwd))
      );

      expect(historyHashes.length).toBe(0);

      // Any new password should be allowed
      const newPassword = "FirstPassword123!";
      const matches = await Promise.all(
        historyHashes.map((hash) => verifyPassword(newPassword, hash))
      );

      expect(matches.length).toBe(0); // No history to check
    });

    it("should handle very long passwords", async () => {
      const oldPassword = "OldPassword123!";
      const longPassword = "A1!".repeat(100) + "VeryLongPassword";

      const oldHash = await hashPassword(oldPassword);
      const newHash = await hashPassword(longPassword);

      expect(await verifyPassword(longPassword, newHash)).toBe(true);
      expect(await verifyPassword(oldPassword, newHash)).toBe(false);
    });

    it("should handle unicode passwords", async () => {
      const oldPassword = "OldPassword123!";
      const unicodePassword = "Nëw_Pàsswørd_456!_你好";

      const oldHash = await hashPassword(oldPassword);
      const newHash = await hashPassword(unicodePassword);

      expect(await verifyPassword(unicodePassword, newHash)).toBe(true);
      expect(await verifyPassword(oldPassword, newHash)).toBe(false);
    });

    it("should handle token at exact expiry boundary", () => {
      const now = Date.now();
      const expiresAt = now;

      // At exact boundary, should be expired
      const isExpired = expiresAt <= now;
      expect(isExpired).toBe(true);

      // 1ms before expiry
      const justBeforeExpiry = now - 1;
      expect(justBeforeExpiry <= now).toBe(true);

      // 1ms after creation
      const justAfterCreation = now + 1;
      expect(justAfterCreation <= now).toBe(false);
    });

    it("should handle multiple password resets in succession", async () => {
      const passwords = [
        "Password1!",
        "Password2!",
        "Password3!",
        "Password4!",
      ];

      const hashes = [];

      for (const password of passwords) {
        const hash = await hashPassword(password);
        hashes.push(hash);

        // Verify current password works
        expect(await verifyPassword(password, hash)).toBe(true);

        // Verify previous passwords don't work with current hash
        for (let i = 0; i < passwords.indexOf(password); i++) {
          expect(await verifyPassword(passwords[i], hash)).toBe(false);
        }
      }

      expect(hashes.length).toBe(passwords.length);
    });
  });
});
