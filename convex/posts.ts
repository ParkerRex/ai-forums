import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get all posts with pagination and filtering
export const getPosts = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("popular"), v.literal("trending"))),
  },
  handler: async (ctx, { categoryId, limit = 20, sortBy = "newest" }) => {
    let query;

    // Filter by category if specified and apply sorting
    if (categoryId) {
      if (sortBy === "popular" || sortBy === "trending") {
        query = ctx.db.query("posts").withIndex("by_category_and_netVotes", (q) =>
          q.eq("categoryId", categoryId)
        );
      } else {
        query = ctx.db.query("posts").withIndex("by_category_and_createdAt", (q) =>
          q.eq("categoryId", categoryId)
        );
      }
    } else {
      if (sortBy === "popular" || sortBy === "trending") {
        query = ctx.db.query("posts").withIndex("by_netVotes");
      } else {
        query = ctx.db.query("posts").withIndex("by_createdAt");
      }
    }

    // Filter active posts and apply ordering
    const posts = await query
      .filter((q) => q.eq(q.field("status"), "active"))
      .order(sortBy === "newest" ? "desc" : "desc")
      .take(limit);

    // Enrich posts with author and category data
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const [author, category] = await Promise.all([
          ctx.db.get(post.authorId),
          ctx.db.get(post.categoryId),
        ]);

        return {
          ...post,
          author: author ? {
            _id: author._id,
            firstName: author.firstName,
            lastName: author.lastName,
            email: author.email,
            username: author.email.split('@')[0], // Derive username from email
          } : null,
          category: category ? {
            _id: category._id,
            name: category.name,
            displayName: category.displayName,
            icon: category.icon,
          } : null,
        };
      })
    );

    return enrichedPosts;
  },
});

// Get single post by ID with full details
export const getPostById = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "active") {
      return null;
    }

    // Get author and category data
    const [author, category] = await Promise.all([
      ctx.db.get(post.authorId),
      ctx.db.get(post.categoryId),
    ]);

    return {
      ...post,
      author: author ? {
        _id: author._id,
        firstName: author.firstName,
        lastName: author.lastName,
        email: author.email,
        username: author.email.split('@')[0],
        bio: author.bio,
        location: author.location,
        linkGithub: author.linkGithub,
        linkX: author.linkX,
        linkYouTube: author.linkYouTube,
      } : null,
      category: category ? {
        _id: category._id,
        name: category.name,
        displayName: category.displayName,
        description: category.description,
        icon: category.icon,
      } : null,
    };
  },
});

// Create new post
export const createPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    categoryId: v.id("categories"),
  },
  handler: async (ctx, { title, content, categoryId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Find the authenticated user
    const member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!member) {
      throw new Error("Member not found");
    }

    // Verify category exists and is active
    const category = await ctx.db.get(categoryId);
    if (!category || category.status !== "active") {
      throw new Error("Invalid category");
    }

    const now = Date.now();

    // Create the post
    const postId = await ctx.db.insert("posts", {
      title: title.trim(),
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
      authorId: member._id,
      categoryId,
      status: "active",
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      commentCount: 0,
      viewCount: 0,
      isPinned: false,
      isLocked: false,
    });

    // Update category post count
    await ctx.db.patch(categoryId, {
      postCount: (category.postCount || 0) + 1,
      updatedAt: now,
    });

    return postId;
  },
});

// Update post (edit)
export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    editReason: v.optional(v.string()),
  },
  handler: async (ctx, { postId, title, content, editReason }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const post = await ctx.db.get(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Find the authenticated user
    const member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user is the author
    if (post.authorId !== member._id) {
      throw new Error("Only the author can edit this post");
    }

    const now = Date.now();
    const updates: {
      updatedAt: number;
      editedAt: number;
      title?: string;
      content?: string;
      editReason?: string;
    } = {
      updatedAt: now,
      editedAt: now,
    };

    if (title !== undefined) {
      updates.title = title.trim();
    }
    if (content !== undefined) {
      updates.content = content.trim();
    }
    if (editReason !== undefined) {
      updates.editReason = editReason.trim();
    }

    await ctx.db.patch(postId, updates);
    return postId;
  },
});

// Delete post (soft delete)
export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const post = await ctx.db.get(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Find the authenticated user
    const member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user is the author
    if (post.authorId !== member._id) {
      throw new Error("Only the author can delete this post");
    }

    // Soft delete the post
    await ctx.db.patch(postId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    // Update category post count
    const category = await ctx.db.get(post.categoryId);
    if (category) {
      await ctx.db.patch(post.categoryId, {
        postCount: Math.max(0, (category.postCount || 0) - 1),
        updatedAt: Date.now(),
      });
    }

    return postId;
  },
});

// Track post view
export const trackPostView = mutation({
  args: {
    postId: v.id("posts"),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, { postId, ipAddress, userAgent }) => {
    const identity = await ctx.auth.getUserIdentity();
    let userId: Id<"members"> | undefined;

    // Get user ID if authenticated
    if (identity) {
      const member = await ctx.db
        .query("members")
        .filter((q) => q.eq(q.field("email"), identity.email))
        .first();
      userId = member?._id;
    }

    // Check if this user/IP has already viewed this post recently (within 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const existingView = await ctx.db
      .query("postViews")
      .withIndex("by_post_and_user", (q) => q.eq("postId", postId).eq("userId", userId))
      .filter((q) => q.gt(q.field("viewedAt"), oneHourAgo))
      .first();

    if (existingView) {
      return; // Don't count duplicate views within an hour
    }

    // Record the view
    await ctx.db.insert("postViews", {
      postId,
      userId,
      viewedAt: Date.now(),
      ipAddress,
      userAgent,
    });

    // Increment post view count
    const post = await ctx.db.get(postId);
    if (post) {
      await ctx.db.patch(postId, {
        viewCount: (post.viewCount || 0) + 1,
        updatedAt: Date.now(),
      });
    }
  },
});

// Search posts
export const searchPosts = query({
  args: {
    searchTerm: v.string(),
    categoryId: v.optional(v.id("categories")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { searchTerm, categoryId, limit = 20 }) => {
    if (!searchTerm.trim()) {
      return [];
    }

    const searchQuery = ctx.db
      .query("posts")
      .withSearchIndex("search_posts", (q) => {
        let query = q.search("title", searchTerm).eq("status", "active");
        if (categoryId) {
          query = query.eq("categoryId", categoryId);
        }
        return query;
      });

    const posts = await searchQuery.take(limit);

    // Enrich with author and category data
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const [author, category] = await Promise.all([
          ctx.db.get(post.authorId),
          ctx.db.get(post.categoryId),
        ]);

        return {
          ...post,
          author: author ? {
            _id: author._id,
            firstName: author.firstName,
            lastName: author.lastName,
            username: author.email.split('@')[0],
          } : null,
          category: category ? {
            _id: category._id,
            name: category.name,
            displayName: category.displayName,
            icon: category.icon,
          } : null,
        };
      })
    );

    return enrichedPosts;
  },
});

// Get posts by author
export const getPostsByAuthor = query({
  args: {
    authorId: v.id("members"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { authorId, limit = 10 }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author_and_createdAt", (q) => q.eq("authorId", authorId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .take(limit);

    // Enrich with category data
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const category = await ctx.db.get(post.categoryId);
        return {
          ...post,
          category: category ? {
            _id: category._id,
            name: category.name,
            displayName: category.displayName,
            icon: category.icon,
          } : null,
        };
      })
    );

    return enrichedPosts;
  },
}); 