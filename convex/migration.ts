import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Import a single post from Skool migration data
 */
export const importSkoolPost = mutation({
  args: {
    externalId: v.string(),
    title: v.string(),
    content: v.string(),
    authorEmail: v.string(),
    authorFirstName: v.string(),
    authorLastName: v.string(),
    category: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    upvoteCount: v.optional(v.number()),
    viewCount: v.optional(v.number()),
    commentCount: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
    videoLinks: v.optional(v.string()),
    imagePreview: v.optional(v.string()),
    originalData: v.optional(v.object({
      skoolId: v.string(),
      skoolTitle: v.optional(v.string()),
      skoolName: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    // Find or create the author (member) - using firstName search since no email index
    let member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.authorEmail))
      .first();

    if (!member) {
      // Create the member if they don't exist
      const memberId = await ctx.db.insert("members", {
        email: args.authorEmail,
        firstName: args.authorFirstName,
        lastName: args.authorLastName,
        joinedDate: args.createdAt, // Use joinedDate instead of joinedAt
        // Default values for required fields
        status: "active",
        updatedAt: args.createdAt,
        lastOnline: args.createdAt,
      });

      member = await ctx.db.get(memberId);
      if (!member) {
        throw new Error("Failed to create member");
      }
    }

    // Find the category
    const category = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", args.category))
      .first();

    if (!category) {
      throw new Error(`Category "${args.category}" not found`);
    }

    // Check if post already exists (by title and author - no externalId field in schema)
    const existingPost = await ctx.db
      .query("posts")
      .filter((q) =>
        q.and(
          q.eq(q.field("title"), args.title),
          q.eq(q.field("authorId"), member._id)
        )
      )
      .first();

    if (existingPost) {
      console.log(`Post "${args.title}" by ${args.authorFirstName} already exists, skipping`);
      return existingPost._id;
    }

    // Create the post using schema field names
    const postId = await ctx.db.insert("posts", {
      title: args.title,
      content: args.content,
      authorId: member._id,
      categoryId: category._id,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      status: "active",
      upvotes: args.upvoteCount || 0,
      downvotes: 0,
      netVotes: args.upvoteCount || 0,
      commentCount: args.commentCount || 0,
      viewCount: args.viewCount || 0,
      isPinned: args.isPinned || false,
    });

    return postId;
  },
});

/**
 * Get import statistics
 */
export const getImportStats = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    const members = await ctx.db.query("members").collect();

    return {
      totalPosts: posts.length,
      totalMembers: members.length,
      activePosts: posts.filter(p => p.status === "active").length,
      activeMembers: members.filter(m => m.status === "active").length
    };
  },
});

/**
 * Clear all posts (for testing)
 */
export const clearAllPosts = mutation({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();

    for (const post of posts) {
      await ctx.db.delete(post._id);
    }

    return { deletedCount: posts.length };
  },
});

// Note: Batch import can be implemented later if needed
// For now, use individual imports to avoid complexity 