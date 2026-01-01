import { describe, expect, test } from "bun:test";
import { z } from "zod";

/**
 * Test the env schema definitions directly without triggering validation
 * The actual validation happens at module load time, which requires real env vars
 */

// Copy of the schema for testing (to avoid triggering validateEnv)
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
});

describe("Environment Variable Schemas", () => {
  describe("serverEnvSchema", () => {
    test("validates complete server config", () => {
      const result = serverEnvSchema.safeParse({
        DATABASE_URL: "postgresql://localhost:5432/db",
        REDIS_URL: "redis://localhost:6379",
        SESSION_SECRET: "a-secret-that-is-at-least-32-characters-long",
      });
      expect(result.success).toBe(true);
    });

    test("rejects missing DATABASE_URL", () => {
      const result = serverEnvSchema.safeParse({
        REDIS_URL: "redis://localhost:6379",
        SESSION_SECRET: "a-secret-that-is-at-least-32-characters-long",
      });
      expect(result.success).toBe(false);
    });

    test("rejects short SESSION_SECRET", () => {
      const result = serverEnvSchema.safeParse({
        DATABASE_URL: "postgresql://localhost:5432/db",
        REDIS_URL: "redis://localhost:6379",
        SESSION_SECRET: "too-short",
      });
      expect(result.success).toBe(false);
    });

    test("defaults NODE_ENV to development", () => {
      const result = serverEnvSchema.safeParse({
        DATABASE_URL: "postgresql://localhost:5432/db",
        REDIS_URL: "redis://localhost:6379",
        SESSION_SECRET: "a-secret-that-is-at-least-32-characters-long",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe("development");
      }
    });

    test("accepts valid NODE_ENV values", () => {
      for (const env of ["development", "production", "test"]) {
        const result = serverEnvSchema.safeParse({
          DATABASE_URL: "postgresql://localhost:5432/db",
          REDIS_URL: "redis://localhost:6379",
          SESSION_SECRET: "a-secret-that-is-at-least-32-characters-long",
          NODE_ENV: env,
        });
        expect(result.success).toBe(true);
      }
    });

    test("rejects invalid NODE_ENV", () => {
      const result = serverEnvSchema.safeParse({
        DATABASE_URL: "postgresql://localhost:5432/db",
        REDIS_URL: "redis://localhost:6379",
        SESSION_SECRET: "a-secret-that-is-at-least-32-characters-long",
        NODE_ENV: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("clientEnvSchema", () => {
    test("validates valid app URL", () => {
      const result = clientEnvSchema.safeParse({
        NEXT_PUBLIC_APP_URL: "https://example.com",
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid URL", () => {
      const result = clientEnvSchema.safeParse({
        NEXT_PUBLIC_APP_URL: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    test("accepts localhost URL", () => {
      const result = clientEnvSchema.safeParse({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      });
      expect(result.success).toBe(true);
    });
  });
});
