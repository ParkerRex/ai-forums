import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

// This test is no longer applicable since the schema doesn't support authorId anymore
// The migration has already been completed and the schema now requires memberId
test.skip("addMemberIdFields migration populates memberId from authorId", async () => {
  // Legacy test - schema no longer accepts authorId fields
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

  // Create post with memberId (current schema)
  const postId = await t.run(async (ctx) => {
    return await ctx.db.insert('posts', {
      title: 'Test Post',
      content: 'Test content',
      slug: 'test-post',
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

  // Run migration first time - should find nothing to migrate
  const firstResult = await t.run(async (ctx) => {
    return await ctx.runMutation(api.migrations.add_member_id_fields.addMemberIdFields, {});
  });

  expect(firstResult.postsUpdated).toBe(0); // Nothing to update since post already has memberId
  expect(firstResult.success).toBe(true);

  // Run migration second time - should still be idempotent
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

  // Create 2 posts - both with memberId (current schema requires it)
  await t.run(async (ctx) => {
    return await ctx.db.insert('posts', {
      title: 'Post 1',
      content: 'Content',
      slug: 'post-1',
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

  await t.run(async (ctx) => {
    return await ctx.db.insert('posts', {
      title: 'Post 2',
      content: 'Content',
      slug: 'post-2',
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

  // Check status - all posts should have memberId
  const status = await t.run(async (ctx) => {
    return await ctx.runMutation(api.migrations.add_member_id_fields.checkMigrationStatus, {});
  });

  expect(status.posts.total).toBe(2);
  expect(status.posts.withMemberId).toBe(2);
  expect(status.posts.withoutMemberId).toBe(0);
  expect(status.posts.migrationComplete).toBe(true);

  // Run migration - should find nothing to migrate
  const migrationResult = await t.run(async (ctx) => {
    return await ctx.runMutation(api.migrations.add_member_id_fields.addMemberIdFields, {});
  });

  expect(migrationResult.success).toBe(true);
  expect(migrationResult.postsUpdated).toBe(0);
  expect(migrationResult.commentsUpdated).toBe(0);
}); 