import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { COMMENT_EDIT_WINDOW_MS } from "../../lib/constants";

describe("Comment Edit Time Restrictions", () => {
  test("user can edit comment within time window", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("members", {
        firstName: "Test",
        lastName: "User",
        email: "user@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "test-user",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        externalId: `user_test_${Date.now()}`,
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
        creatorId: userId,
      });
    });

    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: userId,
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

    const recentCommentId = await t.withIdentity({ 
      subject: `user_test_${userId}`,
      email: "user@example.com"
    }).mutation(api.comments.createComment, {
      content: "Recent comment",
      postId,
    });

    await expect(
      t.withIdentity({ 
        subject: `user_test_${userId}`,
        email: "user@example.com"
      }).mutation(api.comments.updateComment, {
        commentId: recentCommentId,
        content: "Updated recent comment",
      })
    ).resolves.toBeTruthy();
  });

  test("admin can edit any comment regardless of time", async () => {
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
        memberId: userId,
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

    const oldCommentId = await t.run(async (ctx) => {
      return await ctx.db.insert("comments", {
        content: "Old comment",
        createdAt: Date.now() - COMMENT_EDIT_WINDOW_MS - 1000, // 1 second past window
        updatedAt: Date.now() - COMMENT_EDIT_WINDOW_MS - 1000,
        memberId: userId,
        postId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        depth: 0,
        childCount: 0,
      });
    });

    await expect(
      t.withIdentity({ 
        subject: `user_admin_${adminId}`,
        email: "admin@example.com"
      }).mutation(api.admin.deleteAnyComment, {
        commentId: oldCommentId,
      })
    ).resolves.toBeTruthy();
  });
});
