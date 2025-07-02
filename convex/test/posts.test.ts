import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
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

// Test new unified functions from Phase 4
describe("Phase 4 - Backend Refactor", () => {
  test("getPostsByMember works with new memberId field", async () => {
    const t = convexTest(schema);

    // Create a test member directly
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

    // Create a post with memberId
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

    // Test new getPostsByMember function
    const posts = await t.query(api.posts.getPostsByMember, {
      memberId,
      limit: 10,
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]._id).toEqual(postId);
    expect(posts[0].title).toBe("Test Post");
  });

  test("getPostsByMember works correctly", async () => {
    const t = convexTest(schema);

    // Create a test member directly
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

    // Create posts with memberId field
    const firstPostId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "First Post",
        content: "First content",
        slug: "first-post",
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

    const secondPostId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Second Post",
        content: "Second content",
        slug: "second-post",
        createdAt: Date.now() + 1000,
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

    // Test getPostsByMember function finds posts with memberId
    const posts = await t.query(api.posts.getPostsByMember, {
      memberId: memberId,
      limit: 10,
    });

    expect(posts).toHaveLength(2);
    const postIds = posts.map(p => p._id);
    expect(postIds).toContain(firstPostId);
    expect(postIds).toContain(secondPostId);
    
    // Should be ordered by creation date (newest first)
    expect(posts[0]._id).toEqual(secondPostId);
    expect(posts[1]._id).toEqual(firstPostId);
  });

  test("post authorization works with memberId", async () => {
    const t = convexTest(schema);

    // Create test members directly
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
        creatorId: authorMemberId,
      });
    });

    // Create a post with both fields
    const postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: authorMemberId,
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

    // Author should be able to edit the post
    await expect(
      t.withIdentity({ 
        subject: `user_${authorMemberId}`,
        email: "author@example.com"
      }).mutation(api.posts.editPost, {
        postId,
        title: "Updated Title",
      })
    ).resolves.toMatchObject({ _id: postId });

    // Other user should not be able to edit the post
    await expect(
      t.withIdentity({ 
        subject: `user_${otherId}`,
        email: "other@example.com"
      }).mutation(api.posts.editPost, {
        postId,
        title: "Unauthorized Update",
      })
    ).rejects.toThrow("Only the author can edit this post");
  });
});

// Test multi-attachment support
describe("Multi-attachment support", () => {
  test("createPost with attachments sets legacy fields from first attachment", async () => {
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

    // Create post with multiple attachments
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
          order: 0,
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

    // Check that the post was created with attachments
    const post = await t.run(async (ctx) => {
      return await ctx.db.get(postData.postId);
    });
    
    expect(post?.attachments).toHaveLength(3);
    expect(post?.attachments?.[0].type).toBe('image');
    expect(post?.attachments?.[1].type).toBe('pdf');
    expect(post?.attachments?.[2].type).toBe('video');
    
    // Check legacy fields are set from first attachment
    expect(post?.type).toBe('image');
    expect(post?.mediaUrl).toBe('https://example.com/image1.jpg');
    expect(post?.thumbnailUrl).toBe('https://example.com/thumb1.jpg');
    expect(post?.mediaWidth).toBe(1920);
    expect(post?.mediaHeight).toBe(1080);
    expect(post?.aspectRatio).toBe(1.78);
  });

  test("createPost with YouTube attachment sets type to video", async () => {
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
          videoId: 'dQw4w9WgXcQ',
          title: 'Rick Astley - Never Gonna Give You Up',
          duration: '3:33',
          channelName: 'RickAstleyVEVO',
        },
      ],
    });

    const post = await t.run(async (ctx) => {
      return await ctx.db.get(postData.postId);
    });
    
    // YouTube should be mapped to video type
    expect(post?.type).toBe('video');
    expect(post?.mediaUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(post?.attachments?.[0].type).toBe('youtube');
    expect(post?.attachments?.[0].videoId).toBe('dQw4w9WgXcQ');
  });

  test("editPost with attachments updates legacy fields", async () => {
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

    // Create a text post first
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
        type: 'text',
      });
    });

    // Edit with attachments
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

    const updatedPost = await t.run(async (ctx) => {
      return await ctx.db.get(postId);
    });
    
    // Check that type changed from text to video
    expect(updatedPost?.type).toBe('video');
    expect(updatedPost?.mediaUrl).toBe('https://example.com/new-video.mp4');
    expect(updatedPost?.thumbnailUrl).toBe('https://example.com/new-thumb.jpg');
    expect(updatedPost?.attachments).toHaveLength(1);
    expect(updatedPost?.attachments?.[0].type).toBe('video');
  });

  test("editPost preserves attachments in version history", async () => {
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

    // Create post with attachments
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
        mediaUrl: 'https://example.com/old.jpg',
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

    // Edit the post with new attachments
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

    // Check version history includes attachments
    const versions = await t.run(async (ctx) => {
      return await ctx.db
        .query('post_versions')
        .withIndex('by_postId', (q) => q.eq('postId', postId))
        .collect();
    });

    expect(versions).toHaveLength(1);
    expect(versions[0].attachments).toHaveLength(1);
    expect(versions[0].attachments?.[0].url).toBe('https://example.com/old.jpg');
    expect(versions[0].mediaUrl).toBe('https://example.com/old.jpg');
  });
}); 