#!/usr/bin/env bun

/**
 * Generate a secure JWT secret for authentication
 *
 * Creates a cryptographically secure random secret suitable for
 * signing JWT tokens. The secret should be stored in .env.local
 * and kept secure.
 */

import { webcrypto } from "node:crypto";

function generateJWTSecret(): string {
  const bytes = new Uint8Array(32);
  webcrypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

const secret = generateJWTSecret();

console.log("\n=== JWT Secret Generated ===\n");
console.log("Add this to your .env.local file:\n");
console.log(`JWT_SECRET=${secret}\n`);
console.log("⚠️  Keep this secret secure and never commit it to version control!\n");
