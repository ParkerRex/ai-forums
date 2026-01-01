import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { comments, members, notifications, posts } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAll: z.boolean().optional(),
});

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const conditions = [eq(notifications.recipientId, member.id)];
    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }

    const result = await db
      .select({
        notification: notifications,
        actor: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          slug: members.slug,
          avatarUrl: members.avatarUrl,
        },
      })
      .from(notifications)
      .leftJoin(members, eq(notifications.actorId, members.id))
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    // Get post info for notifications that reference posts or comments
    const postEntityIds = result
      .filter((r) => r.notification.entityType === "post" && r.notification.entityId)
      .map((r) => r.notification.entityId as string);

    const commentEntityIds = result
      .filter((r) => r.notification.entityType === "comment" && r.notification.entityId)
      .map((r) => r.notification.entityId as string);

    // Fetch posts directly referenced
    const postInfoMap = new Map<string, { id: string; slug: string }>();
    if (postEntityIds.length > 0) {
      const postInfos = await db
        .select({ id: posts.id, slug: posts.slug })
        .from(posts)
        .where(inArray(posts.id, postEntityIds));
      for (const post of postInfos) {
        postInfoMap.set(post.id, post);
      }
    }

    // Fetch posts for comments
    const commentPostMap = new Map<string, { postId: string; postSlug: string }>();
    if (commentEntityIds.length > 0) {
      const commentInfos = await db
        .select({
          commentId: comments.id,
          postId: posts.id,
          postSlug: posts.slug,
        })
        .from(comments)
        .innerJoin(posts, eq(comments.postId, posts.id))
        .where(inArray(comments.id, commentEntityIds));
      for (const info of commentInfos) {
        commentPostMap.set(info.commentId, {
          postId: info.postId,
          postSlug: info.postSlug,
        });
      }
    }

    // Get unread count
    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.recipientId, member.id), eq(notifications.read, false)));

    return NextResponse.json({
      items: result.map((row) => {
        let postId: string | null = null;
        let postSlug: string | null = null;

        if (row.notification.entityType === "post" && row.notification.entityId) {
          const postInfo = postInfoMap.get(row.notification.entityId);
          if (postInfo) {
            postId = postInfo.id;
            postSlug = postInfo.slug;
          }
        } else if (row.notification.entityType === "comment" && row.notification.entityId) {
          const commentInfo = commentPostMap.get(row.notification.entityId);
          if (commentInfo) {
            postId = commentInfo.postId;
            postSlug = commentInfo.postSlug;
          }
        }

        return {
          ...row.notification,
          actor: row.actor,
          postId,
          postSlug,
        };
      }),
      unreadCount: Number(unreadCount[0]?.count || 0),
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ error: "Failed to get notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { notificationIds, markAll } = parsed.data;

    if (markAll) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.recipientId, member.id));
    } else if (notificationIds && notificationIds.length > 0) {
      for (const id of notificationIds) {
        await db
          .update(notifications)
          .set({ read: true })
          .where(and(eq(notifications.id, id), eq(notifications.recipientId, member.id)));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json({ error: "Failed to mark notifications" }, { status: 500 });
  }
}
