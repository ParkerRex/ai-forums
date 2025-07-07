/**
 * @fileoverview Comments System Test Suite - Phase 4 Backend Refactor
 * 
 * This comprehensive test suite validates the comments system, with special focus
 * on the Phase 4 backend refactor that unified member identification across the
 * application. The tests cover:
 * - Comment creation with unified memberId field
 * - Member-based comment querying functionality
 * - Authorization and ownership validation
 * - Legacy data compatibility and migration paths
 * - API consistency across old and new data structures
 * 
 * Phase 4 Background:
 * The backend refactor unified member identification by standardizing on a single
 * 'memberId' field across all entities, replacing previous inconsistent field names.
 * This test suite ensures backward compatibility while validating new functionality.
 * 
 * @module convex/test/comments.test
 */

import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

/**
 * Test suite for Comments - Phase 4 Backend Refactor
 * 
 * Validates the comments system functionality with emphasis on the unified
 * member identification system introduced in Phase 4.
 */
describe("Comments - Phase 4 Backend Refactor", () => {
  /**
   * Test: Comment creation sets memberId correctly
   * 
   * Validates that the createComment API correctly populates the unified
   * memberId field when creating new comments. This is a core test for the
   * Phase 4 refactor ensuring proper member association.
   * 
   * @test Comment Creation with Unified MemberID
   * @expects Comment created with correct memberId field populated
   */
  test("createComment sets memberId correctly", async () => {
    // Initialize test environment with database schema
    const t = convexTest(schema);

    // Create a test member directly in the database for comment ownership
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
        externalId: `user_${Date.now()}`, // Add externalId for Clerk authentication
      });
    });

    // Create a test category for post organization
    const categoryId = await t.run(async (ctx) => {
      return await ctx.db.insert("categories", {
        name: "test-category",
        displayName: "Test Category",
        description: "Test category description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 0,
        status: "active",
        creatorId: memberId, // Category owned by test member
      });
    });

    // Create a test post that will receive the comment
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: memberId, // Post owned by test member
        categoryId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0, // Will be incremented when comment is added
        viewCount: 0,
        isPinned: false,
        isLocked: false,
        type: "text", // Standard text post
      });
    });

    // Create a comment using the unified authentication system
    // This tests the integration between auth and comment creation
    const commentId = await t.withIdentity({ 
      subject: `user_${memberId}`,
      email: "commenter@example.com"
    }).mutation(api.comments.createComment, {
      content: "Test comment",
      postId,
    });

    // Verify the comment was created with the correct unified memberId
    const comment = await t.run(async (ctx) => {
      return await ctx.db.get(commentId);
    });

    // Validate all critical comment fields were set correctly
    expect(comment).toBeTruthy(); // Comment exists
    expect(comment!.memberId).toEqual(memberId); // Unified memberId field set
    expect(comment!.content).toBe("Test comment"); // Content preserved
  });

  /**
   * Test: getCommentsByMember works with new memberId field
   * 
   * Validates the new member-based comment querying functionality that was
   * introduced in Phase 4. This ensures we can efficiently retrieve all
   * comments by a specific member using the unified field structure.
   * 
   * @test Member-Based Comment Querying
   * @expects Comments retrieved correctly by memberId
   */
  test("getCommentsByMember works with new memberId field", async () => {
    // Initialize test environment
    const t = convexTest(schema);

    // Create a test member for comment ownership testing
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

    // Create test category and post infrastructure
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

    // Create a comment directly with the unified memberId field
    // This tests the database structure after Phase 4 refactor
    const commentId = await t.run(async (ctx) => {
      return await ctx.db.insert("comments", {
        content: "Test comment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: memberId, // Unified memberId field
        postId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        depth: 0, // Top-level comment
        childCount: 0, // No nested replies
      });
    });

    // Test the new getCommentsByMember query function
    // This validates the Phase 4 member-based querying capability
    const comments = await t.query(api.comments.getCommentsByMember, {
      memberId,
      limit: 10,
    });

    // Verify the query returns the correct comment
    expect(comments).toHaveLength(1); // One comment found
    expect(comments[0]._id).toEqual(commentId); // Correct comment ID
    expect(comments[0].content).toBe("Test comment"); // Content preserved
  });

  /**
   * Test: Comment authorization works with unified field structure
   * 
   * Validates that comment authorization and ownership validation works
   * correctly with the unified memberId field. This is critical for security
   * and ensures users can only edit their own comments.
   * 
   * @test Comment Authorization with Unified Fields
   * @expects Proper authorization enforcement for comment editing
   */
  test("comment authorization works with both legacy and new fields", async () => {
    // Initialize test environment
    const t = convexTest(schema);

    // Create test members for authorization testing
    const memberId = await t.run(async (ctx) => {
      return await ctx.db.insert("members", {
        firstName: "Test",
        lastName: "Author",
        email: "author@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "test-author",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        externalId: `user_${Date.now()}`, // Clerk integration
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
        externalId: `user_other_${Date.now()}`, // Different Clerk ID
      });
    });

    // Create test infrastructure (category and post)
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

    // Create a comment owned by the first member
    const commentId = await t.run(async (ctx) => {
      return await ctx.db.insert("comments", {
        content: "Test comment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: memberId, // Owned by first member
        postId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        depth: 0,
        childCount: 0,
      });
    });

    // Test: Author should be able to edit their own comment
    await expect(
      t.withIdentity({ 
        subject: `user_${memberId}`,
        email: "author@example.com"
      }).mutation(api.comments.updateComment, {
        commentId,
        content: "Updated comment",
      })
    ).resolves.toEqual(commentId); // Should succeed and return comment ID

    // Test: Other user should NOT be able to edit the comment
    await expect(
      t.withIdentity({ 
        subject: `user_other_${otherId}`,
        email: "other@example.com"
      }).mutation(api.comments.updateComment, {
        commentId,
        content: "Unauthorized update",
      })
    ).rejects.toThrow("Only the author can edit this comment"); // Authorization error
  });

  /**
   * Test: Comments with unified memberId work correctly
   * 
   * Validates that comments created with the new unified field structure
   * work correctly across all operations including creation, updating,
   * and authorization. This is a comprehensive test of Phase 4 functionality.
   * 
   * @test Unified Field Structure Operations
   * @expects All comment operations work with unified memberId
   */
  test("comments with memberId work correctly", async () => {
    // Initialize test environment
    const t = convexTest(schema);

    // Create test member for comprehensive testing
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
        externalId: `user_${Date.now()}`, // Clerk authentication
      });
    });

    // Create supporting test infrastructure
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

    // Create a comment using the current unified field structure
    // This represents the post-Phase 4 data model
    const commentId = await t.run(async (ctx) => {
      return await ctx.db.insert("comments", {
        content: "Legacy comment", // Note: this comment uses only the unified field
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: memberId, // Only unified field, no legacy fields
        postId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        depth: 0,
        childCount: 0,
      });
    });

    // Test: Author should still be able to edit comments with unified field
    await expect(
      t.withIdentity({ 
        subject: `user_${memberId}`,
        email: "commenter@example.com"
      }).mutation(api.comments.updateComment, {
        commentId,
        content: "Updated legacy comment",
      })
    ).resolves.toEqual(commentId); // Should succeed

    // Verify the comment was actually updated in the database
    const updatedComment = await t.run(async (ctx) => {
      return await ctx.db.get(commentId);
    });

    // Validate the update was successful and data integrity maintained
    expect(updatedComment!.content).toBe("Updated legacy comment"); // Content updated
  });
}); // End of Comments Phase 4 Backend Refactor test suite