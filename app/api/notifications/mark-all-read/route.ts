import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.recipientId, member.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return NextResponse.json({ error: "Failed to mark all notifications" }, { status: 500 });
  }
}
