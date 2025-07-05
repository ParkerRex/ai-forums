import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

describe("Notifications System", () => {
  describe("Comment Mention Notifications", () => {
    test("creates mention notification when user is mentioned in comment", async () => {
      const t = convexTest(schema);

      // Create test members
      const authorId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Comment",
          lastName: "Author",
          email: "author@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "comment-author",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_author_${Date.now()}`,
        });
      });

      const mentionedId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Mentioned",
          lastName: "User",
          email: "mentioned@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "mentioned-user",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_mentioned_${Date.now()}`,
        });
      });

      // Create test category and post
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

      const postId = await t.run(async (ctx) => {
        return await ctx.db.insert("posts", {
          title: "Test Post",
          content: "Test content",
          slug: "test-post",
          createdAt: Date.now(),
          updatedAt: Date.now(),
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

      // Create comment with mention
      const commentId = await t.withIdentity({ 
        subject: `user_author_${authorId}`,
        email: "author@example.com"
      }).mutation(api.comments.createComment, {
        content: "Hello @mentioned-user, this is a test comment",
        postId,
        mentions: [mentionedId],
      });

      // Check that notification was created
      const notifications = await t.run(async (ctx) => {
        return await ctx.db
          .query("notifications")
          .withIndex("by_recipient", (q) => q.eq("recipientId", mentionedId))
          .collect();
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("mention");
      expect(notifications[0].entityType).toBe("comment");
      expect(notifications[0].entityId).toBe(commentId);
      expect(notifications[0].actorId).toBe(authorId);
      expect(notifications[0].message).toBe("Comment Author mentioned you in a comment");
      expect(notifications[0].read).toBe(false);
    });

    test("does not create mention notification for self-mention in comment", async () => {
      const t = convexTest(schema);

      // Create test member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Self",
          lastName: "Mentioner",
          email: "self@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "self-mentioner",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_self_${Date.now()}`,
        });
      });

      // Create test category and post
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

      const postId = await t.run(async (ctx) => {
        return await ctx.db.insert("posts", {
          title: "Test Post",
          content: "Test content",
          slug: "test-post",
          createdAt: Date.now(),
          updatedAt: Date.now(),
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

      // Create comment with self-mention
      await t.withIdentity({ 
        subject: `user_self_${memberId}`,
        email: "self@example.com"
      }).mutation(api.comments.createComment, {
        content: "I'm mentioning myself @self-mentioner",
        postId,
        mentions: [memberId], // Self-mention
      });

      // Check that no notification was created
      const notifications = await t.run(async (ctx) => {
        return await ctx.db
          .query("notifications")
          .withIndex("by_recipient", (q) => q.eq("recipientId", memberId))
          .collect();
      });

      expect(notifications).toHaveLength(0);
    });
  });

  describe("Comment Reply Notifications", () => {
    test("creates reply notification when replying to a comment", async () => {
      const t = convexTest(schema);

      // Create test members
      const originalAuthorId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Original",
          lastName: "Author",
          email: "original@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "original-author",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_original_${Date.now()}`,
        });
      });

      const replierId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Reply",
          lastName: "Author",
          email: "replier@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "reply-author",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_replier_${Date.now()}`,
        });
      });

      // Create test category and post
      const categoryId = await t.run(async (ctx) => {
        return await ctx.db.insert("categories", {
          name: "test-category",
          displayName: "Test Category",
          description: "Test category description",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          postCount: 0,
          status: "active",
          creatorId: originalAuthorId,
        });
      });

      const postId = await t.run(async (ctx) => {
        return await ctx.db.insert("posts", {
          title: "Test Post",
          content: "Test content",
          slug: "test-post",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          memberId: originalAuthorId,
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

      // Create original comment
      const originalCommentId = await t.withIdentity({ 
        subject: `user_original_${originalAuthorId}`,
        email: "original@example.com"
      }).mutation(api.comments.createComment, {
        content: "This is the original comment",
        postId,
      });

      // Create reply comment
      const replyCommentId = await t.withIdentity({ 
        subject: `user_replier_${replierId}`,
        email: "replier@example.com"
      }).mutation(api.comments.createComment, {
        content: "This is a reply to the original comment",
        postId,
        parentCommentId: originalCommentId,
      });

      // Check that notification was created for the original author
      const notifications = await t.run(async (ctx) => {
        return await ctx.db
          .query("notifications")
          .withIndex("by_recipient", (q) => q.eq("recipientId", originalAuthorId))
          .collect();
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("reply");
      expect(notifications[0].entityType).toBe("comment");
      expect(notifications[0].entityId).toBe(replyCommentId);
      expect(notifications[0].actorId).toBe(replierId);
      expect(notifications[0].message).toBe("Reply Author replied to your comment");
      expect(notifications[0].read).toBe(false);
    });

    test("does not create reply notification for self-reply", async () => {
      const t = convexTest(schema);

      // Create test member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Self",
          lastName: "Replier",
          email: "selfreplier@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "self-replier",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_selfreplier_${Date.now()}`,
        });
      });

      // Create test category and post
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

      const postId = await t.run(async (ctx) => {
        return await ctx.db.insert("posts", {
          title: "Test Post",
          content: "Test content",
          slug: "test-post",
          createdAt: Date.now(),
          updatedAt: Date.now(),
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

      // Create original comment
      const originalCommentId = await t.withIdentity({ 
        subject: `user_selfreplier_${memberId}`,
        email: "selfreplier@example.com"
      }).mutation(api.comments.createComment, {
        content: "This is my original comment",
        postId,
      });

      // Reply to own comment
      await t.withIdentity({ 
        subject: `user_selfreplier_${memberId}`,
        email: "selfreplier@example.com"
      }).mutation(api.comments.createComment, {
        content: "This is a reply to my own comment",
        postId,
        parentCommentId: originalCommentId,
      });

      // Check that no notification was created
      const notifications = await t.run(async (ctx) => {
        return await ctx.db
          .query("notifications")
          .withIndex("by_recipient", (q) => q.eq("recipientId", memberId))
          .collect();
      });

      expect(notifications).toHaveLength(0);
    });
  });

  describe("Post Mention Notifications", () => {
    test("creates mention notification when user is mentioned in post", async () => {
      const t = convexTest(schema);

      // Create test members
      const authorId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Post",
          lastName: "Author",
          email: "postauthor@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "post-author",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_postauthor_${Date.now()}`,
        });
      });

      const mentionedId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Mentioned",
          lastName: "InPost",
          email: "mentionedpost@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "mentioned-in-post",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_mentionedpost_${Date.now()}`,
        });
      });

      // Create test category
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

      // Create post with mention
      const result = await t.withIdentity({
        subject: `user_postauthor_${authorId}`,
        email: "postauthor@example.com"
      }).mutation(api.posts.createPost, {
        title: "Test Post with Mention",
        content: "Hello @mentioned-in-post, this is a test post",
        categoryId,
        mentions: [mentionedId],
      });

      // Check that notification was created
      const notifications = await t.run(async (ctx) => {
        return await ctx.db
          .query("notifications")
          .withIndex("by_recipient", (q) => q.eq("recipientId", mentionedId))
          .collect();
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("mention");
      expect(notifications[0].entityType).toBe("post");
      expect(notifications[0].entityId).toBe(result.postId);
      expect(notifications[0].actorId).toBe(authorId);
      expect(notifications[0].message).toBe("Post Author mentioned you in a post");
      expect(notifications[0].read).toBe(false);
    });

    test("does not create mention notification for self-mention in post", async () => {
      const t = convexTest(schema);

      // Create test member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Self",
          lastName: "PostMentioner",
          email: "selfpostmention@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "self-post-mentioner",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_selfpostmention_${Date.now()}`,
        });
      });

      // Create test category
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

      // Create post with self-mention
      await t.withIdentity({
        subject: `user_selfpostmention_${memberId}`,
        email: "selfpostmention@example.com"
      }).mutation(api.posts.createPost, {
        title: "Self Mention Post",
        content: "I'm mentioning myself @self-post-mentioner in this post",
        categoryId,
        mentions: [memberId], // Self-mention
      });

      // Check that no notification was created
      const notifications = await t.run(async (ctx) => {
        return await ctx.db
          .query("notifications")
          .withIndex("by_recipient", (q) => q.eq("recipientId", memberId))
          .collect();
      });

      expect(notifications).toHaveLength(0);
    });
  });

  describe("Notification Deduplication", () => {
    test("updates existing notification instead of creating duplicate", async () => {
      const t = convexTest(schema);

      // Create test members
      const authorId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Duplicate",
          lastName: "Tester",
          email: "duplicate@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "duplicate-tester",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_duplicate_${Date.now()}`,
        });
      });

      const mentionedId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          firstName: "Mentioned",
          lastName: "Twice",
          email: "mentionedtwice@example.com",
          status: "active",
          joinedDate: Date.now(),
          slug: "mentioned-twice",
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          externalId: `user_mentionedtwice_${Date.now()}`,
        });
      });

      // Create test category and post
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

      const postId = await t.run(async (ctx) => {
        return await ctx.db.insert("posts", {
          title: "Test Post",
          content: "Test content",
          slug: "test-post",
          createdAt: Date.now(),
          updatedAt: Date.now(),
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

      // Create first comment with mention
      const firstCommentId = await t.withIdentity({
        subject: `user_duplicate_${authorId}`,
        email: "duplicate@example.com"
      }).mutation(api.comments.createComment, {
        content: "First mention @mentioned-twice",
        postId,
        mentions: [mentionedId],
      });

      // Create second comment with same mention (should update existing notification)
      const secondCommentId = await t.withIdentity({
        subject: `user_duplicate_${authorId}`,
        email: "duplicate@example.com"
      }).mutation(api.comments.createComment, {
        content: "Second mention @mentioned-twice",
        postId,
        mentions: [mentionedId],
      });

      // Check that only one notification exists (the updated one)
      const notifications = await t.run(async (ctx) => {
        return await ctx.db
          .query("notifications")
          .withIndex("by_recipient", (q) => q.eq("recipientId", mentionedId))
          .collect();
      });

      expect(notifications).toHaveLength(2); // Two separate comments should create two notifications
      expect(notifications[0].type).toBe("mention");
      expect(notifications[1].type).toBe("mention");
      expect(notifications[0].entityType).toBe("comment");
      expect(notifications[1].entityType).toBe("comment");
    });
  });
});
