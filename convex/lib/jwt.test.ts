/**
 * Unit tests for JWT utility functions
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { generateJWT, verifyJWT } from "./jwt";

// Set up JWT secret for tests
beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-secret-key-for-unit-tests-only-do-not-use-in-production";
  }
});

describe("JWT utilities", () => {
  describe("generateJWT", () => {
    it("should generate a valid JWT token", async () => {
      const payload = {
        memberId: "test-member-id-123" as any,
        email: "test@example.com",
      };

      const token = await generateJWT(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT has 3 parts
    });

    it("should include memberId and email in token", async () => {
      const payload = {
        memberId: "member-456" as any,
        email: "user@test.com",
      };

      const token = await generateJWT(payload);
      const verified = await verifyJWT(token);

      expect(verified.memberId).toBe(payload.memberId);
      expect(verified.email).toBe(payload.email);
    });

    it("should create different tokens for different payloads", async () => {
      const payload1 = {
        memberId: "member-1" as any,
        email: "user1@test.com",
      };
      const payload2 = {
        memberId: "member-2" as any,
        email: "user2@test.com",
      };

      const token1 = await generateJWT(payload1);
      const token2 = await generateJWT(payload2);

      expect(token1).not.toBe(token2);
    });

    it("should handle special characters in email", async () => {
      const payload = {
        memberId: "member-789" as any,
        email: "user+test@example.co.uk",
      };

      const token = await generateJWT(payload);
      const verified = await verifyJWT(token);

      expect(verified.email).toBe(payload.email);
    });
  });

  describe("verifyJWT", () => {
    it("should verify valid token", async () => {
      const payload = {
        memberId: "member-test" as any,
        email: "verify@test.com",
      };

      const token = await generateJWT(payload);
      const verified = await verifyJWT(token);

      expect(verified).toBeDefined();
      expect(verified.memberId).toBe(payload.memberId);
      expect(verified.email).toBe(payload.email);
    });

    it("should reject invalid token", async () => {
      const invalidToken = "invalid.token.here";

      await expect(verifyJWT(invalidToken)).rejects.toThrow();
    });

    it("should reject tampered token", async () => {
      const payload = {
        memberId: "member-test" as any,
        email: "tamper@test.com",
      };

      const token = await generateJWT(payload);
      // Tamper with the token by changing the last character
      const tamperedToken = token.slice(0, -1) + "X";

      await expect(verifyJWT(tamperedToken)).rejects.toThrow();
    });

    it("should reject token with wrong signature", async () => {
      const payload = {
        memberId: "member-test" as any,
        email: "wrong@test.com",
      };

      const token = await generateJWT(payload);

      // Change the secret temporarily
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "different-secret";

      await expect(verifyJWT(token)).rejects.toThrow();

      // Restore original secret
      process.env.JWT_SECRET = originalSecret;
    });

    it("should reject expired token", async () => {
      // Create a token that expires immediately
      const { SignJWT } = await import("jose");

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const expiredToken = await new SignJWT({
        memberId: "member-expired",
        email: "expired@test.com",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer("vai-custom-auth")
        .setAudience("vai-app")
        .setExpirationTime("0s") // Expires immediately
        .sign(secret);

      // Wait a bit to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(verifyJWT(expiredToken)).rejects.toThrow();
    });

    it("should verify token claims (issuer, audience)", async () => {
      const payload = {
        memberId: "member-claims" as any,
        email: "claims@test.com",
      };

      const token = await generateJWT(payload);
      const verified = await verifyJWT(token);

      // The verify function should have checked issuer and audience
      // If we get here without error, claims were validated
      expect(verified).toBeDefined();
    });

    it("should reject token with wrong issuer", async () => {
      const { SignJWT } = await import("jose");

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const wrongIssuerToken = await new SignJWT({
        memberId: "member-issuer",
        email: "issuer@test.com",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer("wrong-issuer") // Wrong issuer
        .setAudience("vai-app")
        .setExpirationTime("7d")
        .sign(secret);

      await expect(verifyJWT(wrongIssuerToken)).rejects.toThrow();
    });

    it("should reject token with wrong audience", async () => {
      const { SignJWT } = await import("jose");

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const wrongAudienceToken = await new SignJWT({
        memberId: "member-audience",
        email: "audience@test.com",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer("vai-custom-auth")
        .setAudience("wrong-app") // Wrong audience
        .setExpirationTime("7d")
        .sign(secret);

      await expect(verifyJWT(wrongAudienceToken)).rejects.toThrow();
    });
  });

  describe("token expiration", () => {
    it("should set expiration to 7 days by default", async () => {
      const { jwtDecrypt } = await import("jose");
      const payload = {
        memberId: "member-exp" as any,
        email: "exp@test.com",
      };

      const token = await generateJWT(payload);

      // Decode without verification to check claims
      const parts = token.split(".");
      const payloadPart = JSON.parse(atob(parts[1]));

      expect(payloadPart.exp).toBeDefined();
      expect(payloadPart.iat).toBeDefined();

      // Check that expiration is approximately 7 days from issue
      const expirationDelta = payloadPart.exp - payloadPart.iat;
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;

      // Allow 1 second tolerance
      expect(Math.abs(expirationDelta - sevenDaysInSeconds)).toBeLessThan(2);
    });
  });
});
