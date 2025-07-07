/**
 * @fileoverview Post Deletion for Redirect Support Test Suite
 * 
 * This test suite validates the post deletion system that supports clean URL
 * redirection when users attempt to access deleted content. The system covers:
 * - Soft deletion with status change (preserves data for redirect handling)
 * - Authorization enforcement (only authors can delete their posts)
 * - Category post count maintenance during deletion
 * - Proper null return behavior for deleted content queries
 * - Graceful handling of edge cases (already deleted, non-existent posts)
 * - Idempotent deletion operations
 * 
 * Redirect Support Context:
 * The post deletion system uses soft deletion (status='deleted') rather than
 * hard deletion to support URL redirect scenarios. When users visit URLs for
 * deleted posts, the application can detect the deletion and redirect to
 * appropriate alternative content instead of showing 404 errors.
 * 
 * This approach improves user experience by handling deleted content gracefully
 * while maintaining data integrity for analytical and redirect purposes.
 * 
 * @module convex/test/post-deletion-redirect.test
 */

import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

/**
 * Test suite for Post Deletion for Redirect Support
 * 
 * Validates the soft deletion system that enables intelligent URL redirection
 * for deleted post content while maintaining proper authorization and data integrity.
 */
describe("Post Deletion for Redirect Support", () => {
  /**
   * Test: Post deletion properly marks post as deleted
   * 
   * Validates the core soft deletion functionality where posts are marked with
   * status='deleted' rather than being removed from the database. This enables
   * redirect handling while preserving data for analytics and audit purposes.
   * 
   * @test Soft Deletion Implementation
   * @expects Post status changed to 'deleted' and category count decremented
   */
  test("deletePost should properly mark post as deleted", async () => {
    // Initialize test environment with database schema
    const t = convexTest(schema);
    
    // Set up authenticated user context for post deletion
    const asTestUser = t.withIdentity({ 
      email: 'test@example.com',
      subject: 'test-user-id' // Clerk authentication identifier
    });

    // Create test member for post ownership and authorization
    const memberId = await t.run(async (ctx) => {
      return await ctx.db.insert('members', {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        status: 'active',
        joinedDate: Date.now(),
        slug: 'test-user',
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        tier: "free",
        subscriptionStatus: "none",
        stripeCustomerId: "cus_test",
      });
    });

    // Create test category for post organization and count tracking
    const categoryId = await t.run(async (ctx) => {
      return await ctx.db.insert('categories', {
        name: 'test-category',
        displayName: 'Test Category',
        description: 'Test category description',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 1, // Initial count before deletion
        status: 'active',
        creatorId: memberId,
      });
    });

    // Create test post that will be soft deleted
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert('posts', {
        title: 'Post to Delete for Redirect Test',
        content: 'This will be deleted to test redirect behavior',
        slug: 'delete-me-redirect-test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: memberId, // Owned by test user for authorization
        categoryId: categoryId,
        status: 'active', // Initially active, will be marked deleted
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0,
        viewCount: 0,
        isPinned: false,
        isLocked: false,
        type: 'text',
      });
    });

    // Execute soft deletion through authenticated API
    await asTestUser.mutation(api.posts.deletePost, {
      postId: postId,
    });

    // Verify post was soft deleted (status changed, not removed)
    const deletedPost = await t.run(async (ctx) => {
      return await ctx.db.get(postId);
    });
    expect(deletedPost?.status).toBe('deleted'); // Soft deletion marker

    // Verify category post count was properly decremented
    const updatedCategory = await t.run(async (ctx) => {
      return await ctx.db.get(categoryId);
    });
    expect(updatedCategory?.postCount).toBe(0); // Count decremented from 1 to 0
  });

  /**
   * Test: getPostBySlug returns null for deleted posts
   * 
   * Validates that the post retrieval system properly filters out deleted posts
   * by returning null when querying for deleted content. This enables the
   * application to detect deleted posts and trigger redirect logic.
   * 
   * @test Deleted Post Query Filtering
   * @expects Null return for deleted post queries (triggers redirect)
   */
  test("getPostBySlug should return null for deleted posts", async () => {
    // Initialize test environment
    const t = convexTest(schema);
    
    // Set up authenticated user context
    const asTestUser = t.withIdentity({ 
      email: 'test@example.com',
      subject: 'test-user-id' 
    });

    // Create test member for post ownership
    const memberId = await t.run(async (ctx) => {
      return await ctx.db.insert('members', {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        status: 'active',
        joinedDate: Date.now(),
        slug: 'test-user',
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        tier: "free",
        subscriptionStatus: "none",
        stripeCustomerId: "cus_test",
      });
    });

    // Create test category with post count tracking
    const categoryId = await t.run(async (ctx) => {
      return await ctx.db.insert('categories', {
        name: 'test-category',
        displayName: 'Test Category',
        description: 'Test category description',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 1,
        status: 'active',
        creatorId: memberId,
      });
    });

    // Define unique slug for testing post retrieval and deletion detection
    const postSlug = 'test-post-for-deletion-redirect';
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert('posts', {
        title: 'Test Post for Deletion Redirect',
        content: 'This post will be deleted',
        slug: postSlug, // Unique slug for query testing
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: memberId,
        categoryId: categoryId,
        status: 'active',
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0,
        viewCount: 0,
        isPinned: false,
        isLocked: false,
        type: 'text',
      });
    });

    // Verify post can be found before deletion (baseline test)
    const postBeforeDeletion = await t.query(api.posts.getPostBySlug, {
      slug: postSlug,
    });
    expect(postBeforeDeletion).not.toBeNull(); // Should be found
    expect(postBeforeDeletion?._id).toEqual(postId); // Correct post returned

    // Execute soft deletion
    await asTestUser.mutation(api.posts.deletePost, {
      postId: postId,
    });

    // Verify post returns null after deletion (enables redirect detection)
    const postAfterDeletion = await t.query(api.posts.getPostBySlug, {
      slug: postSlug,
    });
    expect(postAfterDeletion).toBeNull(); // Null triggers redirect logic
  });

  /**
   * Test: deletePost prevents unauthorized deletion
   * 
   * Validates that the deletion system enforces proper authorization by
   * preventing users from deleting posts they don't own. This is critical
   * for content security and user rights protection.
   * 
   * @test Deletion Authorization Enforcement
   * @expects Authorization error for non-owners attempting deletion
   */
  test("deletePost should prevent unauthorized deletion", async () => {
    // Initialize test environment
    const t = convexTest(schema);
    
    // Create original post author
    const authorId = await t.run(async (ctx) => {
      return await ctx.db.insert('members', {
        firstName: 'Author',
        lastName: 'User',
        email: 'author@example.com',
        status: 'active',
        joinedDate: Date.now(),
        slug: 'author-user',
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        tier: "free",
        subscriptionStatus: "none",
        stripeCustomerId: "cus_test",
      });
    });

    // Create different user who will attempt unauthorized deletion
    const otherUserId = await t.run(async (ctx) => {
      return await ctx.db.insert('members', {
        firstName: 'Other',
        lastName: 'User',
        email: 'other@example.com',
        status: 'active',
        joinedDate: Date.now(),
        slug: 'other-user',
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        tier: "free",
        subscriptionStatus: "none",
        stripeCustomerId: "cus_test",
      });
    });

    // Create test category
    const categoryId = await t.run(async (ctx) => {
      return await ctx.db.insert('categories', {
        name: 'test-category',
        displayName: 'Test Category',
        description: 'Test category description',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 1,
        status: 'active',
        creatorId: authorId,
      });
    });

    // Create post owned by the original author
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert('posts', {
        title: 'Authors Post',
        content: 'This post belongs to the author',
        slug: 'authors-post',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: authorId, // Owned by author, not other user
        categoryId: categoryId,
        status: 'active',
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0,
        viewCount: 0,
        isPinned: false,
        isLocked: false,
        type: 'text',
      });
    });

    // Set up authentication context for unauthorized user
    const asOtherUser = t.withIdentity({ 
      email: 'other@example.com',
      subject: `user_${otherUserId}` 
    });

    // Attempt unauthorized deletion (should fail with authorization error)
    await expect(
      asOtherUser.mutation(api.posts.deletePost, {
        postId: postId,
      })
    ).rejects.toThrow("Only the author can delete this post"); // Expected auth error

    // Verify post still exists and is active (deletion was prevented)
    const postAfterFailedDeletion = await t.run(async (ctx) => {
      return await ctx.db.get(postId);
    });
    expect(postAfterFailedDeletion?.status).toBe('active'); // Still active
  });

  /**
   * Test: deletePost handles already deleted posts gracefully
   * 
   * Validates that attempting to delete an already deleted post doesn't cause
   * errors and handles the operation gracefully. This tests idempotent behavior
   * and prevents issues with duplicate deletion attempts.
   * 
   * @test Idempotent Deletion Behavior
   * @expects Graceful handling of already-deleted posts
   */
  test("deletePost should handle already deleted posts gracefully", async () => {
    // Initialize test environment
    const t = convexTest(schema);
    
    // Set up authenticated user context
    const asTestUser = t.withIdentity({ 
      email: 'test@example.com',
      subject: 'test-user-id' 
    });

    // Create test member
    const memberId = await t.run(async (ctx) => {
      return await ctx.db.insert('members', {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        status: 'active',
        joinedDate: Date.now(),
        slug: 'test-user',
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        tier: "free",
        subscriptionStatus: "none",
        stripeCustomerId: "cus_test",
      });
    });

    // Create test category with post count
    const categoryId = await t.run(async (ctx) => {
      return await ctx.db.insert('categories', {
        name: 'test-category',
        displayName: 'Test Category',
        description: 'Test category description',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 1,
        status: 'active',
        creatorId: memberId,
      });
    });

    // Create post for double deletion testing
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert('posts', {
        title: 'Post to Delete Twice',
        content: 'This will be deleted twice',
        slug: 'delete-me-twice',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: memberId,
        categoryId: categoryId,
        status: 'active',
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0,
        viewCount: 0,
        isPinned: false,
        isLocked: false,
        type: 'text',
      });
    });

    // Perform first deletion
    await asTestUser.mutation(api.posts.deletePost, {
      postId: postId,
    });

    // Verify post is marked as deleted after first deletion
    const deletedPost = await t.run(async (ctx) => {
      return await ctx.db.get(postId);
    });
    expect(deletedPost?.status).toBe('deleted');

    // Attempt second deletion on already deleted post
    // The current implementation allows this and doesn't throw an error
    const secondDeleteResult = await asTestUser.mutation(api.posts.deletePost, {
      postId: postId,
    });
    
    // Should return the postId (current implementation behavior)
    expect(secondDeleteResult).toEqual(postId);
    
    // Post should remain marked as deleted (idempotent behavior)
    const stillDeletedPost = await t.run(async (ctx) => {
      return await ctx.db.get(postId);
    });
    expect(stillDeletedPost?.status).toBe('deleted');
  });

  /**
   * Test: deletePost handles non-existent posts
   * 
   * Validates that attempting to delete non-existent posts results in
   * appropriate error handling rather than silent failures or data corruption.
   * This ensures robust error boundaries in the deletion system.
   * 
   * @test Non-Existent Post Error Handling
   * @expects Error thrown for invalid post IDs
   */
  test("deletePost should handle non-existent posts", async () => {
    // Initialize test environment
    const t = convexTest(schema);
    
    // Set up authenticated user context
    const asTestUser = t.withIdentity({ 
      email: 'test@example.com',
      subject: 'test-user-id' 
    });

    // Attempt to delete non-existent post with invalid ID
    await expect(
      asTestUser.mutation(api.posts.deletePost, {
        postId: "invalid-post-id" as never, // Invalid/non-existent post ID
      })
    ).rejects.toThrow(); // Should throw error for invalid post ID
  });
}); // End of Post Deletion for Redirect Support test suite