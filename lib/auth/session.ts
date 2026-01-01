import crypto from "crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { members, sessions } from "@/db/schema";

const SESSION_COOKIE = "vai_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionMember = typeof members.$inferSelect;

export async function createSession(memberId: string, request?: Request): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const userAgent = request?.headers.get("user-agent") || "";
  const ipAddress =
    request?.headers.get("x-forwarded-for") || request?.headers.get("x-real-ip") || "";

  await db.insert(sessions).values({
    memberId,
    token,
    userAgent,
    ipAddress,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function getCurrentMember(): Promise<SessionMember | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
    with: {
      member: true,
    },
  });

  if (!session) {
    return null;
  }

  // Update activity timestamps (fire and forget)
  Promise.all([
    db.update(sessions).set({ lastActivityAt: new Date() }).where(eq(sessions.id, session.id)),
    db
      .update(members)
      .set({ lastOnline: new Date(), updatedAt: new Date() })
      .where(eq(members.id, session.memberId)),
  ]).catch(console.error);

  return session.member;
}

export async function getSessionByToken(token: string): Promise<SessionMember | null> {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
    with: {
      member: true,
    },
  });

  return session?.member || null;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(memberId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.memberId, memberId));
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });

  return result.length;
}

export async function refreshSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
  });

  if (!session) {
    return null;
  }

  // Generate new token
  const newToken = crypto.randomBytes(32).toString("hex");
  const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db
    .update(sessions)
    .set({
      token: newToken,
      expiresAt: newExpiresAt,
      lastActivityAt: new Date(),
    })
    .where(eq(sessions.id, session.id));

  cookieStore.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: newExpiresAt,
    path: "/",
  });

  return newToken;
}
