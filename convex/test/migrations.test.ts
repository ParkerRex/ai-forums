import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

test("addMemberIdFields migration populates memberId from authorId", async () => {
  const t = convexTest(schema);

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
      postCount: 0,
      status: 'active',
      creatorId: memberId,
    });
  });

  // Create test post without memberId (legacy format)
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
      // Note: no memberId field set
    });
  });

  // Create test comment without memberId (legacy format)
  const commentId = await t.run(async (ctx) => {
    return await ctx.db.insert('comments', {
      content: 'Test comment',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      authorId: memberId,
      postId: postId,
      status: 'active',
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      depth: 0,
      childCount: 0,
      // Note: no memberId field set
    });
  });

  // Verify initial state - no memberId fields
  const initialPost = await t.run(async (ctx) => {
    return await ctx.db.get(postId);
  });
  const initialComment = await t.run(async (ctx) => {
    return await ctx.db.get(commentId);
  });

  expect(initialPost?.memberId).toBeUndefined();
  expect(initialComment?.memberId).toBeUndefined();

  // Run the migration
  const migrationResult = await t.run(async (ctx) => {
    return await ctx.runMutation(api.migrations.add_member_id_fields.addMemberIdFields, {});
  });

  // Verify migration results
  expect(migrationResult.success).toBe(true);
  expect(migrationResult.postsUpdated).toBe(1);
  expect(migrationResult.commentsUpdated).toBe(1);

  // Verify memberId fields were populated
  const migratedPost = await t.run(async (ctx) => {
    return await ctx.db.get(postId);
  });
  const migratedComment = await t.run(async (ctx) => {
    return await ctx.db.get(commentId);
  });

  expect(migratedPost?.memberId).toBe(memberId);
  expect(migratedComment?.memberId).toBe(memberId);

  // Verify authorId fields are still intact
  expect(migratedPost?.authorId).toBe(memberId);
  expect(migratedComment?.authorId).toBe(memberId);
});

test("addMemberIdFields migration is idempotent", async () => {
  const t = convexTest(schema);

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

  // Run migration first time
  const firstResult = await t.run(async (ctx) => {
    return await ctx.runMutation(api.migrations.add_member_id_fields.addMemberIdFields, {});
  });

  expect(firstResult.postsUpdated).toBe(1);

  // Run migration second time - should be idempotent
  const secondResult = await t.run(async (ctx) => {
    return await ctx.runMutation(api.migrations.add_member_id_fields.addMemberIdFields, {});
  });

  expect(secondResult.postsUpdated).toBe(0); // No updates on second run
  expect(secondResult.success).toBe(true);

  // Verify the post still has correct memberId
  const finalPost = await t.run(async (ctx) => {
    return await ctx.db.get(postId);
  });

  expect(finalPost?.memberId).toBe(memberId);
});

test("checkMigrationStatus reports correct counts", async () => {
  const t = convexTest(schema);

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

  // Create 2 posts - one with memberId, one without
  await t.run(async (ctx) => {
    return await ctx.db.insert('posts', {
      title: 'Post with memberId',
      content: 'Content',
      slug: 'post-with-member-id',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      authorId: memberId,
      memberId: memberId, // Already has memberId
      categoryId: categoryId,
      status: 'active',
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      commentCount: 0,
      viewCount: 0,
    });
  });

  await t.run(async (ctx) => {
    return await ctx.db.insert('posts', {
      title: 'Post without memberId',
      content: 'Content',
      slug: 'post-without-member-id',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      authorId: memberId,
      // No memberId field
      categoryId: categoryId,
      status: 'active',
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      commentCount: 0,
      viewCount: 0,
    });
  });

  // Check status before migration
  const statusBefore = await t.run(async (ctx) => {
    return await ctx.runMutation(api.migrations.add_member_id_fields.checkMigrationStatus, {});
  });

  expect(statusBefore.posts.total).toBe(2);
  expect(statusBefore.posts.withMemberId).toBe(1);
  expect(statusBefore.posts.withoutMemberId).toBe(1);
  expect(statusBefore.posts.migrationComplete).toBe(false);

  // Run migration
  await t.run(async (ctx) => {
    return await ctx.runMutation(api.migrations.add_member_id_fields.addMemberIdFields, {});
  });

  // Check status after migration
  const statusAfter = await t.run(async (ctx) => {
    return await ctx.runMutation(api.migrations.add_member_id_fields.checkMigrationStatus, {});
  });

  expect(statusAfter.posts.total).toBe(2);
  expect(statusAfter.posts.withMemberId).toBe(2);
  expect(statusAfter.posts.withoutMemberId).toBe(0);
  expect(statusAfter.posts.migrationComplete).toBe(true);
}); 