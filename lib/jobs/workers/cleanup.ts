import { lt } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, sessions } from "@/db/schema";

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });

  // Also cleanup expired password reset tokens
  await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));

  return result.length;
}
