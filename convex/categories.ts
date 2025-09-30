/**
 * @fileoverview Categories Module - Post organization and classification system
 *
 * This module manages the category system that organizes posts into themed discussions.
 * Categories provide structure for content discovery, moderation boundaries, and
 * community organization. Each category has its own rules, visual branding, and
 * usage statistics.
 *
 * Key features:
 * - Category creation and management
 * - Post count tracking and statistics
 * - Category-specific rules and moderation
 * - Visual branding with icons and banners
 * - Search functionality for category discovery
 * - Access control (public, private, inactive states)
 * - Default category initialization
 * - Category deletion with content cleanup
 *
 * The system supports hierarchical organization and provides efficient querying
 * for category feeds and content discovery.
 *
 * @author VAI Development Team
 * @version 1.0.0
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedMember } from "./auth";

/**
 * Get all categories (for data integrity checks)
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

/**
 * Retrieves all active categories with post counts.
 *
 * Returns a filtered list of active categories excluding legacy import categories.
 * Each category includes metadata like post count, description, and visual elements.
 * Used for category navigation, post creation forms, and directory pages.
 *
 * @returns Array of active category objects with post counts
 *
 * @example
 * ```typescript
 * const categories = await getCategories();
 * // Returns: [{ name: "workflows", displayName: "Workflows", postCount: 42, ... }]
 * ```
 */
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .collect();

    // Exclude the legacy "skool" import category from the list
    const filtered = categories.filter((cat) => cat.name !== "skool");

    return filtered.map((category) => ({
      ...category,
      postCount: category.postCount || 0,
    }));
  },
});

/**
 * Retrieves a single category by its unique identifier.
 *
 * Returns complete category information if the category exists and is active.
 * Used for category detail pages and validation during post operations.
 *
 * @param categoryId - Unique identifier of the category
 * @returns Category object or null if not found/inactive
 *
 * @example
 * ```typescript
 * const category = await getCategoryById({ categoryId: "cat123" });
 * if (category) {
 *   console.log(`Category: ${category.displayName}`);
 * }
 * ```
 */
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

/**
 * Retrieves a category by its URL-friendly name for routing.
 *
 * Used for SEO-friendly category URLs and navigation. Handles special cases
 * like legacy category filtering. Essential for category-based routing.
 *
 * @param name - URL-safe category name identifier
 * @returns Category object or null if not found
 *
 * @example
 * ```typescript
 * const category = await getCategoryByName({ name: "workflows" });
 * // Used in: /workflows/posts
 * ```
 */
export const getCategoryByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    if (name === "skool") {
      // Treat the removed category as non-existent
      return null;
    }

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
    const recentPosts = posts.filter((post) => post.createdAt > sevenDaysAgo);

    // Get top contributors
    const authorCounts = new Map<Id<"members">, number>();
    posts.forEach((post) => {
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

/**
 * Initializes the default category structure for a new community.
 *
 * Creates the standard set of categories used by the VAI community including
 * Announcements, Workflows, Prompts, Connect, and Content. Only creates categories
 * that don't already exist. Requires authentication.
 *
 * @returns Object with creation summary and new category IDs
 *
 * @example
 * ```typescript
 * const result = await initializeCategories();
 * console.log(`Created ${result.categoryIds.length} new categories`);
 * ```
 */
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

/**
 * Searches categories by display name with fuzzy matching.
 *
 * Provides search functionality for category discovery and selection.
 * Uses full-text search indexes for efficient querying across category names.
 *
 * @param searchTerm - Text to search for in category names
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of matching category objects
 *
 * @example
 * ```typescript
 * const results = await searchCategories({
 *   searchTerm: "work",
 *   limit: 5
 * });
 * // Might return categories like "Workflows", "Networking", etc.
 * ```
 */
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
        q.search("displayName", searchTerm).eq("status", "active"),
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
      throw new Error(
        "No members found. Please ensure at least one member exists before creating category.",
      );
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
          throw new Error(
            "No members found. Please ensure at least one member exists before seeding categories.",
          );
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
      totalCategories: await ctx.db
        .query("categories")
        .collect()
        .then((cats) => cats.length),
    };
  },
});

// Delete a category and all its posts (irreversible)
export const deleteCategoryByName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    // Only allow deletion of the "skool" category for safety (extend as needed)
    if (name !== "skool") {
      throw new Error("This mutation currently only supports deleting the 'skool' category.");
    }

    // Find the category
    const category = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (!category) {
      return { message: `Category '${name}' not found`, deleted: false };
    }

    // Delete all posts in this category (hard delete)
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
      .collect();

    for (const post of posts) {
      await ctx.db.delete(post._id);
    }

    // Finally delete the category itself
    await ctx.db.delete(category._id);

    return {
      message: `Deleted category '${name}' and ${posts.length} posts`,
      deletedPosts: posts.length,
      deletedCategoryId: category._id,
    };
  },
});
