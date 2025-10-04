/**
 * JWT utility functions for custom authentication
 *
 * Provides JWT token generation and verification using the jose library
 * with HS256 algorithm for secure session management.
 */

import { SignJWT, jwtVerify } from "jose";

/**
 * JWT payload structure
 */
export interface JWTPayload {
  memberId: string;
  email: string;
}

/**
 * Generate a JWT token for a user session
 *
 * @param payload - User data to encode in JWT (memberId, email)
 * @returns Promise resolving to signed JWT string
 * @throws Error if JWT_SECRET is not configured
 */
export async function generateJWT(payload: JWTPayload): Promise<string> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not configured");
  }

  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const jwt = await new SignJWT({
    memberId: payload.memberId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("vai-custom-auth")
    .setAudience("vai-app")
    .setExpirationTime("7d") // 7 days expiration
    .setIssuedAt()
    .sign(secretKey);

  return jwt;
}

/**
 * Verify and decode a JWT token
 *
 * @param token - JWT token string to verify
 * @returns Promise resolving to decoded payload
 * @throws Error if token is invalid, expired, or JWT_SECRET is not configured
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not configured");
  }

  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: "vai-custom-auth",
      audience: "vai-app",
    });

    // Validate payload structure
    if (
      typeof payload.memberId !== "string" ||
      typeof payload.email !== "string"
    ) {
      throw new Error("Invalid JWT payload structure");
    }

    return {
      memberId: payload.memberId,
      email: payload.email,
    };
  } catch (error) {
    // Re-throw with clear error message
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw new Error("JWT verification failed");
  }
}
