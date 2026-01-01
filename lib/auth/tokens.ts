import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { members, passwordResetTokens } from "@/db/schema";

const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const member = await db.query.members.findFirst({
    where: eq(members.email, email.toLowerCase()),
  });

  if (!member) {
    // Don't reveal if email exists
    return null;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS);

  await db.insert(passwordResetTokens).values({
    memberId: member.id,
    token,
    expiresAt,
  });

  return token;
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const resetToken = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.token, token),
      gt(passwordResetTokens.expiresAt, new Date()),
      isNull(passwordResetTokens.usedAt),
    ),
  });

  return resetToken?.memberId || null;
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const resetToken = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.token, token),
      gt(passwordResetTokens.expiresAt, new Date()),
      isNull(passwordResetTokens.usedAt),
    ),
  });

  if (!resetToken) {
    return null;
  }

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetToken.id));

  return resetToken.memberId;
}
