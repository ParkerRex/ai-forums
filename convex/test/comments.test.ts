import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Comments - Phase 4 Backend Refactor", () => {
  test("createComment sets both authorId and memberId", async () => {
    const t = convexTest(schema);

    // Create a test member directly
    const memberId = await t.run(async (ctx) => {
      return await ctx.db.insert("members", {
        firstName: "Test",
        lastName: "Commenter",
        email: "commenter@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "test-commenter",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        externalId: `user_${Date.now()}`, // Add externalId for auth
      });
    });

    // Create a test category directly
    const categoryId = await t.run(async (ctx) => {
      return await ctx.db.insert("categories", {
        name: "test-category",
        displayName: "Test Category",
        description: "Test category description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 0,
        status: "active",
        creatorId: memberId,
      });
    });

    // Create a test post
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        authorId: memberId,
        memberId: memberId,
        categoryId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0,
        viewCount: 0,
        isPinned: false,
        isLocked: false,
        type: "text",
      });
    });

    // Create a comment using the unified auth helper
    const commentId = await t.withIdentity({ 
      subject: `user_${memberId}`,
      email: "commenter@example.com"
    }).mutation(api.comments.createComment, {
      content: "Test comment",
      postId,
    });

    // Verify the comment has both fields set
    const comment = await t.run(async (ctx) => {
      return await ctx.db.get(commentId);
    });

    expect(comment).toBeTruthy();
    expect(comment!.authorId).toEqual(memberId);
    expect(comment!.memberId).toEqual(memberId);
    expect(comment!.content).toBe("Test comment");
  });

  test("getCommentsByMember works with new memberId field", async () => {
    const t = convexTest(schema);

    // Create a test member directly
    const memberId = await t.run(async (ctx) => {
      return await ctx.db.insert("members", {
        firstName: "Test",
        lastName: "Commenter",
        email: "commenter@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "test-commenter",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
      });
    });

    // Create a test category directly
    const categoryId = await t.run(async (ctx) => {
      return await ctx.db.insert("categories", {
        name: "test-category",
        displayName: "Test Category",
        description: "Test category description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 0,
        status: "active",
        creatorId: memberId,
      });
    });

    // Create a test post
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        authorId: memberId,
        memberId: memberId,
        categoryId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0,
        viewCount: 0,
        isPinned: false,
        isLocked: false,
        type: "text",
      });
    });

    // Create a comment with both fields
    const commentId = await t.run(async (ctx) => {
      return await ctx.db.insert("comments", {
        content: "Test comment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        authorId: memberId, // Legacy field
        memberId: memberId, // New unified field
        postId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        depth: 0,
        childCount: 0,
      });
    });

    // Test new getCommentsByMember function
    const comments = await t.query(api.comments.getCommentsByMember, {
      memberId,
      limit: 10,
    });

    expect(comments).toHaveLength(1);
    expect(comments[0]._id).toEqual(commentId);
    expect(comments[0].content).toBe("Test comment");
  });

  test("comment authorization works with both legacy and new fields", async () => {
    const t = convexTest(schema);

    // Create test members directly
    const authorId = await t.run(async (ctx) => {
      return await ctx.db.insert("members", {
        firstName: "Test",
        lastName: "Author",
        email: "author@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "test-author",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        externalId: `user_${Date.now()}`, // Add externalId for auth
      });
    });

    const otherId = await t.run(async (ctx) => {
      return await ctx.db.insert("members", {
        firstName: "Other",
        lastName: "User",
        email: "other@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "other-user",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        externalId: `user_other_${Date.now()}`, // Add externalId for auth
      });
    });

    // Create a test category directly
    const categoryId = await t.run(async (ctx) => {
      return await ctx.db.insert("categories", {
        name: "test-category",
        displayName: "Test Category",
        description: "Test category description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 0,
        status: "active",
        creatorId: authorId,
      });
    });

    // Create a test post
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        authorId: authorId,
        memberId: authorId,
        categoryId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0,
        viewCount: 0,
        isPinned: false,
        isLocked: false,
        type: "text",
      });
    });

    // Create a comment with both fields
    const commentId = await t.run(async (ctx) => {
      return await ctx.db.insert("comments", {
        content: "Test comment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        authorId: authorId, // Legacy field
        memberId: authorId, // New unified field
        postId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        depth: 0,
        childCount: 0,
      });
    });

    // Author should be able to edit the comment
    await expect(
      t.withIdentity({ 
        subject: `user_${authorId}`,
        email: "author@example.com"
      }).mutation(api.comments.updateComment, {
        commentId,
        content: "Updated comment",
      })
    ).resolves.toEqual(commentId);

    // Other user should not be able to edit the comment
    await expect(
      t.withIdentity({ 
        subject: `user_other_${otherId}`,
        email: "other@example.com"
      }).mutation(api.comments.updateComment, {
        commentId,
        content: "Unauthorized update",
      })
    ).rejects.toThrow("Only the author can edit this comment");
  });

  test("legacy comments without memberId still work", async () => {
    const t = convexTest(schema);

    // Create a test member directly
    const memberId = await t.run(async (ctx) => {
      return await ctx.db.insert("members", {
        firstName: "Test",
        lastName: "Commenter",
        email: "commenter@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "test-commenter",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        externalId: `user_${Date.now()}`, // Add externalId for auth
      });
    });

    // Create a test category directly
    const categoryId = await t.run(async (ctx) => {
      return await ctx.db.insert("categories", {
        name: "test-category",
        displayName: "Test Category",
        description: "Test category description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 0,
        status: "active",
        creatorId: memberId,
      });
    });

    // Create a test post
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        authorId: memberId,
        categoryId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0,
        viewCount: 0,
        isPinned: false,
        isLocked: false,
        type: "text",
      });
    });

    // Create a legacy comment (only authorId, no memberId)
    const commentId = await t.run(async (ctx) => {
      return await ctx.db.insert("comments", {
        content: "Legacy comment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        authorId: memberId, // Only legacy field
        postId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        depth: 0,
        childCount: 0,
      });
    });

    // Author should still be able to edit legacy comment
    await expect(
      t.withIdentity({ 
        subject: `user_${memberId}`,
        email: "commenter@example.com"
      }).mutation(api.comments.updateComment, {
        commentId,
        content: "Updated legacy comment",
      })
    ).resolves.toEqual(commentId);

    // Verify the comment was updated
    const updatedComment = await t.run(async (ctx) => {
      return await ctx.db.get(commentId);
    });

    expect(updatedComment!.content).toBe("Updated legacy comment");
  });
}); 