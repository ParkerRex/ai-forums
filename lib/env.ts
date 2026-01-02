import { z } from "zod";

/**
 * Environment variable validation using Zod
 *
 * This module validates all environment variables at startup to ensure
 * the application has all required configuration before running.
 *
 * Usage:
 *   import { env } from "@/lib/env";
 *   const dbUrl = env.DATABASE_URL;
 */

// Server-side environment variables schema
const serverEnvSchema = z.object({
  // Database (Required)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Redis (Required for sessions and job queue)
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // Auth (Required)
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // WebSocket
  WS_PORT: z.string().optional(),

  // AWS S3 / Cloudflare R2 (Optional - for media storage)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("auto"),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_ENDPOINT: z.string().optional(),
  AWS_S3_PUBLIC_URL: z.string().optional(),

  // OpenAI (Optional - for AI features)
  OPENAI_API_KEY: z.string().optional(),

  // Discord (Optional - for Discord integration)
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_CHANNEL_ID: z.string().optional(),

  // Stripe (Optional - for payments)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Skool Automation (Optional)
  SKOOL_AUTH_TOKEN: z.string().optional(),
  SKOOL_CLIENT_ID: z.string().optional(),
  SKOOL_WAF_TOKEN: z.string().optional(),
  SKOOL_GROUP_ID: z.string().optional(),
  SKOOL_GROUP_NAME: z.string().optional(),

  // GitHub Webhooks (Optional)
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Exa API (Optional - for search)
  EXA_API_KEY: z.string().optional(),
});

// Client-side environment variables schema (NEXT_PUBLIC_* vars)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NEXT_PUBLIC_WS_URL: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_DISCORD_INVITE_URL: z.string().optional(),
  NEXT_PUBLIC_R2_HOSTNAME: z.string().optional(),
});

// Combined schema
const envSchema = serverEnvSchema.merge(clientEnvSchema);

export type Env = z.infer<typeof envSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validates environment variables and returns typed config.
 * Throws an error with details if validation fails.
 */
function validateEnv(): Env {
  // Skip validation in edge runtime where process.env may be limited
  if (typeof window !== "undefined") {
    // Client-side: only validate client env vars
    const clientResult = clientEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_DISCORD_INVITE_URL: process.env.NEXT_PUBLIC_DISCORD_INVITE_URL,
      NEXT_PUBLIC_R2_HOSTNAME: process.env.NEXT_PUBLIC_R2_HOSTNAME,
    });

    if (!clientResult.success) {
      console.error("Invalid client environment variables:");
      console.error(formatZodErrors(clientResult.error));
      throw new Error("Invalid client environment variables");
    }

    // Return partial env for client
    return clientResult.data as Env;
  }

  // Server-side: validate all env vars
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(formatZodErrors(result.error));

    // In development, provide helpful error messages
    if (process.env.NODE_ENV === "development") {
      console.error("\nMissing or invalid environment variables. Check your .env.local file.");
      console.error("See .env.example for required variables.\n");
    }

    throw new Error("Invalid environment variables");
  }

  return result.data;
}

/**
 * Formats Zod errors into readable messages
 */
function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * Validated environment variables.
 * Access with: env.DATABASE_URL, env.REDIS_URL, etc.
 */
export const env = validateEnv();

/**
 * Type guard to check if a feature is enabled based on env vars
 */
export const features = {
  get stripe(): boolean {
    return Boolean(env.STRIPE_SECRET_KEY);
  },
  get discord(): boolean {
    return Boolean(env.DISCORD_BOT_TOKEN && env.DISCORD_CHANNEL_ID);
  },
  get skool(): boolean {
    return Boolean(
      env.SKOOL_AUTH_TOKEN && env.SKOOL_CLIENT_ID && env.SKOOL_GROUP_ID && env.SKOOL_GROUP_NAME,
    );
  },
  get storage(): boolean {
    return Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_S3_BUCKET);
  },
  get openai(): boolean {
    return Boolean(env.OPENAI_API_KEY);
  },
  get exa(): boolean {
    return Boolean(env.EXA_API_KEY);
  },
} as const;
