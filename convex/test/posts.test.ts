import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

test("editPost should create version history", async () => {
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
      postCount: 0,
      status: 'active',
      creatorId: memberId,
    });
  });

  const postId = await t.run(async (ctx) => {
    return await ctx.db.insert('posts', {
      title: 'Original Title',
      content: 'Original content',
      slug: 'test-post',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      authorId: memberId,
      categoryId: categoryId,
      status: 'active',
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      commentCount: 0,
      viewCount: 0,
    });
  });

  // Edit the post
  await asTestUser.mutation(api.posts.editPost, {
    postId: postId,
    title: 'Updated Title',
    content: 'Updated content',
    editReason: 'Testing edit',
  });

  // Check that a version was created
  const versions = await t.run(async (ctx) => {
    return await ctx.db
      .query('post_versions')
      .withIndex('by_postId', (q) => q.eq('postId', postId))
      .collect();
  });

  expect(versions).toHaveLength(1);
  expect(versions[0].version).toBe(1);
  expect(versions[0].title).toBe('Original Title');
  expect(versions[0].content).toBe('Original content');
  expect(versions[0].editReason).toBe('Testing edit');

  // Check that the post was updated
  const updatedPost = await t.run(async (ctx) => {
    return await ctx.db.get(postId);
  });
  
  expect(updatedPost?.title).toBe('Updated Title');
  expect(updatedPost?.content).toBe('Updated content');
  expect(updatedPost?.editedAt).toBeDefined();
});

test("deletePost should soft delete posts", async () => {
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
      title: 'Post to Delete',
      content: 'This will be deleted',
      slug: 'delete-me',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      authorId: memberId,
      categoryId: categoryId,
      status: 'active',
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      commentCount: 0,
      viewCount: 0,
    });
  });

  // Delete the post
  await asTestUser.mutation(api.posts.deletePost, {
    postId: postId,
  });

  // Check that status was changed
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

test("getPostHistory should return versions with editor info", async () => {
  const t = convexTest(schema);
  
  // Create test data
  const memberId = await t.run(async (ctx) => {
    return await ctx.db.insert('members', {
      firstName: 'Editor',
      lastName: 'User',
      email: 'editor@example.com',
      status: 'active',
      joinedDate: Date.now(),
      slug: 'editor-user',
      updatedAt: Date.now(),
      lastOnline: Date.now(),
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });

  const categoryId = await t.run(async (ctx) => {
    return await ctx.db.insert('categories', {
      name: 'test-category',
      displayName: 'Test Category',
      description: 'Test category description',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      postCount: 0,
      status: 'active',
      creatorId: memberId,
    });
  });

  const postId = await t.run(async (ctx) => {
    return await ctx.db.insert('posts', {
      title: 'Test Post',
      content: 'Test content',
      slug: 'test-post',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      authorId: memberId,
      categoryId: categoryId,
      status: 'active',
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      commentCount: 0,
      viewCount: 0,
    });
  });

  // Create versions directly
  await t.run(async (ctx) => {
    await ctx.db.insert('post_versions', {
      postId: postId,
      version: 1,
      title: 'Version 1',
      content: 'Content 1',
      editorId: memberId,
      editedAt: Date.now() - 2000,
    });

    await ctx.db.insert('post_versions', {
      postId: postId,
      version: 2,
      title: 'Version 2',
      content: 'Content 2',
      editorId: memberId,
      editedAt: Date.now() - 1000,
    });
  });

  // Query history
  const history = await t.query(api.postVersions.getPostHistory, {
    postId: postId,
  });

  expect(history).toHaveLength(2);
  expect(history[0].version).toBe(2);
  expect(history[1].version).toBe(1);
  expect(history[0].editor?.firstName).toBe('Editor');
  expect(history[0].editor?.avatarUrl).toBe('https://example.com/avatar.jpg');
}); 