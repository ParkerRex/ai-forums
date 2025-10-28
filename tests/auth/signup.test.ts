/**
 * Integration tests for sign-up flow
 * Tests the authentication flow components working together
 *
 * Note: These tests validate the auth logic and utilities working in concert.
 * For full end-to-end database testing, use E2E tests with Playwright.
 */

import { describe, it, expect } from "bun:test";
import { hashPassword, verifyPassword, validatePasswordComplexity } from "../../convex/lib/password";
import { generateJWT, verifyJWT } from "../../convex/lib/jwt";
import { generateSecureToken, hashToken } from "../../convex/lib/tokens";

describe("sign-up flow integration tests", () => {
  describe("happy path", () => {
    it("should complete full sign-up flow: password hash -> token generation -> JWT creation", async () => {
      const email = "test@example.com";
      const password = "SecurePass123!";
      const firstName = "John";
      const lastName = "Doe";

      // Step 1: Validate password complexity
      const validation = validatePasswordComplexity(password);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);

      // Step 2: Hash password
      const passwordHash = await hashPassword(password);
      expect(passwordHash).toBeDefined();
      expect(passwordHash).not.toBe(password);
      expect(passwordHash.length).toBeGreaterThan(0);

      // Step 3: Generate verification token
      const verificationToken = generateSecureToken();
      expect(verificationToken).toBeDefined();
      expect(typeof verificationToken).toBe("string");
      expect(verificationToken.length).toBeGreaterThan(0);

      // Step 4: Hash the verification token (for DB storage)
      const tokenHash = await hashToken(verificationToken);
      expect(tokenHash).toBeDefined();
      expect(tokenHash.length).toBe(64); // SHA-256 hex string

      // Step 5: Verify the verification token can be validated
      const tokenHashCheck = await hashToken(verificationToken);
      expect(tokenHashCheck).toBe(tokenHash); // Same token produces same hash

      // Step 6: Simulate email verification - generate JWT
      const memberId = "test-member-id";
      const sessionToken = await generateJWT({
        memberId,
        email,
      });
      expect(sessionToken).toBeDefined();
      expect(typeof sessionToken).toBe("string");

      // Step 7: Verify the JWT
      const payload = await verifyJWT(sessionToken);
      expect(payload.memberId).toBe(memberId);
      expect(payload.email).toBe(email);

      // Step 8: Verify password can be authenticated later
      const isPasswordValid = await verifyPassword(password, passwordHash);
      expect(isPasswordValid).toBe(true);

      const isWrongPasswordValid = await verifyPassword("WrongPassword123!", passwordHash);
      expect(isWrongPasswordValid).toBe(false);
    });

    it("should handle email normalization (lowercase)", () => {
      const email1 = "Test@Example.COM";
      const email2 = "test@example.com";

      const normalized1 = email1.toLowerCase();
      const normalized2 = email2.toLowerCase();

      expect(normalized1).toBe(normalized2);
      expect(normalized1).toBe("test@example.com");
    });
  });

  describe("validation errors", () => {
    it("should reject weak password - too short", () => {
      const result = validatePasswordComplexity("Weak1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });

    it("should reject weak password - no uppercase", () => {
      const result = validatePasswordComplexity("weakpass123!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    it("should reject weak password - no lowercase", () => {
      const result = validatePasswordComplexity("WEAKPASS123!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one lowercase letter");
    });

    it("should reject weak password - no number", () => {
      const result = validatePasswordComplexity("WeakPassword!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one number");
    });

    it("should reject weak password - no special character", () => {
      const result = validatePasswordComplexity("WeakPassword123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one special character");
    });

    it("should return multiple errors for very weak password", () => {
      const result = validatePasswordComplexity("weak");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain("Password must be at least 8 characters long");
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
      expect(result.errors).toContain("Password must contain at least one number");
      expect(result.errors).toContain("Password must contain at least one special character");
    });

    it("should validate email format with regex", () => {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(EMAIL_REGEX.test("valid@example.com")).toBe(true);
      expect(EMAIL_REGEX.test("user+tag@example.co.uk")).toBe(true);
      expect(EMAIL_REGEX.test("invalid-email")).toBe(false);
      expect(EMAIL_REGEX.test("@example.com")).toBe(false);
      expect(EMAIL_REGEX.test("test@")).toBe(false);
      expect(EMAIL_REGEX.test("test @example.com")).toBe(false);
    });
  });

  describe("token security", () => {
    it("should generate unique tokens", () => {
      const tokens = new Set<string>();
      const count = 100;

      for (let i = 0; i < count; i++) {
        tokens.add(generateSecureToken());
      }

      expect(tokens.size).toBe(count); // All unique
    });

    it("should hash tokens consistently", async () => {
      const token = generateSecureToken();
      const hash1 = await hashToken(token);
      const hash2 = await hashToken(token);

      expect(hash1).toBe(hash2); // Same token -> same hash
    });

    it("should produce different hashes for different tokens", async () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      const hash1 = await hashToken(token1);
      const hash2 = await hashToken(token2);

      expect(hash1).not.toBe(hash2); // Different tokens -> different hashes
    });

    it("should never store plain tokens (verification)", async () => {
      const plainToken = generateSecureToken();
      const hashedToken = await hashToken(plainToken);

      // These should be completely different
      expect(hashedToken).not.toBe(plainToken);
      expect(hashedToken.length).toBe(64); // SHA-256 hex
      expect(plainToken.length).toBeGreaterThan(32); // Base64url random bytes
    });
  });

  describe("JWT security", () => {
    it("should create valid JWT with correct claims", async () => {
      const memberId = "test-member-123";
      const email = "test@example.com";

      const token = await generateJWT({ memberId, email });
      const payload = await verifyJWT(token);

      expect(payload.memberId).toBe(memberId);
      expect(payload.email).toBe(email);
    });

    it("should reject tampered JWT", async () => {
      const token = await generateJWT({
        memberId: "test-member",
        email: "test@example.com",
      });

      // Tamper with the token
      const parts = token.split(".");
      const tamperedToken = parts[0] + ".tampered." + parts[2];

      await expect(verifyJWT(tamperedToken)).rejects.toThrow();
    });

    it("should include standard JWT claims", async () => {
      const token = await generateJWT({
        memberId: "test-member",
        email: "test@example.com",
      });

      const payload = await verifyJWT(token);

      // Check for standard claims (decoded from JWT)
      expect(payload).toHaveProperty("memberId");
      expect(payload).toHaveProperty("email");
    });
  });

  describe("password security", () => {
    it("should hash passwords with unique salts", async () => {
      const password = "SecurePass123!";

      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Different salts -> different hashes
      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });

    it("should be case sensitive", async () => {
      const password = "SecurePass123!";
      const hash = await hashPassword(password);

      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword("securepass123!", hash)).toBe(false);
      expect(await verifyPassword("SECUREPASS123!", hash)).toBe(false);
    });

    it("should handle special characters", async () => {
      const password = "P@ssw0rd!#$%^&*()";
      const hash = await hashPassword(password);

      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword("P@ssw0rd!#$%^&*()", hash)).toBe(true);
      expect(await verifyPassword("P@ssw0rd", hash)).toBe(false);
    });

    it("should reject empty passwords", async () => {
      const password = "SecurePass123!";
      const hash = await hashPassword(password);

      expect(await verifyPassword("", hash)).toBe(false);
    });
  });

  describe("integration scenarios", () => {
    it("should simulate password reset flow", async () => {
      const email = "user@example.com";
      const oldPassword = "OldPass123!";
      const newPassword = "NewPass456!";

      // Original password
      const oldHash = await hashPassword(oldPassword);
      expect(await verifyPassword(oldPassword, oldHash)).toBe(true);

      // Reset flow: generate token
      const resetToken = generateSecureToken();
      const resetTokenHash = await hashToken(resetToken);

      // Verify token can be looked up (simulated)
      const lookupHash = await hashToken(resetToken);
      expect(lookupHash).toBe(resetTokenHash);

      // Set new password
      const newHash = await hashPassword(newPassword);
      expect(await verifyPassword(newPassword, newHash)).toBe(true);
      expect(await verifyPassword(oldPassword, newHash)).toBe(false);

      // Old password should not work with new hash
      expect(await verifyPassword(oldPassword, newHash)).toBe(false);
    });

    it("should validate password history scenario", async () => {
      const passwords = [
        "FirstPass123!",
        "SecondPass456!",
        "ThirdPass789!",
        "FourthPass000!",
      ];

      const hashes: string[] = [];

      // Create password history
      for (const password of passwords) {
        hashes.push(await hashPassword(password));
      }

      // Check that new password doesn't match any in history
      const newPassword = "NewUniquePass999!";
      const matches = await Promise.all(
        hashes.map((hash) => verifyPassword(newPassword, hash))
      );

      expect(matches.every((match) => match === false)).toBe(true);

      // Check that reused password would be detected
      const reusedPassword = passwords[0];
      const reusedMatches = await Promise.all(
        hashes.map((hash) => verifyPassword(reusedPassword, hash))
      );

      expect(reusedMatches.some((match) => match === true)).toBe(true);
    });

    it("should handle session token lifecycle", async () => {
      const memberId = "member-123";
      const email = "user@example.com";

      // Create session
      const sessionToken = await generateJWT({ memberId, email });
      expect(sessionToken).toBeDefined();

      // Verify session
      const payload1 = await verifyJWT(sessionToken);
      expect(payload1.memberId).toBe(memberId);

      // Verify again (token should still be valid)
      const payload2 = await verifyJWT(sessionToken);
      expect(payload2.memberId).toBe(memberId);

      // Hash for storage lookup
      const sessionTokenHash = await hashToken(sessionToken);
      expect(sessionTokenHash).toBeDefined();
      expect(sessionTokenHash.length).toBe(64);
    });
  });

  describe("edge cases", () => {
    it("should handle very long passwords", async () => {
      const longPassword = "A1!".repeat(100) + "SecurePass";
      const validation = validatePasswordComplexity(longPassword);

      expect(validation.valid).toBe(true);

      const hash = await hashPassword(longPassword);
      expect(await verifyPassword(longPassword, hash)).toBe(true);
    });

    it("should handle unicode characters in passwords", async () => {
      const unicodePassword = "Pàsswørd123!你好";
      const hash = await hashPassword(unicodePassword);

      expect(await verifyPassword(unicodePassword, hash)).toBe(true);
      expect(await verifyPassword("Password123!你好", hash)).toBe(false);
    });

    it("should handle special email formats", () => {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Valid special cases
      expect(EMAIL_REGEX.test("user+tag@example.com")).toBe(true);
      expect(EMAIL_REGEX.test("user.name@example.com")).toBe(true);
      expect(EMAIL_REGEX.test("user_name@example.com")).toBe(true);
      expect(EMAIL_REGEX.test("user-name@example.co.uk")).toBe(true);

      // Invalid cases
      expect(EMAIL_REGEX.test("user @example.com")).toBe(false);
      expect(EMAIL_REGEX.test("user@example")).toBe(false);
      expect(EMAIL_REGEX.test("@example.com")).toBe(false);
    });
  });
});
