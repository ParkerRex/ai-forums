import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Admin Dashboard", () => {
  test("getReportedComments requires admin access", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("members", {
        firstName: "Regular",
        lastName: "User",
        email: "user@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "regular-user",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        externalId: `user_regular_${Date.now()}`,
        role: "user",
      });
    });

    await expect(
      t.withIdentity({ 
        subject: `user_regular_${userId}`,
        email: "user@example.com"
      }).query(api.admin.getReportedComments, {})
    ).rejects.toThrow("Admin access required");
  });

  test("admin can view and resolve reports", async () => {
    const t = convexTest(schema);

    const adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("members", {
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "admin-user",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        externalId: `user_admin_${Date.now()}`,
        role: "admin",
      });
    });

    const categoryId = await t.run(async (ctx) => {
      return await ctx.db.insert("categories", {
        name: "test-category",
        displayName: "Test Category",
        description: "Test category description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 0,
        status: "active",
        creatorId: adminId,
      });
    });

    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: adminId,
        categoryId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0,
        viewCount: 0,
        type: "text",
      });
    });

    const commentId = await t.run(async (ctx) => {
      return await ctx.db.insert("comments", {
        content: "Test comment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: adminId,
        postId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        depth: 0,
        childCount: 0,
      });
    });

    const reportId = await t.run(async (ctx) => {
      return await ctx.db.insert("commentReports", {
        commentId,
        reporterId: adminId,
        reason: "spam",
        status: "pending",
        createdAt: Date.now(),
      });
    });

    const reports = await t.withIdentity({ 
      subject: `user_admin_${adminId}`,
      email: "admin@example.com"
    }).query(api.admin.getReportedComments, {});

    expect(reports).toHaveLength(1);
    expect(reports[0]._id).toBe(reportId);

    await t.withIdentity({ 
      subject: `user_admin_${adminId}`,
      email: "admin@example.com"
    }).mutation(api.admin.resolveReport, {
      reportId,
      action: "resolve",
      deleteComment: true,
    });

    const updatedReports = await t.withIdentity({ 
      subject: `user_admin_${adminId}`,
      email: "admin@example.com"
    }).query(api.admin.getReportedComments, {});

    expect(updatedReports[0].status).toBe("resolved");
  });
});
