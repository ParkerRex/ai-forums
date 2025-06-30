import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedMember } from "./auth";

// Get all active categories
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .collect();

    return categories.map((category) => ({
      ...category,
      postCount: category.postCount || 0,
    }));
  },
});

// Get category by ID
export const getCategoryById = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, { categoryId }) => {
    const category = await ctx.db.get(categoryId);
    if (!category || category.status !== "active") {
      return null;
    }
    return category;
  },
});

// Get category by name (for routing)
export const getCategoryByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", name))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return category;
  },
});

// Get category stats (post count, recent activity)
export const getCategoryStats = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, { categoryId }) => {
    // Get total posts in category
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", categoryId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get recent posts (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentPosts = posts.filter(post => post.createdAt > sevenDaysAgo);

    // Get top contributors
    const authorCounts = new Map<Id<"members">, number>();
    posts.forEach(post => {
      const count = authorCounts.get(post.memberId) || 0;
      authorCounts.set(post.memberId, count + 1);
    });

    const topContributors = Array.from(authorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      totalPosts: posts.length,
      recentPosts: recentPosts.length,
      totalUpvotes: posts.reduce((sum, post) => sum + (post.upvotes || 0), 0),
      topContributors: topContributors.map(([memberId, postCount]) => ({
        memberId,
        postCount,
      })),
    };
  },
});

// Initialize default categories (run once)
export const initializeCategories = mutation({
  args: {},
  handler: async (ctx) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    const defaultCategories = [
      {
        name: "announcements",
        displayName: "Announcements",
        description: "Important updates, news, and announcements from the VAI community",
        icon: "📢",
      },
      {
        name: "workflows",
        displayName: "Workflows",
        description: "Share and discuss AI workflows, automation, and productivity tips",
        icon: "⚡",
      },
      {
        name: "prompts",
        displayName: "Prompts",
        description: "Share effective prompts, prompt engineering techniques, and templates",
        icon: "💭",
      },
      {
        name: "connect",
        displayName: "Connect",
        description: "Networking, collaboration opportunities, and community discussions",
        icon: "🤝",
      },
      {
        name: "content",
        displayName: "Content",
        description: "YouTube videos, tutorials, and educational content from the VAI community",
        icon: "🎥",
      },
    ];

    const now = Date.now();
    const createdCategories = [];

    for (const categoryData of defaultCategories) {
      // Check if category already exists
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_name", (q) => q.eq("name", categoryData.name))
        .first();

      if (!existing) {
        const categoryId = await ctx.db.insert("categories", {
          name: categoryData.name,
          displayName: categoryData.displayName,
          description: categoryData.description,
          icon: categoryData.icon,
          createdAt: now,
          updatedAt: now,
          postCount: 0,
          status: "active" as const,
          creatorId: member._id,
        });
        createdCategories.push(categoryId);
      }
    }

    return {
      message: `Initialized ${createdCategories.length} categories`,
      categoryIds: createdCategories,
    };
  },
});

// Update category post count (called when posts are created/deleted)
export const updateCategoryPostCount = mutation({
  args: {
    categoryId: v.id("categories"),
    increment: v.boolean(),
  },
  handler: async (ctx, { categoryId, increment }) => {
    const category = await ctx.db.get(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const newCount = Math.max(0, (category.postCount || 0) + (increment ? 1 : -1));

    await ctx.db.patch(categoryId, {
      postCount: newCount,
      updatedAt: Date.now(),
    });

    return newCount;
  },
});

// Search categories (for future use)
export const searchCategories = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { searchTerm, limit = 10 }) => {
    if (!searchTerm.trim()) {
      return [];
    }

    const results = await ctx.db
      .query("categories")
      .withSearchIndex("search_categories", (q) =>
        q.search("displayName", searchTerm)
          .eq("status", "active")
      )
      .take(limit);

    return results;
  },
});

// Create skool import category
export const createSkoolCategory = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if skool category already exists
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", "skool"))
      .first();

    if (existing) {
      return {
        message: "Skool category already exists",
        categoryId: existing._id,
        isNew: false,
      };
    }

    // Get first member to use as creator
    const firstMember = await ctx.db.query("members").first();
    if (!firstMember) {
      throw new Error("No members found. Please ensure at least one member exists before creating category.");
    }

    const now = Date.now();
    const categoryId = await ctx.db.insert("categories", {
      name: "skool",
      displayName: "Skool Import",
      description: "Posts imported from the Skool community",
      icon: "📚",
      createdAt: now,
      updatedAt: now,
      postCount: 0,
      status: "active" as const,
      creatorId: firstMember._id,
    });

    return {
      message: "Skool category created successfully",
      categoryId,
      isNew: true,
    };
  },
});

// Seed categories for initial setup (no auth required - use only for initial seeding)
export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const defaultCategories = [
      {
        name: "announcements",
        displayName: "Announcements",
        description: "Important updates, news, and announcements from the VAI community",
        icon: "📢",
      },
      {
        name: "workflows",
        displayName: "Workflows",
        description: "Share and discuss AI workflows, automation, and productivity tips",
        icon: "⚡",
      },
      {
        name: "prompts",
        displayName: "Prompts",
        description: "Share effective prompts, prompt engineering techniques, and templates",
        icon: "💭",
      },
      {
        name: "connect",
        displayName: "Connect",
        description: "Networking, collaboration opportunities, and community discussions",
        icon: "🤝",
      },
      {
        name: "content",
        displayName: "Content",
        description: "YouTube videos, tutorials, and educational content from the VAI community",
        icon: "🎥",
      },
    ];

    const now = Date.now();
    const createdCategories = [];

    for (const categoryData of defaultCategories) {
      // Check if category already exists
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_name", (q) => q.eq("name", categoryData.name))
        .first();

      if (!existing) {
        // For initial seeding, we'll use a placeholder creatorId
        // In a real app, you might want to create a system user first
        const firstMember = await ctx.db.query("members").first();

        if (!firstMember) {
          throw new Error("No members found. Please ensure at least one member exists before seeding categories.");
        }

        const categoryId = await ctx.db.insert("categories", {
          name: categoryData.name,
          displayName: categoryData.displayName,
          description: categoryData.description,
          icon: categoryData.icon,
          createdAt: now,
          updatedAt: now,
          postCount: 0,
          status: "active" as const,
          creatorId: firstMember._id, // Use first member as creator for seeding
        });
        createdCategories.push(categoryId);
      }
    }

    return {
      message: `Seeded ${createdCategories.length} categories`,
      categoryIds: createdCategories,
      totalCategories: await ctx.db.query("categories").collect().then(cats => cats.length),
    };
  },
}); 