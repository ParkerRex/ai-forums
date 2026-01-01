import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, postVersions } from "@/db/schema";

type RouteParams = {
  params: Promise<{ postId: string }>;
};

// GET /api/posts/[postId]/history - Get post edit history
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;

    const history = await db
      .select({
        version: postVersions,
        editor: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          avatarUrl: members.avatarUrl,
        },
      })
      .from(postVersions)
      .leftJoin(members, eq(postVersions.editorId, members.id))
      .where(eq(postVersions.postId, postId))
      .orderBy(desc(postVersions.version));

    return NextResponse.json(
      history.map((row) => ({
        id: row.version.id,
        postId: row.version.postId,
        version: row.version.version,
        title: row.version.title,
        content: row.version.content,
        editorId: row.version.editorId,
        editedAt: row.version.editedAt?.toISOString(),
        editor: row.editor
          ? {
              id: row.editor.id,
              firstName: row.editor.firstName,
              lastName: row.editor.lastName,
              avatarUrl: row.editor.avatarUrl,
            }
          : null,
      })),
    );
  } catch (error) {
    console.error("Get post history error:", error);
    return NextResponse.json({ error: "Failed to get post history" }, { status: 500 });
  }
}
