/**
 * Secure token generation and hashing utilities
 *
 * Provides cryptographically secure random token generation
 * and one-way hashing for storing tokens securely in the database.
 */

/**
 * Generate a cryptographically secure random token
 *
 * Creates a URL-safe 32-byte random token suitable for
 * email verification, password reset, and other security tokens.
 *
 * @returns URL-safe base64-encoded random token string
 */
export function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  // Convert to base64url (URL-safe base64)
  // Manual base64url encoding since Buffer is not available in Convex runtime
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  // Convert to URL-safe base64
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Hash a token using SHA-256
 *
 * Creates a one-way hash of a token for secure storage.
 * Never store plain tokens in the database - always hash them first.
 *
 * @param token - Plain token to hash
 * @returns Hexadecimal string of SHA-256 hash
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
