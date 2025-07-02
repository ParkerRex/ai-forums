import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Post Deletion for Redirect Support", () => {
  test("deletePost should properly mark post as deleted", async () => {
    const t = convexTest(schema);
    
    // Set up authentication
    const asTestUser = t.withIdentity({ 
      email: 'test@example.com',
      subject: 'test-user-id' 
    });

    // Create test data
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
      });
    });

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

    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert('posts', {
        title: 'Post to Delete for Redirect Test',
        content: 'This will be deleted to test redirect behavior',
        slug: 'delete-me-redirect-test',
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

    // Delete the post
    await asTestUser.mutation(api.posts.deletePost, {
      postId: postId,
    });

    // Check that status was changed to deleted
    const deletedPost = await t.run(async (ctx) => {
      return await ctx.db.get(postId);
    });
    expect(deletedPost?.status).toBe('deleted');

    // Check category count was decremented
    const updatedCategory = await t.run(async (ctx) => {
      return await ctx.db.get(categoryId);
    });
    expect(updatedCategory?.postCount).toBe(0);
  });

  test("getPostBySlug should return null for deleted posts", async () => {
    const t = convexTest(schema);
    
    // Set up authentication
    const asTestUser = t.withIdentity({ 
      email: 'test@example.com',
      subject: 'test-user-id' 
    });

    // Create test data
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
      });
    });

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

    const postSlug = 'test-post-for-deletion-redirect';
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert('posts', {
        title: 'Test Post for Deletion Redirect',
        content: 'This post will be deleted',
        slug: postSlug,
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

    // Verify post can be found before deletion
    const postBeforeDeletion = await t.query(api.posts.getPostBySlug, {
      slug: postSlug,
    });
    expect(postBeforeDeletion).not.toBeNull();
    expect(postBeforeDeletion?._id).toEqual(postId);

    // Delete the post
    await asTestUser.mutation(api.posts.deletePost, {
      postId: postId,
    });

    // Verify post returns null after deletion (triggers redirect)
    const postAfterDeletion = await t.query(api.posts.getPostBySlug, {
      slug: postSlug,
    });
    expect(postAfterDeletion).toBeNull();
  });

  test("deletePost should prevent unauthorized deletion", async () => {
    const t = convexTest(schema);
    
    // Create author
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
      });
    });

    // Create different user
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
      });
    });

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

    // Create post by author
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert('posts', {
        title: 'Authors Post',
        content: 'This post belongs to the author',
        slug: 'authors-post',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: authorId,
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

    // Try to delete as different user
    const asOtherUser = t.withIdentity({ 
      email: 'other@example.com',
      subject: `user_${otherUserId}` 
    });

    // Should throw error for unauthorized deletion
    await expect(
      asOtherUser.mutation(api.posts.deletePost, {
        postId: postId,
      })
    ).rejects.toThrow("Only the author can delete this post");

    // Verify post still exists
    const postAfterFailedDeletion = await t.run(async (ctx) => {
      return await ctx.db.get(postId);
    });
    expect(postAfterFailedDeletion?.status).toBe('active');
  });

  test("deletePost should handle already deleted posts gracefully", async () => {
    const t = convexTest(schema);
    
    // Set up authentication
    const asTestUser = t.withIdentity({ 
      email: 'test@example.com',
      subject: 'test-user-id' 
    });

    // Create test data
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
      });
    });

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

    // Delete the post first time
    await asTestUser.mutation(api.posts.deletePost, {
      postId: postId,
    });

    // Verify post is deleted
    const deletedPost = await t.run(async (ctx) => {
      return await ctx.db.get(postId);
    });
    expect(deletedPost?.status).toBe('deleted');

    // Try to delete again - the current implementation allows this
    // and doesn't throw an error, it just returns the postId
    const secondDeleteResult = await asTestUser.mutation(api.posts.deletePost, {
      postId: postId,
    });
    
    // Should return the postId (current behavior)
    expect(secondDeleteResult).toEqual(postId);
    
    // Post should still be marked as deleted
    const stillDeletedPost = await t.run(async (ctx) => {
      return await ctx.db.get(postId);
    });
    expect(stillDeletedPost?.status).toBe('deleted');
  });

  test("deletePost should handle non-existent posts", async () => {
    const t = convexTest(schema);
    
    // Set up authentication
    const asTestUser = t.withIdentity({ 
      email: 'test@example.com',
      subject: 'test-user-id' 
    });

    // Try to delete non-existent post
    await expect(
      asTestUser.mutation(api.posts.deletePost, {
        postId: "invalid-post-id" as never,
      })
    ).rejects.toThrow();
  });
}); 