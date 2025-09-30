"use server";

import { cookies } from "next/headers";

export async function getGuestSession() {
  const cookieStore = await cookies();
  const guestSessionCookie = cookieStore.get("guest-session");

  if (!guestSessionCookie) {
    return null;
  }

  try {
    const session = JSON.parse(guestSessionCookie.value);

    // Check if session is expired
    if (session.expiresAt && session.expiresAt < Date.now()) {
      // Delete expired cookie
      cookieStore.delete("guest-session");
      return null;
    }

    return {
      email: session.email,
      memberId: session.memberId,
    };
  } catch (error) {
    console.error("Error parsing guest session:", error);
    return null;
  }
}

export async function clearGuestSession() {
  const cookieStore = await cookies();
  cookieStore.delete("guest-session");
}
