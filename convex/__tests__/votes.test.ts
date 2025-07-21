import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

describe("votes", () => {
  describe("getUserVotesBatch", () => {
    test("returns correct vote map for authenticated user with mixed votes", async () => {
      const t = convexTest(schema);
      
      // Create test member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          externalId: "clerk_123",
          slug: "test-user",
          joinedDate: Date.now(),
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          status: "active",
        });
      });

      // Create test category
      const categoryId = await t.run(async (ctx) => {
        return await ctx.db.insert("categories", {
          name: "general",
          displayName: "General",
          description: "General discussion",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          postCount: 0,
          status: "active",
          creatorId: memberId,
        });
      });

      // Create test posts
      const [post1, post2, post3] = await t.run(async (ctx) => {
        const posts = [];
        for (let i = 1; i <= 3; i++) {
          const postId = await ctx.db.insert("posts", {
            memberId,
            categoryId,
            title: `Test Post ${i}`,
            content: `Content ${i}`,
            slug: `test-post-${i}`,
            status: "active",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            upvotes: 0,
            downvotes: 0,
            netVotes: 0,
            commentCount: 0,
            viewCount: 0,
          });
          posts.push(postId);
        }
        return posts;
      });

      // Add votes for post1 and post3 only
      await t.run(async (ctx) => {
        await ctx.db.insert("votes", {
          userId: memberId,
          targetId: post1,
          targetType: "post",
          voteType: "upvote",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        await ctx.db.insert("votes", {
          userId: memberId,
          targetId: post3,
          targetType: "post",
          voteType: "upvote",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Set up authentication identity
      const asUser = t.withIdentity({
        email: "test@example.com",
        subject: "clerk_123",
        given_name: "Test",
        family_name: "User",
      });
      
      // Test batch query
      const result = await asUser.query(api.votes.getUserVotesBatch, {
        targetIds: [post1, post2, post3],
        targetType: "post",
      });

      expect(result).toEqual({
        [post1]: "upvote",
        [post3]: "upvote",
        // post2 should not be in the result
      });
    });

    test("returns empty object for unauthenticated user", async () => {
      const t = convexTest(schema);
      
      // Create test member and category first
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          externalId: "clerk_123",
          slug: "test-user",
          joinedDate: Date.now(),
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          status: "active",
        });
      });

      const categoryId = await t.run(async (ctx) => {
        return await ctx.db.insert("categories", {
          name: "general",
          displayName: "General",
          description: "General discussion",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          postCount: 0,
          status: "active",
          creatorId: memberId,
        });
      });
      
      // Create test posts
      const postId = await t.run(async (ctx) => {
        return await ctx.db.insert("posts", {
          memberId,
          categoryId,
          title: "Test Post",
          content: "Content",
          slug: "test-post",
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          upvotes: 0,
          downvotes: 0,
          netVotes: 0,
          commentCount: 0,
          viewCount: 0,
        });
      });

      // Test without authentication
      const result = await t.query(api.votes.getUserVotesBatch, {
        targetIds: [postId],
        targetType: "post",
      });

      expect(result).toEqual({});
    });

    test("returns empty object immediately for empty targetIds", async () => {
      const t = convexTest(schema);
      
      // Set up authentication identity
      const asUser = t.withIdentity({
        email: "test@example.com",
        subject: "clerk_123",
        given_name: "Test",
        family_name: "User",
      });
      
      // Test with empty array
      const result = await asUser.query(api.votes.getUserVotesBatch, {
        targetIds: [],
        targetType: "post",
      });

      expect(result).toEqual({});
    });

    test("filters by targetType correctly", async () => {
      const t = convexTest(schema);
      
      // Create test member
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("members", {
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          externalId: "clerk_123",
          slug: "test-user",
          joinedDate: Date.now(),
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          status: "active",
        });
      });

      const categoryId = await t.run(async (ctx) => {
        return await ctx.db.insert("categories", {
          name: "general",
          displayName: "General",
          description: "General discussion",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          postCount: 0,
          status: "active",
          creatorId: memberId,
        });
      });

      // Create test content
      const [postId, commentId] = await t.run(async (ctx) => {
        const post = await ctx.db.insert("posts", {
          memberId,
          categoryId,
          title: "Test Post",
          content: "Content",
          slug: "test-post",
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          upvotes: 0,
          downvotes: 0,
          netVotes: 0,
          commentCount: 0,
          viewCount: 0,
        });
        
        const comment = await ctx.db.insert("comments", {
          memberId,
          postId: post,
          content: "Test comment",
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          upvotes: 0,
          downvotes: 0,
          netVotes: 0,
          depth: 0,
          childCount: 0,
        });
        
        return [post, comment];
      });

      // Add votes for both
      await t.run(async (ctx) => {
        await ctx.db.insert("votes", {
          userId: memberId,
          targetId: postId,
          targetType: "post",
          voteType: "upvote",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        await ctx.db.insert("votes", {
          userId: memberId,
          targetId: commentId,
          targetType: "comment",
          voteType: "upvote",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Set up authentication identity
      const asUser = t.withIdentity({
        email: "test@example.com",
        subject: "clerk_123",
        given_name: "Test",
        family_name: "User",
      });
      
      // Query for posts only - should not include comment vote
      const result = await asUser.query(api.votes.getUserVotesBatch, {
        targetIds: [postId, commentId], // Include comment ID but with post type
        targetType: "post",
      });

      expect(result).toEqual({
        [postId]: "upvote",
        // commentId should not be in result due to type mismatch
      });
    });
  });
}); 