import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedMember } from "./auth";
import { canViewResource } from "./helpers/subscriptionAccess";

export const getResourcesByTopic = query({
  args: {
    topicId: v.id("topics"),
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("popular"))),
    type: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    isPaid: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("resources"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      url: v.string(),
      topicId: v.id("topics"),
      memberId: v.id("members"),
      type: v.union(
        v.literal("article"),
        v.literal("video"),
        v.literal("course"),
        v.literal("documentation"),
        v.literal("tool"),
        v.literal("book"),
        v.literal("other"),
      ),
      difficulty: v.optional(
        v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
      ),
      isPaid: v.boolean(),
      isFree: v.optional(v.boolean()),
      upvotes: v.number(),
      downvotes: v.number(),
      netVotes: v.number(),
      viewCount: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("rejected"),
        v.literal("outdated"),
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
      linkTitle: v.optional(v.string()),
      linkDescription: v.optional(v.string()),
      linkImage: v.optional(v.string()),
      member: v.union(
        v.object({
          _id: v.id("members"),
          firstName: v.string(),
          lastName: v.string(),
          username: v.string(),
          slug: v.string(),
        }),
        v.null(),
      ),
    }),
  ),
  handler: async (ctx, { topicId, limit = 20, sortBy = "newest", type, difficulty, isPaid }) => {
    let query;

    if (sortBy === "popular") {
      query = ctx.db
        .query("resources")
        .withIndex("by_topic_and_votes", (q) => q.eq("topicId", topicId));
    } else {
      query = ctx.db
        .query("resources")
        .withIndex("by_topic_and_createdAt", (q) => q.eq("topicId", topicId));
    }

    let resources = await query
      .filter((q) => q.eq(q.field("status"), "active"))
      .order(sortBy === "newest" ? "desc" : "desc")
      .take(limit * 2);

    if (type) {
      resources = resources.filter((r) => r.type === type);
    }
    if (difficulty) {
      resources = resources.filter((r) => r.difficulty === difficulty);
    }
    if (isPaid !== undefined) {
      resources = resources.filter((r) => r.isPaid === isPaid);
    }

    resources = resources.slice(0, limit);

    const enrichedResources = await Promise.all(
      resources.map(async (resource) => {
        const member = (await ctx.db.get(resource.memberId)) as Doc<"members"> | null;
        return {
          ...resource,
          member: member
            ? {
                _id: member._id,
                firstName: member.firstName,
                lastName: member.lastName,
                username: member.email.split("@")[0],
                slug: member.slug || "",
              }
            : null,
        };
      }),
    );

    return enrichedResources;
  },
});

export const createResource = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    url: v.string(),
    topicId: v.id("topics"),
    type: v.union(
      v.literal("article"),
      v.literal("video"),
      v.literal("course"),
      v.literal("documentation"),
      v.literal("tool"),
      v.literal("book"),
      v.literal("other"),
    ),
    difficulty: v.optional(
      v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    ),
    isPaid: v.boolean(),
    isFree: v.optional(v.boolean()),
    linkTitle: v.optional(v.string()),
    linkDescription: v.optional(v.string()),
    linkImage: v.optional(v.string()),
  },
  returns: v.id("resources"),
  handler: async (ctx, args) => {
    const member = await getAuthenticatedMember(ctx);

    const topic = await ctx.db.get(args.topicId);
    if (!topic || topic.status !== "active") {
      throw new Error("Invalid topic");
    }

    const now = Date.now();
    const resourceId = await ctx.db.insert("resources", {
      title: args.title.trim(),
      description: args.description.trim(),
      url: args.url,
      topicId: args.topicId,
      memberId: member._id,
      type: args.type,
      difficulty: args.difficulty,
      isPaid: args.isPaid,
      isFree: args.isFree || false,
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      viewCount: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
      linkTitle: args.linkTitle,
      linkDescription: args.linkDescription,
      linkImage: args.linkImage,
    });

    await ctx.db.patch(args.topicId, {
      resourceCount: (topic.resourceCount || 0) + 1,
      updatedAt: now,
    });

    return resourceId;
  },
});

export const searchResources = query({
  args: {
    searchTerm: v.string(),
    topicId: v.optional(v.id("topics")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("resources"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      url: v.string(),
      topicId: v.id("topics"),
      memberId: v.id("members"),
      type: v.union(
        v.literal("article"),
        v.literal("video"),
        v.literal("course"),
        v.literal("documentation"),
        v.literal("tool"),
        v.literal("book"),
        v.literal("other"),
      ),
      difficulty: v.optional(
        v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
      ),
      isPaid: v.boolean(),
      isFree: v.optional(v.boolean()),
      upvotes: v.number(),
      downvotes: v.number(),
      netVotes: v.number(),
      viewCount: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("rejected"),
        v.literal("outdated"),
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
      linkTitle: v.optional(v.string()),
      linkDescription: v.optional(v.string()),
      linkImage: v.optional(v.string()),
      member: v.union(
        v.object({
          _id: v.id("members"),
          firstName: v.string(),
          lastName: v.string(),
          username: v.string(),
          slug: v.string(),
        }),
        v.null(),
      ),
    }),
  ),
  handler: async (ctx, { searchTerm, topicId, limit = 20 }) => {
    if (!searchTerm.trim()) {
      return [];
    }

    const query = ctx.db.query("resources").withSearchIndex("search_resources", (q) => {
      let searchQuery = q.search("title", searchTerm).eq("status", "active");
      if (topicId) {
        searchQuery = searchQuery.eq("topicId", topicId);
      }
      return searchQuery;
    });

    const resources = await query.take(limit);

    const enrichedResources = await Promise.all(
      resources.map(async (resource) => {
        const member = (await ctx.db.get(resource.memberId)) as Doc<"members"> | null;
        return {
          ...resource,
          member: member
            ? {
                _id: member._id,
                firstName: member.firstName,
                lastName: member.lastName,
                username: member.email.split("@")[0],
                slug: member.slug || "",
              }
            : null,
        };
      }),
    );

    return enrichedResources;
  },
});

export const trackResourceView = mutation({
  args: {
    resourceId: v.id("resources"),
  },
  returns: v.null(),
  handler: async (ctx, { resourceId }) => {
    const resource = await ctx.db.get(resourceId);
    if (!resource || resource.status !== "active") {
      return null;
    }

    await ctx.db.patch(resourceId, {
      viewCount: (resource.viewCount || 0) + 1,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const canUserViewResource = query({
  args: {
    resourceId: v.id("resources"),
  },
  returns: v.boolean(),
  handler: async (ctx, { resourceId }) => {
    const resource = await ctx.db.get(resourceId);
    if (!resource) {
      return false;
    }

    const identity = await ctx.auth.getUserIdentity();
    let member = null;

    if (identity) {
      member = await ctx.db
        .query("members")
        .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
        .unique();
    }

    return canViewResource(member, resource);
  },
});
