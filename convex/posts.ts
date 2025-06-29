import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { generateSlug, ensureUniqueSlug } from "../lib/slug-utils";

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

// Get single post by slug
export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
      
    if (!post) {
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

    // Generate unique slug
    const baseSlug = generateSlug(title);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_slug")
      .collect();
    const existingSlugs = posts
      .map(p => p.slug)
      .filter((slug): slug is string => slug !== undefined);
    const slug = ensureUniqueSlug(baseSlug, existingSlugs);

    const now = Date.now();

    // Create the post
    const postId = await ctx.db.insert("posts", {
      title: title.trim(),
      content: content.trim(),
      slug,
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
      slug?: string;
      editReason?: string;
    } = {
      updatedAt: now,
      editedAt: now,
    };

    // If title is being updated, regenerate slug
    if (title !== undefined) {
      updates.title = title.trim();
      
      // Generate new slug from updated title
      const baseSlug = generateSlug(title);
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_slug")
        .filter((q) => q.neq(q.field("_id"), postId)) // Exclude current post
        .collect();
      const existingSlugs = posts
        .map(p => p.slug)
        .filter((slug): slug is string => slug !== undefined);
      updates.slug = ensureUniqueSlug(baseSlug, existingSlugs);
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

    if (identity) {
      const member = await ctx.db
        .query("members")
        .filter((q) => q.eq(q.field("email"), identity.email))
        .first();
      userId = member?._id;
    }

    // Check if this user/IP has already viewed this post recently (within 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    let existingView;
    if (userId) {
      existingView = await ctx.db
        .query("postViews")
        .withIndex("by_post_and_user", (q) => q.eq("postId", postId).eq("userId", userId))
        .filter((q) => q.gt(q.field("viewedAt"), oneDayAgo))
        .first();
    } else if (ipAddress) {
      existingView = await ctx.db
        .query("postViews")
        .withIndex("by_postId", (q) => q.eq("postId", postId))
        .filter((q) => 
          q.and(
            q.eq(q.field("ipAddress"), ipAddress),
            q.gt(q.field("viewedAt"), oneDayAgo)
          )
        )
        .first();
    }

    if (!existingView) {
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
    }

    return { viewRecorded: !existingView };
  },
});

// Search posts
export const searchPosts = query({
  args: {
    searchTerm: v.string(),
    categoryId: v.optional(v.id("categories")),
    limit: v.optional(v.number()),
    includeContent: v.optional(v.boolean()),
  },
  handler: async (ctx, { searchTerm, categoryId, limit = 20, includeContent = false }) => {
    if (!searchTerm.trim()) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseSearch = (q: any) => {
      let query = q.search("title", searchTerm).eq("status", "active");
      if (categoryId) {
        query = query.eq("categoryId", categoryId);
      }
      return query;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseContentSearch = (q: any) => {
      let query = q.search("content", searchTerm).eq("status", "active");
      if (categoryId) {
        query = query.eq("categoryId", categoryId);
      }
      return query;
    };

    // Search titles
    const titleQuery = ctx.db
      .query("posts")
      .withSearchIndex("search_posts", baseSearch);

    let posts = await titleQuery.take(limit);

    // Also search content if requested
    if (includeContent) {
      const contentQuery = ctx.db
        .query("posts")
        .withSearchIndex("search_posts_content", baseContentSearch);
      
      const contentPosts = await contentQuery.take(limit);
      
      // Dedupe by ID, preferring title matches
      const seenIds = new Set(posts.map(p => p._id));
      const uniqueContentPosts = contentPosts.filter(p => !seenIds.has(p._id));
      posts = [...posts, ...uniqueContentPosts].slice(0, limit);
    }

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

// Migration mutation to add slugs to existing posts
export const addSlugsToExistingPosts = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all posts that don't have slugs yet
    const posts = await ctx.db.query("posts").collect();
    
    console.log(`Processing ${posts.length} posts for slug generation...`);
    
    // Track existing slugs to ensure uniqueness
    const existingSlugs = new Set<string>();
    
    // Process posts in batches to avoid overwhelming the system
    const batchSize = 50;
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (post) => {
          // Skip if post already has slug
          if ('slug' in post && post.slug) {
            existingSlugs.add(post.slug as string);
            return;
          }
          
          // Generate slug from title
          const baseSlug = post.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 60)
            .replace(/-+$/, '');
          
          // Ensure uniqueness
          let slug = baseSlug;
          let counter = 1;
          while (existingSlugs.has(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
          
          existingSlugs.add(slug);
          
          // Update the post with the generated slug
          await ctx.db.patch(post._id, { slug });
        })
      );
      
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(posts.length / batchSize)}`);
    }
    
    console.log("Slug generation migration completed successfully!");
    return { processed: posts.length };
  },
}); 