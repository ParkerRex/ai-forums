/**
 * @fileoverview Posts System Comprehensive Test Suite
 * 
 * This extensive test suite validates the complete posts system lifecycle including:
 * - Post creation, editing, and deletion operations
 * - Version history tracking for post modifications
 * - Phase 4 backend refactor with unified member identification
 * - Multi-attachment support with legacy field compatibility
 * - Authorization and ownership validation
 * - Post history and versioning with editor attribution
 * - Complex attachment handling (images, videos, PDFs, YouTube)
 * - Legacy data migration and backward compatibility
 * 
 * The posts system is central to the platform, handling content creation,
 * modification tracking, and rich media attachments while maintaining
 * comprehensive audit trails through version history.
 * 
 * Test Architecture:
 * - Core functionality tests (CRUD operations)
 * - Phase 4 refactor validation (unified member fields)
 * - Multi-attachment system testing (new attachment architecture)
 * - Version history and audit trail validation
 * 
 * @module convex/test/posts.test
 */

import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

/**
 * Test: Post editing creates comprehensive version history
 * 
 * Validates that when posts are edited, the system preserves the previous
 * version in the post_versions table with full metadata including edit
 * reason and editor information. This is critical for content audit trails.
 * 
 * @test Post Version History Creation
 * @expects Version record created with original content and edit metadata
 */
test("editPost should create version history", async () => {
  // Initialize test environment with database schema
  const t = convexTest(schema);
  
  // Set up authenticated user context for post editing
  const asTestUser = t.withIdentity({ 
    email: 'test@example.com',
    subject: 'test-user-id' // Clerk authentication identifier
  });
  
  // Create test member for post ownership and version tracking
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
      tier: 'free',
      subscriptionStatus: 'none',
      stripeCustomerId: 'cus_test',
    });
  });

  // Create test category for post organization
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

  // Create original post that will be edited to test version history
  const postId = await t.run(async (ctx) => {
    return await ctx.db.insert('posts', {
      title: 'Original Title',
      content: 'Original content',
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

  // Edit the post with new content and edit reason
  await asTestUser.mutation(api.posts.editPost, {
    postId: postId,
    title: 'Updated Title',
    content: 'Updated content',
    editReason: 'Testing edit', // Edit reason for audit trail
  });

  // Verify that a version record was created preserving original content
  const versions = await t.run(async (ctx) => {
    return await ctx.db
      .query('post_versions')
      .withIndex('by_postId', (q) => q.eq('postId', postId))
      .collect();
  });

  // Validate version history was created correctly
  expect(versions).toHaveLength(1); // One version created
  expect(versions[0].version).toBe(1); // First version number
  expect(versions[0].title).toBe('Original Title'); // Original title preserved
  expect(versions[0].content).toBe('Original content'); // Original content preserved
  expect(versions[0].editReason).toBe('Testing edit'); // Edit reason recorded

  // Verify that the post was updated with new content
  const updatedPost = await t.run(async (ctx) => {
    return await ctx.db.get(postId);
  });
  
  // Validate post update was successful
  expect(updatedPost?.title).toBe('Updated Title'); // Title updated
  expect(updatedPost?.content).toBe('Updated content'); // Content updated
  expect(updatedPost?.editedAt).toBeDefined(); // Edit timestamp set
});

/**
 * Test: Post deletion uses soft deletion approach
 * 
 * Validates that post deletion marks posts as deleted rather than removing
 * them from the database, enabling redirect handling and maintaining data
 * integrity for analytics and audit purposes.
 * 
 * @test Soft Deletion Implementation
 * @expects Post status changed to 'deleted' and category count updated
 */
test("deletePost should soft delete posts", async () => {
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
      tier: 'free',
      subscriptionStatus: 'none',
      stripeCustomerId: 'cus_test',
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
      postCount: 1, // Initial count before deletion
      status: 'active',
      creatorId: memberId,
    });
  });

  // Create post that will be soft deleted
  const postId = await t.run(async (ctx) => {
    return await ctx.db.insert('posts', {
      title: 'Post to Delete',
      content: 'This will be deleted',
      slug: 'delete-me',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memberId: memberId,
      categoryId: categoryId,
      status: 'active', // Initially active
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

  // Execute soft deletion
  await asTestUser.mutation(api.posts.deletePost, {
    postId: postId,
  });

  // Verify post status was changed to deleted (soft deletion)
  const deletedPost = await t.run(async (ctx) => {
    return await ctx.db.get(postId);
  });
  expect(deletedPost?.status).toBe('deleted'); // Soft deletion marker

  // Verify category post count was decremented
  const updatedCategory = await t.run(async (ctx) => {
    return await ctx.db.get(categoryId);
  });
  expect(updatedCategory?.postCount).toBe(0); // Count decremented
});

/**
 * Test: Post history query returns versions with editor information
 * 
 * Validates that the post history system returns comprehensive version
 * information including editor details for audit and transparency purposes.
 * This enables tracking who made what changes and when.
 * 
 * @test Post History with Editor Attribution
 * @expects Version history with complete editor information
 */
test("getPostHistory should return versions with editor info", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Create test member who will be the editor
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
      avatarUrl: 'https://example.com/avatar.jpg', // Avatar for display
      tier: 'free',
      subscriptionStatus: 'none',
      stripeCustomerId: 'cus_test',
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

  // Create post for version history testing
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

  // Create multiple version records directly for testing history queries
  await t.run(async (ctx) => {
    await ctx.db.insert('post_versions', {
      postId: postId,
      version: 1,
      title: 'Version 1',
      content: 'Content 1',
      editorId: memberId,
      editedAt: Date.now() - 2000, // 2 seconds ago
    });

    await ctx.db.insert('post_versions', {
      postId: postId,
      version: 2,
      title: 'Version 2',
      content: 'Content 2',
      editorId: memberId,
      editedAt: Date.now() - 1000, // 1 second ago
    });
  });

  // Query post history to validate editor information inclusion
  const history = await t.query(api.postVersions.getPostHistory, {
    postId: postId,
  });

  // Validate history structure and editor information
  expect(history).toHaveLength(2); // Two versions created
  expect(history[0].version).toBe(2); // Newest version first
  expect(history[1].version).toBe(1); // Oldest version last
  expect(history[0].editor?.firstName).toBe('Editor'); // Editor name included
  expect(history[0].editor?.avatarUrl).toBe('https://example.com/avatar.jpg'); // Avatar included
});

/**
 * Test suite for Phase 4 - Backend Refactor
 * 
 * Validates the unified member identification system introduced in Phase 4
 * that standardized member references across all entities using memberId fields.
 */
describe("Phase 4 - Backend Refactor", () => {
  /**
   * Test: getPostsByMember works with new unified memberId field
   * 
   * Validates the Phase 4 member-based post querying functionality that uses
   * the standardized memberId field for consistent member identification
   * across the platform.
   * 
   * @test Unified Member Post Querying
   * @expects Posts retrieved correctly by unified memberId
   */
  test("getPostsByMember works with new memberId field", async () => {
    // Initialize test environment
    const t = convexTest(schema);

    // Create test member for post ownership testing
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
        tier: 'free',
        subscriptionStatus: 'none',
        stripeCustomerId: 'cus_test',
      });
    });

    // Create test category for post organization
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

    // Create post with unified memberId field
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: memberId, // Unified member identification field
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

    // Test the Phase 4 member-based post querying function
    const posts = await t.query(api.posts.getPostsByMember, {
      memberId,
      limit: 10,
    });

    // Validate query returns correct posts
    expect(posts).toHaveLength(1); // One post found
    expect(posts[0]._id).toEqual(postId); // Correct post ID
    expect(posts[0].title).toBe("Test Post"); // Correct title
  });

  /**
   * Test: getPostsByMember correctly handles multiple posts
   * 
   * Validates that the member-based post querying works correctly with
   * multiple posts and proper ordering (newest first).
   * 
   * @test Multiple Posts Query Validation
   * @expects Multiple posts returned in correct chronological order
   */
  test("getPostsByMember works correctly", async () => {
    // Initialize test environment
    const t = convexTest(schema);

    // Create test member for multiple post ownership
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
        tier: 'free',
        subscriptionStatus: 'none',
        stripeCustomerId: 'cus_test',
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

    // Create multiple posts with staggered timestamps for ordering test
    const firstPostId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "First Post",
        content: "First content",
        slug: "first-post",
        createdAt: Date.now(), // Earlier timestamp
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

    const secondPostId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Second Post",
        content: "Second content",
        slug: "second-post",
        createdAt: Date.now() + 1000, // Later timestamp
        updatedAt: Date.now() + 1000,
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

    // Test member-based post querying with multiple posts
    const posts = await t.query(api.posts.getPostsByMember, {
      memberId: memberId,
      limit: 10,
    });

    // Validate multiple posts returned correctly
    expect(posts).toHaveLength(2); // Both posts found
    const postIds = posts.map(p => p._id);
    expect(postIds).toContain(firstPostId); // First post included
    expect(postIds).toContain(secondPostId); // Second post included
    
    // Validate chronological ordering (newest first)
    expect(posts[0]._id).toEqual(secondPostId); // Newest post first
    expect(posts[1]._id).toEqual(firstPostId); // Older post second
  });

  /**
   * Test: Post authorization works with unified memberId field
   * 
   * Validates that post ownership and authorization validation works
   * correctly with the Phase 4 unified member identification system.
   * 
   * @test Authorization with Unified Member Fields
   * @expects Proper authorization enforcement using unified memberId
   */
  test("post authorization works with memberId", async () => {
    // Initialize test environment
    const t = convexTest(schema);

    // Create test members for authorization testing
    const authorMemberId = await t.run(async (ctx) => {
      return await ctx.db.insert("members", {
        firstName: "Test",
        lastName: "Author",
        email: "author@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "test-author",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        tier: 'free',
        subscriptionStatus: 'none',
        stripeCustomerId: 'cus_test',
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
        tier: 'free',
        subscriptionStatus: 'none',
        stripeCustomerId: 'cus_test',
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
        creatorId: authorMemberId,
      });
    });

    // Create post with unified memberId field
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: authorMemberId, // Owned by author
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

    // Test: Author should be able to edit their own post
    await expect(
      t.withIdentity({ 
        subject: `user_${authorMemberId}`,
        email: "author@example.com"
      }).mutation(api.posts.editPost, {
        postId,
        title: "Updated Title",
      })
    ).resolves.toMatchObject({ _id: postId }); // Should succeed

    // Test: Other user should NOT be able to edit the post
    await expect(
      t.withIdentity({ 
        subject: `user_${otherId}`,
        email: "other@example.com"
      }).mutation(api.posts.editPost, {
        postId,
        title: "Unauthorized Update",
      })
    ).rejects.toThrow("Only the author can edit this post"); // Authorization error
  });
});

/**
 * Test suite for Multi-attachment support
 * 
 * Validates the comprehensive attachment system that supports multiple file
 * types while maintaining backward compatibility with legacy single-attachment fields.
 */
describe("Multi-attachment support", () => {
  /**
   * Test: createPost with attachments sets legacy fields from first attachment
   * 
   * Validates that the multi-attachment system maintains backward compatibility
   * by populating legacy single-attachment fields based on the first attachment
   * in the attachments array.
   * 
   * @test Multi-Attachment with Legacy Compatibility
   * @expects Legacy fields populated from first attachment
   */
  test("createPost with attachments sets legacy fields from first attachment", async () => {
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
        tier: 'free',
        subscriptionStatus: 'none',
        stripeCustomerId: 'cus_test',
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

    // Create post with multiple diverse attachments
    const postData = await asTestUser.mutation(api.posts.createPost, {
      title: 'Post with attachments',
      content: 'This post has multiple attachments',
      categoryId: categoryId,
      attachments: [
        {
          id: 'img1',
          type: 'image' as const,
          url: 'https://example.com/image1.jpg',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          width: 1920,
          height: 1080,
          aspectRatio: 1.78,
          order: 0, // First attachment (sets legacy fields)
        },
        {
          id: 'pdf1',
          type: 'pdf' as const,
          url: 'https://example.com/document.pdf',
          order: 1,
          pageCount: 10,
          fileSize: 1024000,
        },
        {
          id: 'vid1',
          type: 'video' as const,
          url: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/video-thumb.jpg',
          order: 2,
          videoDuration: '05:30',
        },
      ],
    });

    // Verify post creation and attachment handling
    const post = await t.run(async (ctx) => {
      return await ctx.db.get(postData.postId);
    });
    
    // Validate multi-attachment array is correctly stored
    expect(post?.attachments).toHaveLength(3); // All three attachments
    expect(post?.attachments?.[0].type).toBe('image'); // First attachment type
    expect(post?.attachments?.[1].type).toBe('pdf'); // Second attachment type
    expect(post?.attachments?.[2].type).toBe('video'); // Third attachment type
    
    // Validate legacy fields are set from first attachment (backward compatibility)
    expect(post?.type).toBe('image'); // Legacy type from first attachment
    expect(post?.mediaUrl).toBe('https://example.com/image1.jpg'); // Legacy URL
    expect(post?.thumbnailUrl).toBe('https://example.com/thumb1.jpg'); // Legacy thumbnail
    expect(post?.mediaWidth).toBe(1920); // Legacy width
    expect(post?.mediaHeight).toBe(1080); // Legacy height
    expect(post?.aspectRatio).toBe(1.78); // Legacy aspect ratio
  });

  /**
   * Test: createPost with YouTube attachment sets type to video
   * 
   * Validates that YouTube attachments are properly handled and mapped
   * to the appropriate video type for legacy compatibility while preserving
   * YouTube-specific metadata.
   * 
   * @test YouTube Attachment Handling
   * @expects YouTube attachment mapped to video type with metadata preserved
   */
  test("createPost with YouTube attachment sets type to video", async () => {
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
        tier: 'free',
        subscriptionStatus: 'none',
        stripeCustomerId: 'cus_test',
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

    // Create post with YouTube attachment
    const postData = await asTestUser.mutation(api.posts.createPost, {
      title: 'YouTube video post',
      content: 'Check out this video',
      categoryId: categoryId,
      attachments: [
        {
          id: 'yt1',
          type: 'youtube' as const,
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          order: 0,
          videoId: 'dQw4w9WgXcQ', // YouTube-specific metadata
          title: 'Rick Astley - Never Gonna Give You Up',
          duration: '3:33',
          channelName: 'RickAstleyVEVO',
        },
      ],
    });

    // Verify YouTube attachment handling
    const post = await t.run(async (ctx) => {
      return await ctx.db.get(postData.postId);
    });
    
    // Validate YouTube attachment is mapped to video type for legacy compatibility
    expect(post?.type).toBe('video'); // YouTube mapped to video
    expect(post?.mediaUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ'); // Legacy URL
    expect(post?.attachments?.[0].type).toBe('youtube'); // Original type preserved
    expect(post?.attachments?.[0].videoId).toBe('dQw4w9WgXcQ'); // YouTube metadata preserved
  });

  /**
   * Test: editPost with attachments updates legacy fields
   * 
   * Validates that editing posts with new attachments properly updates
   * both the attachment array and legacy compatibility fields, ensuring
   * the system remains backward compatible.
   * 
   * @test Post Edit with Attachment Updates
   * @expects Legacy fields updated when attachments change
   */
  test("editPost with attachments updates legacy fields", async () => {
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
        tier: 'free',
        subscriptionStatus: 'none',
        stripeCustomerId: 'cus_test',
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

    // Create a text post initially without attachments
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert('posts', {
        title: 'Original Text Post',
        content: 'Original content',
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
        type: 'text', // Initially text type
      });
    });

    // Edit post to add video attachment
    await asTestUser.mutation(api.posts.editPost, {
      postId: postId,
      attachments: [
        {
          id: 'vid1',
          type: 'video' as const,
          url: 'https://example.com/new-video.mp4',
          thumbnailUrl: 'https://example.com/new-thumb.jpg',
          width: 1280,
          height: 720,
          aspectRatio: 1.78,
          order: 0,
        },
      ],
    });

    // Verify post was updated with attachment and legacy fields
    const updatedPost = await t.run(async (ctx) => {
      return await ctx.db.get(postId);
    });
    
    // Validate type change from text to video (legacy field update)
    expect(updatedPost?.type).toBe('video'); // Type updated
    expect(updatedPost?.mediaUrl).toBe('https://example.com/new-video.mp4'); // Legacy URL set
    expect(updatedPost?.thumbnailUrl).toBe('https://example.com/new-thumb.jpg'); // Legacy thumbnail set
    expect(updatedPost?.attachments).toHaveLength(1); // Attachment array updated
    expect(updatedPost?.attachments?.[0].type).toBe('video'); // Attachment type correct
  });

  /**
   * Test: editPost preserves attachments in version history
   * 
   * Validates that when posts with attachments are edited, the version
   * history system preserves the original attachments along with other
   * content, maintaining a complete audit trail.
   * 
   * @test Attachment Preservation in Version History
   * @expects Original attachments preserved in version history
   */
  test("editPost preserves attachments in version history", async () => {
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
        tier: 'free',
        subscriptionStatus: 'none',
        stripeCustomerId: 'cus_test',
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

    // Create post with initial attachments
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert('posts', {
        title: 'Post with attachments',
        content: 'Original content',
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
        type: 'image',
        mediaUrl: 'https://example.com/old.jpg', // Legacy field
        attachments: [
          {
            id: 'img1',
            type: 'image' as const,
            url: 'https://example.com/old.jpg',
            order: 0,
          },
        ],
      });
    });

    // Edit the post with completely new attachments
    await asTestUser.mutation(api.posts.editPost, {
      postId: postId,
      attachments: [
        {
          id: 'img2',
          type: 'image' as const,
          url: 'https://example.com/new.jpg',
          order: 0,
        },
        {
          id: 'pdf1',
          type: 'pdf' as const,
          url: 'https://example.com/doc.pdf',
          order: 1,
        },
      ],
    });

    // Verify version history includes original attachments
    const versions = await t.run(async (ctx) => {
      return await ctx.db
        .query('post_versions')
        .withIndex('by_postId', (q) => q.eq('postId', postId))
        .collect();
    });

    // Validate version history preserves original attachments
    expect(versions).toHaveLength(1); // One version created
    expect(versions[0].attachments).toHaveLength(1); // Original attachment preserved
    expect(versions[0].attachments?.[0].url).toBe('https://example.com/old.jpg'); // Original URL preserved
    expect(versions[0].mediaUrl).toBe('https://example.com/old.jpg'); // Legacy field preserved
  });
}); // End of Multi-attachment support test suite

// End of Posts System Comprehensive Test Suite