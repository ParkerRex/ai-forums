import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Query to get member by email for mapping
export const getMemberByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

// Mutation to import a single post
export const importPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    authorEmail: v.string(),
    categoryId: v.id("categories"),
    status: v.union(v.literal("active"), v.literal("deleted"), v.literal("hidden"), v.literal("archived")),
    upvotes: v.number(),
    downvotes: v.number(),
    netVotes: v.number(),
    commentCount: v.number(),
    viewCount: v.number(),
    isPinned: v.optional(v.boolean()),
    isLocked: v.optional(v.boolean()),
    skoolId: v.string(), // Keep reference to original ID
  },
  handler: async (ctx, args) => {
    // Find or create the author by email
    let author = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.authorEmail))
      .first();
    
    if (!author) {
      // Create inactive member for missing users
      const nameParts = args.authorEmail.split('@')[0].split('-');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1, -1).join(' ') || 'User';
      
      const authorId = await ctx.db.insert("members", {
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        email: args.authorEmail,
        status: "churned" as const,
        joinedDate: Date.now(),
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        bio: "Imported from Skool (inactive member)",
      });
      
      author = await ctx.db.get(authorId);
      console.log(`Created inactive member for post author: ${args.authorEmail}`);
    }

    if (!author) {
      throw new Error(`Failed to create or find author: ${args.authorEmail}`);
    }

    // Generate slug from title
    const baseSlug = args.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60)
      .replace(/-+$/, '');

    const postId = await ctx.db.insert("posts", {
      title: args.title,
      content: args.content,
      slug: baseSlug,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      authorId: author._id,
      categoryId: args.categoryId,
      status: args.status,
      upvotes: args.upvotes,
      downvotes: args.downvotes,
      netVotes: args.netVotes,
      commentCount: args.commentCount,
      viewCount: args.viewCount,
      isPinned: args.isPinned,
      isLocked: args.isLocked,
    });

    return { postId, skoolId: args.skoolId };
  },
});

// Mutation to import a single comment
export const importComment = mutation({
  args: {
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    authorEmail: v.string(),
    postId: v.id("posts"),
    parentCommentId: v.optional(v.id("comments")),
    status: v.union(v.literal("active"), v.literal("deleted"), v.literal("hidden")),
    upvotes: v.number(),
    downvotes: v.number(),
    netVotes: v.number(),
    depth: v.number(),
    childCount: v.number(),
    skoolId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find or create the author by email
    let author = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.authorEmail))
      .first();
    
    if (!author) {
      // Create inactive member for missing users
      const nameParts = args.authorEmail.split('@')[0].split('-');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1, -1).join(' ') || 'User';
      
      const authorId = await ctx.db.insert("members", {
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        email: args.authorEmail,
        status: "churned" as const,
        joinedDate: Date.now(),
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        bio: "Imported from Skool (inactive member)",
      });
      
      author = await ctx.db.get(authorId);
      console.log(`Created inactive member for comment author: ${args.authorEmail}`);
    }

    if (!author) {
      throw new Error(`Failed to create or find author: ${args.authorEmail}`);
    }

    const commentId = await ctx.db.insert("comments", {
      content: args.content,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      authorId: author._id,
      postId: args.postId,
      parentCommentId: args.parentCommentId,
      status: args.status,
      upvotes: args.upvotes,
      downvotes: args.downvotes,
      netVotes: args.netVotes,
      depth: args.depth,
      childCount: args.childCount,
    });

    return { commentId, skoolId: args.skoolId };
  },
});

// Batch import mutations for efficiency
export const importPostsBatch = mutation({
  args: {
    posts: v.array(v.object({
      title: v.string(),
      content: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      authorEmail: v.string(),
      categoryId: v.id("categories"),
      status: v.union(v.literal("active"), v.literal("deleted"), v.literal("hidden"), v.literal("archived")),
      upvotes: v.number(),
      downvotes: v.number(),
      netVotes: v.number(),
      commentCount: v.number(),
      viewCount: v.number(),
      isPinned: v.optional(v.boolean()),
      isLocked: v.optional(v.boolean()),
      skoolId: v.string(),
    }))
  },
  handler: async (ctx, args) => {
    const results = [];
    const emailToMemberId = new Map();
    
    // Pre-fetch all unique authors
    const uniqueEmails = [...new Set(args.posts.map(p => p.authorEmail))];
    for (const email of uniqueEmails) {
      const member = await ctx.db
        .query("members")
        .filter((q) => q.eq(q.field("email"), email))
        .first();
      if (member) {
        emailToMemberId.set(email, member._id);
      }
    }
    
    // Import posts
    for (const post of args.posts) {
      const authorId = emailToMemberId.get(post.authorEmail);
      if (!authorId) {
        console.error(`Skipping post - author not found: ${post.authorEmail}`);
        continue;
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

      const postId = await ctx.db.insert("posts", {
        title: post.title,
        content: post.content,
        slug: baseSlug,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        authorId,
        categoryId: post.categoryId,
        status: post.status,
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        netVotes: post.netVotes,
        commentCount: post.commentCount,
        viewCount: post.viewCount,
        isPinned: post.isPinned,
        isLocked: post.isLocked,
      });
      
      results.push({ postId, skoolId: post.skoolId });
    }
    
    return {
      imported: results.length,
      skipped: args.posts.length - results.length,
      mapping: results
    };
  },
});

// Get category by name for mapping
export const getCategoryByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
  },
});

// Get all categories
export const getAllCategories = query({
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

// Create a default category if needed
export const createDefaultCategory = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the first member to use as creator
    const firstMember = await ctx.db.query("members").first();
    if (!firstMember) {
      throw new Error("No members found to create category");
    }

    return await ctx.db.insert("categories", {
      name: args.name,
      displayName: args.displayName,
      description: args.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      postCount: 0,
      status: "active",
      creatorId: firstMember._id,
    });
  },
});

// Helper to create categories from label IDs
export const createCategoriesFromLabels = mutation({
  args: {
    labelIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const firstMember = await ctx.db.query("members").first();
    if (!firstMember) {
      throw new Error("No members found to create categories");
    }

    const categoryMap: Record<string, any> = {};
    
    // Create a category for each unique label
    for (const labelId of args.labelIds) {
      const existingCategory = await ctx.db
        .query("categories")
        .filter((q) => q.eq(q.field("name"), labelId))
        .first();
      
      if (!existingCategory) {
        const categoryId = await ctx.db.insert("categories", {
          name: labelId,
          displayName: `Imported Category ${labelId.slice(0, 8)}`,
          description: "Imported from Skool",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          postCount: 0,
          status: "active",
          creatorId: firstMember._id,
        });
        categoryMap[labelId] = categoryId;
      } else {
        categoryMap[labelId] = existingCategory._id;
      }
    }
    
    return categoryMap;
  },
});