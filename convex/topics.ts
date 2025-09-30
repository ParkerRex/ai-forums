import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedMember } from "./auth";

export const getTopics = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("topics"),
      _creationTime: v.number(),
      name: v.string(),
      displayName: v.string(),
      description: v.string(),
      icon: v.optional(v.string()),
      resourceCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
      status: v.union(v.literal("active"), v.literal("inactive")),
    }),
  ),
  handler: async (ctx, { limit = 50 }) => {
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(limit);

    return topics;
  },
});

export const getTopicByName = query({
  args: { name: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("topics"),
      _creationTime: v.number(),
      name: v.string(),
      displayName: v.string(),
      description: v.string(),
      icon: v.optional(v.string()),
      resourceCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
      status: v.union(v.literal("active"), v.literal("inactive")),
    }),
    v.null(),
  ),
  handler: async (ctx, { name }) => {
    const topic = await ctx.db
      .query("topics")
      .withIndex("by_name", (q) => q.eq("name", name))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return topic || null;
  },
});

export const createTopic = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    description: v.string(),
    icon: v.optional(v.string()),
  },
  returns: v.id("topics"),
  handler: async (ctx, args) => {
    const _member = await getAuthenticatedMember(ctx);

    const now = Date.now();
    const topicId = await ctx.db.insert("topics", {
      name: args.name.toLowerCase(),
      displayName: args.displayName,
      description: args.description,
      icon: args.icon,
      resourceCount: 0,
      createdAt: now,
      updatedAt: now,
      status: "active",
    });

    return topicId;
  },
});

export const searchTopics = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("topics"),
      _creationTime: v.number(),
      name: v.string(),
      displayName: v.string(),
      description: v.string(),
      icon: v.optional(v.string()),
      resourceCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
      status: v.union(v.literal("active"), v.literal("inactive")),
    }),
  ),
  handler: async (ctx, { searchTerm, limit = 20 }) => {
    if (!searchTerm.trim()) {
      return [];
    }

    const topics = await ctx.db
      .query("topics")
      .withSearchIndex("search_topics", (q) =>
        q.search("displayName", searchTerm).eq("status", "active"),
      )
      .take(limit);

    return topics;
  },
});
