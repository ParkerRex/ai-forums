import { and, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories, commentReports, comments, members, posts } from "@/db/schema";
import { forbiddenResponse, requireAdmin } from "@/lib/auth";

// GET /api/admin/reported-comments - List reported comments
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const conditions = [];

    if (status) {
      conditions.push(eq(commentReports.status, status));
    }

    // Get reports with related data
    const reports = await db
      .select({
        id: commentReports.id,
        commentId: commentReports.commentId,
        reporterId: commentReports.reporterId,
        reason: commentReports.reason,
        reasonText: commentReports.reasonText,
        status: commentReports.status,
        createdAt: commentReports.createdAt,
        resolvedBy: commentReports.resolvedBy,
        resolvedAt: commentReports.resolvedAt,
        // Comment info
        commentContent: comments.content,
        commentMemberId: comments.memberId,
        commentPostId: comments.postId,
        // Post info
        postTitle: posts.title,
        postSlug: posts.slug,
        postCategoryId: posts.categoryId,
      })
      .from(commentReports)
      .leftJoin(comments, eq(commentReports.commentId, comments.id))
      .leftJoin(posts, eq(comments.postId, posts.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(commentReports.createdAt))
      .limit(limit);

    // Get all relevant member IDs
    const memberIds = new Set<string>();
    for (const report of reports) {
      if (report.reporterId) memberIds.add(report.reporterId);
      if (report.commentMemberId) memberIds.add(report.commentMemberId);
    }

    // Fetch members in bulk
    const memberRecords = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        email: members.email,
      })
      .from(members)
      .where(
        memberIds.size > 0
          ? sql`${members.id} IN (${sql.join(
              Array.from(memberIds).map((id) => sql`${id}::uuid`),
              sql`, `,
            )})`
          : sql`false`,
      );

    const membersById = new Map(memberRecords.map((m) => [m.id, m]));

    // Get category names for posts
    const categoryIds = new Set<string>();
    for (const report of reports) {
      if (report.postCategoryId) categoryIds.add(report.postCategoryId);
    }

    const categoryRecords =
      categoryIds.size > 0
        ? await db
            .select({
              id: categories.id,
              name: categories.name,
            })
            .from(categories)
            .where(
              sql`${categories.id} IN (${sql.join(
                Array.from(categoryIds).map((id) => sql`${id}::uuid`),
                sql`, `,
              )})`,
            )
        : [];

    const categoriesById = new Map(categoryRecords.map((c) => [c.id, c]));

    // Format response
    const enrichedReports = reports.map((report) => {
      const commentAuthor = report.commentMemberId ? membersById.get(report.commentMemberId) : null;
      const reporter = report.reporterId ? membersById.get(report.reporterId) : null;
      const category = report.postCategoryId ? categoriesById.get(report.postCategoryId) : null;

      return {
        _id: report.id,
        commentId: report.commentId,
        reporterId: report.reporterId,
        reason: report.reason,
        reasonText: report.reasonText,
        status: report.status,
        createdAt: report.createdAt ? new Date(report.createdAt).getTime() : Date.now(),
        comment: report.commentId
          ? {
              _id: report.commentId,
              content: report.commentContent || "",
              author: commentAuthor
                ? {
                    _id: commentAuthor.id,
                    firstName: commentAuthor.firstName,
                    lastName: commentAuthor.lastName,
                    email: commentAuthor.email,
                  }
                : null,
            }
          : null,
        reporter: reporter
          ? {
              _id: reporter.id,
              firstName: reporter.firstName,
              lastName: reporter.lastName,
              email: reporter.email,
            }
          : null,
        post: report.postSlug
          ? {
              _id: report.commentPostId,
              title: report.postTitle,
              slug: report.postSlug,
              categoryName: category?.name || null,
            }
          : null,
      };
    });

    return NextResponse.json(enrichedReports);
  } catch (error) {
    console.error("Admin get reported comments error:", error);
    return NextResponse.json({ error: "Failed to get reported comments" }, { status: 500 });
  }
}
