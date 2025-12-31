import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commentReports, comments, posts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin, forbiddenResponse } from "@/lib/auth";

// POST /api/admin/resolve-report - Resolve or dismiss a comment report
export async function POST(request: NextRequest) {
	const admin = await requireAdmin();
	if (!admin) {
		return forbiddenResponse();
	}

	try {
		const body = await request.json();
		const { reportId, action, deleteComment } = body;

		if (!reportId || !action) {
			return NextResponse.json(
				{ error: "Missing reportId or action" },
				{ status: 400 },
			);
		}

		if (action !== "resolve" && action !== "dismiss") {
			return NextResponse.json(
				{ error: "Invalid action. Must be 'resolve' or 'dismiss'" },
				{ status: 400 },
			);
		}

		// Get the report
		const report = await db.query.commentReports.findFirst({
			where: eq(commentReports.id, reportId),
		});

		if (!report) {
			return NextResponse.json(
				{ error: "Report not found" },
				{ status: 404 },
			);
		}

		// If resolving with delete, delete the comment first
		if (action === "resolve" && deleteComment && report.commentId) {
			// Get comment to find the post
			const comment = await db.query.comments.findFirst({
				where: eq(comments.id, report.commentId),
			});

			if (comment) {
				// Delete the comment (soft delete by setting status)
				await db
					.update(comments)
					.set({
						status: "deleted",
						updatedAt: new Date(),
					})
					.where(eq(comments.id, report.commentId));

				// Decrement post comment count
				await db
					.update(posts)
					.set({
						commentCount: sql`${posts.commentCount} - 1`,
						updatedAt: new Date(),
					})
					.where(eq(posts.id, comment.postId));
			}
		}

		// Update the report status
		const newStatus = action === "resolve" ? "resolved" : "dismissed";
		const [updatedReport] = await db
			.update(commentReports)
			.set({
				status: newStatus,
				resolvedBy: admin.id,
				resolvedAt: new Date(),
			})
			.where(eq(commentReports.id, reportId))
			.returning();

		return NextResponse.json({
			success: true,
			report: {
				...updatedReport,
				_id: updatedReport.id,
			},
		});
	} catch (error) {
		console.error("Admin resolve report error:", error);
		return NextResponse.json(
			{ error: "Failed to resolve report" },
			{ status: 500 },
		);
	}
}
