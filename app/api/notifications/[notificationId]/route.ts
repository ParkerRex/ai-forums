import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ notificationId: string }>;
};

// PATCH /api/notifications/[notificationId] - Mark a single notification as read
export async function PATCH(_request: NextRequest, context: RouteContext) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await context.params;

    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, member.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json({ error: "Failed to mark notification" }, { status: 500 });
  }
}

// DELETE /api/notifications/[notificationId] - Delete a notification
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await context.params;

    await db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, member.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
