/**
 * Unit tests for password utility functions
 */

import { describe, it, expect } from "bun:test";
import { hashPassword, verifyPassword, validatePasswordComplexity } from "./password";

describe("password utilities", () => {
  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const password = "MySecurePassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce different hashes for the same password (salt)", async () => {
      const password = "MySecurePassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle special characters", async () => {
      const password = "P@ssw0rd!#$%^&*()";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "MySecurePassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "MySecurePassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("WrongPassword123!", hash);
      expect(isValid).toBe(false);
    });

    it("should be case sensitive", async () => {
      const password = "MySecurePassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("mysecurepassword123!", hash);
      expect(isValid).toBe(false);
    });

    it("should handle empty password", async () => {
      const password = "MySecurePassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("validatePasswordComplexity", () => {
    it("should accept strong password", () => {
      const result = validatePasswordComplexity("MySecurePass123!");

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject password too short", () => {
      const result = validatePasswordComplexity("Aa1!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });

    it("should reject password without uppercase", () => {
      const result = validatePasswordComplexity("mysecurepass123!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    it("should reject password without lowercase", () => {
      const result = validatePasswordComplexity("MYSECUREPASS123!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one lowercase letter");
    });

    it("should reject password without number", () => {
      const result = validatePasswordComplexity("MySecurePass!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one number");
    });

    it("should reject password without special character", () => {
      const result = validatePasswordComplexity("MySecurePass123");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one special character");
    });

    it("should return multiple errors for weak password", () => {
      const result = validatePasswordComplexity("weak");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain("Password must be at least 8 characters long");
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
      expect(result.errors).toContain("Password must contain at least one number");
      expect(result.errors).toContain("Password must contain at least one special character");
    });

    it("should handle edge cases", () => {
      // Exactly 8 characters, all requirements met
      const result1 = validatePasswordComplexity("Abcd123!");
      expect(result1.valid).toBe(true);

      // Multiple special characters
      const result2 = validatePasswordComplexity("Pass123!@#$%");
      expect(result2.valid).toBe(true);

      // Unicode characters (should still require special char)
      const result3 = validatePasswordComplexity("Päss1234");
      expect(result3.valid).toBe(false);
    });
  });
});
