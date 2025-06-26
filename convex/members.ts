import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Doc } from "./_generated/dataModel";

// Helper function to transform member data for UI
function transformMemberForUI(member: Doc<"members">) {
  return {
    _id: member._id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    status: member.status,
    joinedDate: member.joinedDate,
    country: member.country || "",
    updatedAt: member.updatedAt,
    bio: member.bio || "",
    lastOnline: member.lastOnline,
    linkGithub: member.linkGithub,
    linkX: member.linkX,
    linkYouTube: member.linkYouTube,
    location: member.location,
    // Add computed fields for UI
    fullName: `${member.firstName} ${member.lastName}`,
    initials: `${member.firstName[0]}${member.lastName[0]}`.toUpperCase(),
    joinedDateFormatted: new Date(member.joinedDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    lastOnlineFormatted: new Date(member.lastOnline).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
}

/**
 * Get all members for the members directory page
 * Optimized with pagination and filtering
 */
export const getMembers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.union(v.literal("active"), v.literal("churned"), v.literal("free"))),
  },
  returns: v.object({
    page: v.array(v.object({
      _id: v.id("members"),
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      status: v.union(v.literal("active"), v.literal("churned"), v.literal("free")),
      joinedDate: v.number(),
      country: v.string(),
      updatedAt: v.number(),
      bio: v.string(),
      lastOnline: v.number(),
      linkGithub: v.optional(v.string()),
      linkX: v.optional(v.string()),
      linkYouTube: v.optional(v.string()),
      location: v.optional(v.string()),
      fullName: v.string(),
      initials: v.string(),
      joinedDateFormatted: v.string(),
      lastOnlineFormatted: v.string(),
    })),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    // Filter by status if provided, otherwise default to active members
    const status = args.status || "active";
    const result = await ctx.db
      .query("members")
      .withIndex("by_status_and_joinedDate", (q) => q.eq("status", status))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      page: result.page.map(transformMemberForUI),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Get all members without pagination (for simple directory view)
 */
export const getAllMembers = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("members"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    status: v.union(v.literal("active"), v.literal("churned"), v.literal("free")),
    joinedDate: v.number(),
    country: v.string(),
    updatedAt: v.number(),
    bio: v.string(),
    lastOnline: v.number(),
    linkGithub: v.optional(v.string()),
    linkX: v.optional(v.string()),
    linkYouTube: v.optional(v.string()),
    location: v.optional(v.string()),
    fullName: v.string(),
    initials: v.string(),
    joinedDateFormatted: v.string(),
    lastOnlineFormatted: v.string(),
  })),
  handler: async (ctx) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_status_and_joinedDate", (q) => q.eq("status", "active"))
      .order("desc")
      .collect();

    return members.map(transformMemberForUI);
  },
});

/**
 * Get a single member by ID
 */
export const getMemberById = query({
  args: { id: v.id("members") },
  returns: v.union(
    v.object({
      _id: v.id("members"),
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      status: v.union(v.literal("active"), v.literal("churned"), v.literal("free")),
      joinedDate: v.number(),
      country: v.string(),
      updatedAt: v.number(),
      bio: v.string(),
      lastOnline: v.number(),
      linkGithub: v.optional(v.string()),
      linkX: v.optional(v.string()),
      linkYouTube: v.optional(v.string()),
      location: v.optional(v.string()),
      fullName: v.string(),
      initials: v.string(),
      joinedDateFormatted: v.string(),
      lastOnlineFormatted: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.id);
    if (!member) {
      return null;
    }
    return transformMemberForUI(member);
  },
});

/**
 * Get posts by a specific member
 */
export const getMemberPosts = query({
  args: {
    memberId: v.id("members"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(v.object({
      _id: v.id("posts"),
      title: v.string(),
      content: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      authorId: v.id("members"),
      categoryId: v.id("categories"),
      status: v.union(v.literal("active"), v.literal("deleted"), v.literal("hidden"), v.literal("archived")),
      upvotes: v.number(),
      downvotes: v.number(),
      netVotes: v.number(),
      commentCount: v.number(),
      viewCount: v.number(),
      // Add computed fields
      timeAgo: v.string(),
      category: v.optional(v.object({
        _id: v.id("categories"),
        name: v.string(),
        displayName: v.string(),
      })),
    })),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("posts")
      .withIndex("by_authorId", (q) => q.eq("authorId", args.memberId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .paginate(args.paginationOpts);

    // Enrich posts with category information
    const enrichedPage = await Promise.all(
      result.page.map(async (post) => {
        const category = await ctx.db.get(post.categoryId);
        const timeAgo = getTimeAgo(post.createdAt);

        return {
          ...post,
          timeAgo,
          category: category ? {
            _id: category._id,
            name: category.name,
            displayName: category.displayName,
          } : undefined,
        };
      })
    );

    return {
      page: enrichedPage,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Get comments/activity by a specific member
 */
export const getMemberActivity = query({
  args: {
    memberId: v.id("members"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(v.object({
      _id: v.id("comments"),
      content: v.string(),
      createdAt: v.number(),
      postId: v.id("posts"),
      netVotes: v.number(),
      timeAgo: v.string(),
      post: v.optional(v.object({
        _id: v.id("posts"),
        title: v.string(),
        categoryId: v.id("categories"),
      })),
    })),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("comments")
      .withIndex("by_authorId", (q) => q.eq("authorId", args.memberId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .paginate(args.paginationOpts);

    // Enrich comments with post information
    const enrichedPage = await Promise.all(
      result.page.map(async (comment) => {
        const post = await ctx.db.get(comment.postId);
        const timeAgo = getTimeAgo(comment.createdAt);

        return {
          _id: comment._id,
          content: comment.content,
          createdAt: comment.createdAt,
          postId: comment.postId,
          netVotes: comment.netVotes,
          timeAgo,
          post: post ? {
            _id: post._id,
            title: post.title,
            categoryId: post.categoryId,
          } : undefined,
        };
      })
    );

    return {
      page: enrichedPage,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Search members by name, bio, or location
 */
export const searchMembers = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("members"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    status: v.union(v.literal("active"), v.literal("churned"), v.literal("free")),
    joinedDate: v.number(),
    country: v.string(),
    updatedAt: v.number(),
    bio: v.string(),
    lastOnline: v.number(),
    linkGithub: v.optional(v.string()),
    linkX: v.optional(v.string()),
    linkYouTube: v.optional(v.string()),
    location: v.optional(v.string()),
    fullName: v.string(),
    initials: v.string(),
    joinedDateFormatted: v.string(),
    lastOnlineFormatted: v.string(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 100; // Increased from 20 to 100
    const searchTerm = args.searchTerm.toLowerCase().trim();

    if (!searchTerm) {
      return [];
    }

    // Get all active members and filter in memory for multi-field search
    // This is more flexible than search index limitations
    const allMembers = await ctx.db
      .query("members")
      .withIndex("by_status_and_joinedDate", (q) => q.eq("status", "active"))
      .collect();

    // Filter members based on search term matching firstName, lastName, or location
    const filteredMembers = allMembers.filter((member) => {
      const firstName = member.firstName.toLowerCase();
      const lastName = member.lastName.toLowerCase();
      const location = (member.location || "").toLowerCase();
      const fullName = `${firstName} ${lastName}`;

      return (
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        fullName.includes(searchTerm) ||
        location.includes(searchTerm)
      );
    });

    // Sort results by relevance (exact matches first, then partial matches)
    const sortedMembers = filteredMembers.sort((a, b) => {
      const aFirstName = a.firstName.toLowerCase();
      const aLastName = a.lastName.toLowerCase();
      const aLocation = (a.location || "").toLowerCase();
      const aFullName = `${aFirstName} ${aLastName}`;

      const bFirstName = b.firstName.toLowerCase();
      const bLastName = b.lastName.toLowerCase();
      const bLocation = (b.location || "").toLowerCase();
      const bFullName = `${bFirstName} ${bLastName}`;

      // Exact matches first
      const aExactMatch = aFirstName === searchTerm || aLastName === searchTerm || aLocation === searchTerm;
      const bExactMatch = bFirstName === searchTerm || bLastName === searchTerm || bLocation === searchTerm;

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // Then starts with matches
      const aStartsWith = aFirstName.startsWith(searchTerm) || aLastName.startsWith(searchTerm) || aFullName.startsWith(searchTerm);
      const bStartsWith = bFirstName.startsWith(searchTerm) || bLastName.startsWith(searchTerm) || bFullName.startsWith(searchTerm);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // Finally, sort by join date (newest first)
      return b.joinedDate - a.joinedDate;
    });

    return sortedMembers.slice(0, limit).map(transformMemberForUI);
  },
});

/**
 * Update member profile (for optimistic updates)
 */
export const updateMemberProfile = mutation({
  args: {
    id: v.id("members"),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    linkGithub: v.optional(v.string()),
    linkX: v.optional(v.string()),
    linkYouTube: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Update member status
 */
export const updateMemberStatus = mutation({
  args: {
    id: v.id("members"),
    status: v.union(v.literal("active"), v.literal("churned"), v.literal("free")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Helper function to calculate time ago
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}mo`;
  if (weeks > 0) return `${weeks}w`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}