import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedMember } from "./auth";

// Helper to check if member is admin
async function isAdmin(ctx: any, memberId: string) {
  const member = await ctx.db.get(memberId);
  return member?.role === "admin";
}

// Get reported comments (admin only)
export const getReportedComments = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("resolved"), v.literal("dismissed"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit = 50 }) => {
    // Get authenticated member
    const member = await getAuthenticatedMember(ctx);
    
    // Check admin permission
    if (!await isAdmin(ctx, member._id)) {
      throw new Error("Admin access required");
    }

    // Build query
    const reports = status
      ? await ctx.db
          .query("commentReports")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("commentReports")
          .order("desc")
          .take(limit);

    // Enrich with comment and reporter data
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        const comment = await ctx.db.get(report.commentId);
        const reporter = await ctx.db.get(report.reporterId);
        
        let commentAuthor = null;
        let post = null;
        
        if (comment) {
          commentAuthor = await ctx.db.get(comment.memberId);
          post = await ctx.db.get(comment.postId);
        }

        return {
          ...report,
          comment: comment ? {
            ...comment,
            author: commentAuthor ? {
              _id: commentAuthor._id,
              firstName: commentAuthor.firstName,
              lastName: commentAuthor.lastName,
              email: commentAuthor.email,
            } : null,
          } : null,
          reporter: reporter ? {
            _id: reporter._id,
            firstName: reporter.firstName,
            lastName: reporter.lastName,
            email: reporter.email,
          } : null,
          post: post ? {
            _id: post._id,
            title: post.title,
            slug: post.slug,
          } : null,
        };
      })
    );

    return enrichedReports;
  },
});

// Resolve or dismiss a report (admin only)
export const resolveReport = mutation({
  args: {
    reportId: v.id("commentReports"),
    action: v.union(v.literal("resolve"), v.literal("dismiss")),
    deleteComment: v.optional(v.boolean()),
  },
  handler: async (ctx, { reportId, action, deleteComment = false }) => {
    // Get authenticated member
    const member = await getAuthenticatedMember(ctx);
    
    // Check admin permission
    if (!await isAdmin(ctx, member._id)) {
      throw new Error("Admin access required");
    }

    const report = await ctx.db.get(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const now = Date.now();

    // Update report status
    await ctx.db.patch(reportId, {
      status: action === "resolve" ? "resolved" : "dismissed",
      resolvedAt: now,
      resolvedBy: member._id,
    });

    // If resolving and deleteComment is true, soft delete the comment
    if (action === "resolve" && deleteComment && report.commentId) {
      const comment = await ctx.db.get(report.commentId);
      if (comment && comment.status === "active") {
        await ctx.db.patch(report.commentId, {
          status: "deleted",
          updatedAt: now,
        });

        // Update post comment count
        const post = await ctx.db.get(comment.postId);
        if (post) {
          await ctx.db.patch(comment.postId, {
            commentCount: Math.max(0, (post.commentCount || 0) - 1),
            updatedAt: now,
          });
        }

        // Update parent comment child count
        if (comment.parentCommentId) {
          const parentComment = await ctx.db.get(comment.parentCommentId);
          if (parentComment) {
            await ctx.db.patch(comment.parentCommentId, {
              childCount: Math.max(0, (parentComment.childCount || 0) - 1),
              updatedAt: now,
            });
          }
        }
      }
    }

    return reportId;
  },
});

// Delete any comment (admin only)
export const deleteAnyComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, { commentId }) => {
    // Get authenticated member
    const member = await getAuthenticatedMember(ctx);
    
    // Check admin permission
    if (!await isAdmin(ctx, member._id)) {
      throw new Error("Admin access required");
    }

    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Soft delete the comment
    await ctx.db.patch(commentId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    // Update post comment count
    const post = await ctx.db.get(comment.postId);
    if (post) {
      await ctx.db.patch(comment.postId, {
        commentCount: Math.max(0, (post.commentCount || 0) - 1),
        updatedAt: Date.now(),
      });
    }

    // Update parent comment child count
    if (comment.parentCommentId) {
      const parentComment = await ctx.db.get(comment.parentCommentId);
      if (parentComment) {
        await ctx.db.patch(comment.parentCommentId, {
          childCount: Math.max(0, (parentComment.childCount || 0) - 1),
          updatedAt: Date.now(),
        });
      }
    }

    return commentId;
  },
});

// Internal mutation to set admin role by email
export const setAdminRole = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    // Find member by email
    const members = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), email.toLowerCase()))
      .collect();

    if (members.length === 0) {
      throw new Error(`No member found with email: ${email}`);
    }

    // Update the first matching member (should only be one)
    const member = members[0];
    await ctx.db.patch(member._id, {
      role: "admin",
      updatedAt: Date.now(),
    });

    return member._id;
  },
});

// Public mutation to set initial admin (for one-time setup)
export const setInitialAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if there's already an admin
    const existingAdmins = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .collect();
    
    if (existingAdmins.length > 0) {
      throw new Error("Admin already exists");
    }

    // Find member with email me@Parkerrex.com
    const adminEmail = "me@parkerrex.com";
    
    const members = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), adminEmail.toLowerCase()))
      .collect();

    if (members.length === 0) {
      throw new Error(`No member found with email: ${adminEmail}`);
    }

    // Update the first matching member to admin role
    const member = members[0];
    await ctx.db.patch(member._id, {
      role: "admin",
      updatedAt: Date.now(),
    });

    return { success: true, memberId: member._id };
  },
});

// Query to check if current user is admin
export const isCurrentUserAdmin = query({
  handler: async (ctx) => {
    try {
      const member = await getAuthenticatedMember(ctx);
      return await isAdmin(ctx, member._id);
    } catch {
      return false;
    }
  },
});