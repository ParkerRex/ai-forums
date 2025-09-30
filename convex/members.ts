/**
 * @fileoverview Members Module - User profile management and community statistics
 *
 * This module handles all member-related operations including profile management,
 * statistics calculation, search functionality, and community engagement tracking.
 * It supports both legacy email-based authentication and modern Clerk integration.
 *
 * Key features:
 * - Member profile management with rich metadata
 * - Cached statistics for performance (posts, comments, votes)
 * - Advanced search with skill-based filtering
 * - Pagination support for large member lists
 * - Real-time online presence tracking
 * - Social links and professional information
 * - Member activity feeds and engagement metrics
 * - Profile validation and URL slug management
 *
 * The module includes comprehensive caching strategies to maintain performance
 * while providing real-time data for member directories and profiles.
 *
 * @author VAI Development Team
 * @version 1.0.0
 */

import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { generateMemberSlug } from "../lib/slug-utils";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { getAuthenticatedMember } from "./auth";

// Shared validator for transformed member data
const MemberUIValidator = v.object({
  _id: v.id("members"),
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  status: v.union(v.literal("active"), v.literal("churned")),
  joinedDate: v.number(),
  country: v.string(),
  updatedAt: v.number(),
  bio: v.string(),
  lastOnline: v.number(),
  linkGithub: v.optional(v.string()),
  linkX: v.optional(v.string()),
  linkYouTube: v.optional(v.string()),
  location: v.optional(v.string()),
  // New fields
  avatarUrl: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  skills: v.array(v.string()),
  // Cached stats
  postCount: v.number(),
  commentCount: v.number(),
  netVoteCount: v.number(),
  // Computed fields
  fullName: v.string(),
  initials: v.string(),
  joinedDateFormatted: v.string(),
  lastOnlineFormatted: v.string(),
  lastOnlineRelative: v.string(),
  // URL slug
  slug: v.string(),
  // Role
  role: v.optional(v.union(v.literal("user"), v.literal("admin"))),
  // Subscription fields
  tier: v.optional(
    v.union(
      v.literal("founding_member"),
      v.literal("early_bird"),
      v.literal("member"),
      v.literal("scholarship"),
    ),
  ),
  subscriptionStatus: v.union(
    v.literal("active"),
    v.literal("cancelled"),
    v.literal("past_due"),
    v.literal("expired"),
    v.literal("none"),
  ),
  subscriptionEndDate: v.optional(v.number()),
  billingInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
});

// Helper to backfill missing cached stats for a member with background caching
async function computeAndCacheMemberStats(
  ctx: QueryCtx,
  member: Doc<"members">,
): Promise<Doc<"members">> {
  // If stats already exist, return early
  if (
    member.postCount !== undefined &&
    member.commentCount !== undefined &&
    member.netVoteCount !== undefined
  ) {
    return member;
  }

  // Compute posts and comments authored by the member
  const [posts, comments] = await Promise.all([
    ctx.db
      .query("posts")
      .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect(),
    ctx.db
      .query("comments")
      .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect(),
  ]);

  const postCount = posts.length;
  const commentCount = comments.length;

  // Aggregate net votes from posts and comments (fallback to upvotes-downvotes if netVotes missing)
  const postsNet = posts.reduce((sum, p) => {
    const net = p.netVotes !== undefined ? p.netVotes : (p.upvotes ?? 0) - (p.downvotes ?? 0);
    return sum + net;
  }, 0);

  const commentsNet = comments.reduce((sum, c) => {
    const net = c.netVotes !== undefined ? c.netVotes : (c.upvotes ?? 0) - (c.downvotes ?? 0);
    return sum + net;
  }, 0);
  const netVoteCount = postsNet + commentsNet;

  // Note: Cannot schedule mutations from within a query context
  // Background caching will be handled by the nightly cron job

  return {
    ...member,
    postCount,
    commentCount,
    netVoteCount,
  } as Doc<"members">;
}

// Helper function to transform member data for UI
function transformMemberForUI(member: Doc<"members">) {
  return {
    _id: member._id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    status: member.status as "active" | "churned", // Cast to exclude "duplicate" and "free" (no free tier)
    joinedDate: member.joinedDate,
    country: member.country || "",
    updatedAt: member.updatedAt,
    bio: member.bio || "",
    lastOnline: member.lastOnline,
    linkGithub: member.linkGithub,
    linkX: member.linkX,
    linkYouTube: member.linkYouTube,
    location: member.location,
    // New fields
    avatarUrl: member.avatarUrl,
    websiteUrl: member.websiteUrl,
    linkedinUrl: member.linkedinUrl,
    skills: member.skills || [],
    // Cached stats (fallback to 0 if not computed yet)
    postCount: member.postCount ?? 0,
    commentCount: member.commentCount ?? 0,
    netVoteCount: member.netVoteCount ?? 0,
    // Add computed fields for UI
    fullName: `${member.firstName} ${member.lastName}`,
    initials: `${member.firstName[0]}${member.lastName[0]}`.toUpperCase(),
    // Role
    role: member.role,
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
    // Relative time for "Last online • X ago" chip
    lastOnlineRelative: getTimeAgo(member.lastOnline),
    // URL slug
    slug: member.slug,
    // Subscription fields
    tier: member.tier, // No fallback - tier is optional (no free tier)
    subscriptionStatus: member.subscriptionStatus || "none",
    subscriptionEndDate: member.subscriptionEndDate,
    billingInterval: member.billingInterval,
  };
}

/**
 * Get all members for the members directory page
 * Optimized with pagination and filtering
 */
export const getMembers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.union(v.literal("active"), v.literal("churned"))),
  },
  returns: v.object({
    page: v.array(MemberUIValidator),
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
 * Get all members with guaranteed stats (computes if missing, uses cached otherwise)
 * This is the reliable query that should be used by UI components
 */
export const getMembersWithStats = query({
  args: {},
  returns: v.array(MemberUIValidator),
  handler: async (ctx) => {
    // Get all members and filter by status in memory to include both active and churned
    const allMembers = await ctx.db.query("members").collect();
    const members = allMembers.filter(
      (member) => member.status === "active" || member.status === "churned",
    );

    const membersWithStats = await Promise.all(
      members.map((member) => computeAndCacheMemberStats(ctx, member)),
    );

    return membersWithStats.map(transformMemberForUI);
  },
});

/**
 * Get all members without pagination (for simple directory view)
 * @deprecated Use getMembersWithStats instead
 */
export const getAllMembers = query({
  args: {},
  returns: v.array(MemberUIValidator),
  handler: async (ctx) => {
    // Get all members and filter by status in memory to include both active and churned
    const allMembers = await ctx.db.query("members").collect();
    const members = allMembers.filter(
      (member) => member.status === "active" || member.status === "churned",
    );

    const membersWithStats = await Promise.all(
      members.map((member) => computeAndCacheMemberStats(ctx, member)),
    );

    return membersWithStats.map(transformMemberForUI);
  },
});

/**
 * Get a single member by ID
 */
export const getMemberById = query({
  args: { id: v.id("members") },
  returns: v.union(MemberUIValidator, v.null()),
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
    page: v.array(
      v.object({
        _id: v.id("posts"),
        title: v.string(),
        content: v.string(),
        preview: v.optional(v.string()),
        slug: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
        memberId: v.id("members"),
        categoryId: v.id("categories"),
        status: v.union(
          v.literal("active"),
          v.literal("deleted"),
          v.literal("hidden"),
          v.literal("archived"),
        ),
        upvotes: v.number(),
        downvotes: v.number(),
        netVotes: v.number(),
        commentCount: v.number(),
        viewCount: v.number(),
        isPinned: v.optional(v.boolean()),
        isLocked: v.optional(v.boolean()),
        editedAt: v.optional(v.number()),
        editReason: v.optional(v.string()),
        isFree: v.optional(v.boolean()),
        type: v.optional(
          v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("video"),
            v.literal("link"),
            v.literal("poll"),
          ),
        ),
        mediaUrl: v.optional(v.string()),
        thumbnailUrl: v.optional(v.string()),
        aspectRatio: v.optional(v.number()),
        mediaWidth: v.optional(v.number()),
        mediaHeight: v.optional(v.number()),
        linkUrl: v.optional(v.string()),
        linkTitle: v.optional(v.string()),
        linkDescription: v.optional(v.string()),
        linkImage: v.optional(v.string()),
        pollOptions: v.optional(
          v.array(
            v.object({
              id: v.string(),
              text: v.string(),
              voteCount: v.number(),
            }),
          ),
        ),
        pollEndsAt: v.optional(v.number()),
        totalPollVotes: v.optional(v.number()),
        pinScope: v.optional(
          v.union(v.literal("category"), v.literal("global"), v.literal("both")),
        ),
        // Add computed fields
        timeAgo: v.string(),
        member: v.union(
          v.object({
            _id: v.id("members"),
            firstName: v.string(),
            lastName: v.string(),
            email: v.string(),
            username: v.string(),
            slug: v.string(),
            avatarUrl: v.optional(v.string()),
          }),
          v.null(),
        ),
        category: v.union(
          v.object({
            _id: v.id("categories"),
            name: v.string(),
            displayName: v.string(),
            icon: v.optional(v.string()),
          }),
          v.null(),
        ),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("posts")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .paginate(args.paginationOpts);

    // Enrich posts with category and member information
    const enrichedPage = await Promise.all(
      result.page.map(async (post) => {
        const [category, member] = await Promise.all([
          ctx.db.get(post.categoryId),
          ctx.db.get(post.memberId),
        ]);
        const timeAgo = getTimeAgo(post.createdAt);

        return {
          _id: post._id,
          title: post.title,
          content: post.content,
          preview: post.preview,
          slug: post.slug,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          memberId: post.memberId,
          categoryId: post.categoryId,
          status: post.status,
          upvotes: post.upvotes,
          downvotes: post.downvotes,
          netVotes: post.netVotes,
          commentCount: post.commentCount,
          viewCount: post.viewCount,
          isPinned: post.isPinned,
          isLocked: post.isLocked,
          editedAt: post.editedAt,
          editReason: post.editReason,
          isFree: post.isFree,
          type: post.type,
          mediaUrl: post.mediaUrl,
          thumbnailUrl: post.thumbnailUrl,
          aspectRatio: post.aspectRatio,
          mediaWidth: post.mediaWidth,
          mediaHeight: post.mediaHeight,
          linkUrl: post.linkUrl,
          linkTitle: post.linkTitle,
          linkDescription: post.linkDescription,
          linkImage: post.linkImage,
          pollOptions: post.pollOptions,
          pollEndsAt: post.pollEndsAt,
          totalPollVotes: post.totalPollVotes,
          pinScope: post.pinScope,
          timeAgo,
          member: member
            ? {
                _id: member._id,
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                username: member.email, // Use email as username for now
                slug: member.slug,
                avatarUrl: member.avatarUrl,
              }
            : null,
          category: category
            ? {
                _id: category._id,
                name: category.name,
                displayName: category.displayName,
                icon: category.icon,
              }
            : null,
        };
      }),
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
    page: v.array(
      v.object({
        _id: v.id("comments"),
        content: v.string(),
        createdAt: v.number(),
        postId: v.id("posts"),
        netVotes: v.number(),
        timeAgo: v.string(),
        post: v.optional(
          v.object({
            _id: v.id("posts"),
            title: v.string(),
            slug: v.string(),
            categoryId: v.id("categories"),
            categoryName: v.string(),
          }),
        ),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("comments")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .paginate(args.paginationOpts);

    // Enrich comments with post information
    const enrichedPage = await Promise.all(
      result.page.map(async (comment) => {
        const post = await ctx.db.get(comment.postId);
        const timeAgo = getTimeAgo(comment.createdAt);

        // Fetch category if post exists
        const category = post ? await ctx.db.get(post.categoryId) : null;

        return {
          _id: comment._id,
          content: comment.content,
          createdAt: comment.createdAt,
          postId: comment.postId,
          netVotes: comment.netVotes,
          timeAgo,
          post: post
            ? {
                _id: post._id,
                title: post.title,
                slug: post.slug,
                categoryId: post.categoryId,
                categoryName: category?.name || "general",
              }
            : undefined,
        };
      }),
    );

    return {
      page: enrichedPage,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Search members by name, bio, or location with guaranteed stats
 */
export const searchMembersWithStats = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(MemberUIValidator),
  handler: async (ctx, args) => {
    const limit = args.limit || 100; // Increased from 20 to 100
    const searchTerm = args.searchTerm.toLowerCase().trim();

    if (!searchTerm) {
      return [];
    }

    // Get all active members and filter in memory for multi-field search
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
      const aExactMatch =
        aFirstName === searchTerm || aLastName === searchTerm || aLocation === searchTerm;
      const bExactMatch =
        bFirstName === searchTerm || bLastName === searchTerm || bLocation === searchTerm;

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // Then starts with matches
      const aStartsWith =
        aFirstName.startsWith(searchTerm) ||
        aLastName.startsWith(searchTerm) ||
        aFullName.startsWith(searchTerm);
      const bStartsWith =
        bFirstName.startsWith(searchTerm) ||
        bLastName.startsWith(searchTerm) ||
        bFullName.startsWith(searchTerm);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // Finally, sort by join date (newest first)
      return b.joinedDate - a.joinedDate;
    });

    // Ensure stats are present for the members we're about to return
    const enrichedMembers = await Promise.all(
      sortedMembers.slice(0, limit).map((m) => computeAndCacheMemberStats(ctx, m)),
    );

    return enrichedMembers.map(transformMemberForUI);
  },
});

/**
 * Search members by name, bio, or location
 * @deprecated Use searchMembersWithStats instead
 */
export const searchMembers = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(MemberUIValidator),
  handler: async (ctx, args) => {
    // Inline implementation for backward compatibility
    const limit = args.limit || 100;
    const searchTerm = args.searchTerm.toLowerCase().trim();

    if (!searchTerm) {
      return [];
    }

    // Get all active members and filter in memory for multi-field search
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
      const aExactMatch =
        aFirstName === searchTerm || aLastName === searchTerm || aLocation === searchTerm;
      const bExactMatch =
        bFirstName === searchTerm || bLastName === searchTerm || bLocation === searchTerm;

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // Then starts with matches
      const aStartsWith =
        aFirstName.startsWith(searchTerm) ||
        aLastName.startsWith(searchTerm) ||
        aFullName.startsWith(searchTerm);
      const bStartsWith =
        bFirstName.startsWith(searchTerm) ||
        bLastName.startsWith(searchTerm) ||
        bFullName.startsWith(searchTerm);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // Finally, sort by join date (newest first)
      return b.joinedDate - a.joinedDate;
    });

    // Ensure stats are present for the members we're about to return
    const enrichedMembers = await Promise.all(
      sortedMembers.slice(0, limit).map((m) => computeAndCacheMemberStats(ctx, m)),
    );

    return enrichedMembers.map(transformMemberForUI);
  },
});

/**
 * Get the current authenticated member
 */
export const getCurrentMember = query({
  args: {},
  returns: v.union(MemberUIValidator, v.null()),
  handler: async (ctx) => {
    // Optional auth - return null if not authenticated
    let member;
    try {
      member = await getAuthenticatedMember(ctx);
    } catch {
      return null;
    }

    return transformMemberForUI(member);
  },
});

/**
 * Update member profile (for optimistic updates)
 */
export const updateMemberProfile = mutation({
  args: {
    id: v.id("members"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    linkGithub: v.optional(v.string()),
    linkX: v.optional(v.string()),
    linkYouTube: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get authenticated member using unified helper
    const authenticatedMember = await getAuthenticatedMember(ctx);

    // Get the member being updated
    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new ConvexError("Member profile not found");
    }

    // Verify the authenticated user can edit this profile
    if (member._id !== authenticatedMember._id) {
      throw new ConvexError("You can only edit your own profile");
    }

    // Validate input data
    if (args.bio && args.bio.length > 500) {
      throw new ConvexError("Bio must be less than 500 characters");
    }

    if (args.location && args.location.length > 100) {
      throw new ConvexError("Location must be less than 100 characters");
    }

    // Validate social media URLs
    if (args.linkGithub && !args.linkGithub.startsWith("https://github.com/")) {
      throw new ConvexError("Invalid GitHub URL format");
    }

    if (args.linkX && !args.linkX.startsWith("https://x.com/")) {
      throw new ConvexError("Invalid X (Twitter) URL format");
    }

    if (args.linkYouTube && !args.linkYouTube.startsWith("https://youtube.com/@")) {
      throw new ConvexError("Invalid YouTube URL format");
    }

    // Validate avatar URL
    if (args.avatarUrl) {
      if (args.avatarUrl.length > 500) {
        throw new ConvexError("Avatar URL must be less than 500 characters");
      }
      if (!args.avatarUrl.match(/^https?:\/\//)) {
        throw new ConvexError("Avatar URL must start with https:// or http://");
      }
    }
    // Validate website URL
    if (args.websiteUrl) {
      if (args.websiteUrl.length > 500) {
        throw new ConvexError("Website URL must be less than 500 characters");
      }
      if (!args.websiteUrl.match(/^https?:\/\//)) {
        throw new ConvexError("Website URL must start with https:// or http://");
      }
    }

    // Check if name is changing and regenerate slug if needed
    let slugUpdate = {};
    if (args.firstName || args.lastName) {
      const newFirstName = args.firstName || member.firstName;
      const newLastName = args.lastName || member.lastName;
      const fullName = `${newFirstName} ${newLastName}`;
      const baseSlug = generateMemberSlug(fullName);
      const uniqueSlug = await ensureUniqueMemberSlug(ctx, baseSlug, args.id);
      slugUpdate = { slug: uniqueSlug };
    }

    // Handle avatar URL update and delete old avatar if needed
    if (args.avatarUrl !== undefined && args.avatarUrl !== member.avatarUrl) {
      const oldUrl = member.avatarUrl;
      if (oldUrl?.includes("/uploads/")) {
        // Extract object key from URL (part after '/uploads/')
        const parts = oldUrl.split("/uploads/");
        if (parts.length > 1) {
          const objectKey = `uploads/${parts[1]}`;
          try {
            // Schedule deletion of old avatar (non-blocking)
            await ctx.scheduler.runAfter(0, api.storage.deleteObject, { objectKey });
          } catch (error) {
            // Log error but continue with profile update
            console.error("Avatar deletion scheduling error:", error);
          }
        }
      }
    }

    // Filter out undefined values (excluding id)
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    // Auto-detect country from location if location is being updated
    let countryUpdate = {};
    if (args.location) {
      // Import the detection function inline to avoid circular dependencies
      const detectCountryFromLocation = (location: string): string | null => {
        const normalized = location.toLowerCase().trim();

        // Check for US states
        const parts = location.split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1].toUpperCase();
          const usStates = new Set([
            "AL",
            "AK",
            "AZ",
            "AR",
            "CA",
            "CO",
            "CT",
            "DE",
            "FL",
            "GA",
            "HI",
            "ID",
            "IL",
            "IN",
            "IA",
            "KS",
            "KY",
            "LA",
            "ME",
            "MD",
            "MA",
            "MI",
            "MN",
            "MS",
            "MO",
            "MT",
            "NE",
            "NV",
            "NH",
            "NJ",
            "NM",
            "NY",
            "NC",
            "ND",
            "OH",
            "OK",
            "OR",
            "PA",
            "RI",
            "SC",
            "SD",
            "TN",
            "TX",
            "UT",
            "VT",
            "VA",
            "WA",
            "WV",
            "WI",
            "WY",
          ]);
          if (usStates.has(lastPart)) return "US";
        }

        // Check common patterns
        if (normalized.includes("usa") || normalized.includes("united states")) return "US";
        if (
          normalized.includes("uk") ||
          normalized.includes("united kingdom") ||
          normalized.includes("england")
        )
          return "GB";
        if (normalized.includes("canada")) return "CA";
        if (normalized.includes("australia")) return "AU";
        if (normalized.includes("germany") || normalized.includes("deutschland")) return "DE";
        if (normalized.includes("france")) return "FR";
        if (normalized.includes("spain") || normalized.includes("españa")) return "ES";
        if (normalized.includes("italy") || normalized.includes("italia")) return "IT";
        if (normalized.includes("netherlands") || normalized.includes("holland")) return "NL";
        if (normalized.includes("japan")) return "JP";
        if (normalized.includes("india")) return "IN";
        if (normalized.includes("brazil") || normalized.includes("brasil")) return "BR";

        return null;
      };

      const detectedCountry = detectCountryFromLocation(args.location);
      if (detectedCountry) {
        countryUpdate = { country: detectedCountry };
      } else {
        // If basic detection fails, schedule AI detection as a background job
        await ctx.scheduler.runAfter(0, internal.countryDetection.detectAndUpdateCountryAI, {
          memberId: id,
          location: args.location,
        });
      }
    }

    // Apply updates including slug if name changed and country if detected
    await ctx.db.patch(id, {
      ...filteredUpdates,
      ...slugUpdate,
      ...countryUpdate,
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
    status: v.union(v.literal("active"), v.literal("churned")),
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

/**
 * Get comments by a specific member (mirrors getMemberPosts)
 */
export const getMemberComments = query({
  args: {
    memberId: v.id("members"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("comments"),
        content: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
        memberId: v.id("members"),
        postId: v.id("posts"),
        parentCommentId: v.optional(v.id("comments")),
        status: v.union(v.literal("active"), v.literal("deleted"), v.literal("hidden")),
        upvotes: v.number(),
        downvotes: v.number(),
        netVotes: v.number(),
        depth: v.number(),
        childCount: v.number(),
        editedAt: v.optional(v.number()),
        editReason: v.optional(v.string()),
        // Add computed fields
        timeAgo: v.string(),
        post: v.union(
          v.object({
            _id: v.id("posts"),
            title: v.string(),
            slug: v.string(),
            categoryId: v.id("categories"),
          }),
          v.null(),
        ),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("comments")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
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
          updatedAt: comment.updatedAt,
          memberId: comment.memberId,
          postId: comment.postId,
          parentCommentId: comment.parentCommentId,
          status: comment.status,
          upvotes: comment.upvotes,
          downvotes: comment.downvotes,
          netVotes: comment.netVotes,
          depth: comment.depth,
          childCount: comment.childCount,
          editedAt: comment.editedAt,
          editReason: comment.editReason,
          timeAgo,
          post: post
            ? {
                _id: post._id,
                title: post.title,
                slug: post.slug,
                categoryId: post.categoryId,
              }
            : null,
        };
      }),
    );

    return {
      page: enrichedPage,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Get member stats (cached or computed)
 */
export const getMemberStats = query({
  args: { memberId: v.id("members") },
  returns: v.object({
    postCount: v.number(),
    commentCount: v.number(),
    netVoteCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      return { postCount: 0, commentCount: 0, netVoteCount: 0 };
    }

    // Use cached values if available
    if (
      member.postCount !== undefined &&
      member.commentCount !== undefined &&
      member.netVoteCount !== undefined
    ) {
      return {
        postCount: member.postCount,
        commentCount: member.commentCount,
        netVoteCount: member.netVoteCount,
      };
    }

    // Fallback to computed values (for backwards compatibility)
    const [posts, comments] = await Promise.all([
      ctx.db
        .query("posts")
        .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect(),
      ctx.db
        .query("comments")
        .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect(),
    ]);

    const postCount = posts.length;
    const commentCount = comments.length;

    // Calculate net votes received on member's content (posts + comments)
    const postIds = posts.map((p) => p._id);
    const commentIds = comments.map((c) => c._id);

    const [postVotes, commentVotes] = await Promise.all([
      // Get votes on member's posts
      postIds.length > 0
        ? Promise.all(
            postIds.map((postId) =>
              ctx.db
                .query("votes")
                .withIndex("by_target_and_type", (q) =>
                  q.eq("targetId", postId.toString()).eq("targetType", "post"),
                )
                .collect(),
            ),
          ).then((results) => results.flat())
        : [],
      // Get votes on member's comments
      commentIds.length > 0
        ? Promise.all(
            commentIds.map((commentId) =>
              ctx.db
                .query("votes")
                .withIndex("by_target_and_type", (q) =>
                  q.eq("targetId", commentId.toString()).eq("targetType", "comment"),
                )
                .collect(),
            ),
          ).then((results) => results.flat())
        : [],
    ]);

    const allVotes = [...postVotes, ...commentVotes];
    const netVoteCount =
      allVotes.filter((v) => v.voteType === "upvote").length -
      allVotes.filter((v) => v.voteType === "downvote").length;

    return { postCount, commentCount, netVoteCount };
  },
});

/**
 * Enhanced search members using search index and skills filter
 */
export const searchMembersEnhanced = query({
  args: {
    searchTerm: v.string(),
    skillsFilter: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  returns: v.array(MemberUIValidator),
  handler: async (ctx, args) => {
    const { searchTerm, skillsFilter, limit = 20 } = args;

    let members: Doc<"members">[] = [];

    if (searchTerm.trim()) {
      // Use search index for text search
      members = await ctx.db
        .query("members")
        .withSearchIndex("search_members", (q) =>
          q.search("firstName", searchTerm).eq("status", "active"),
        )
        .take(limit * 2); // Get more to filter by skills
    } else {
      // Get all active members if no search term
      members = await ctx.db
        .query("members")
        .withIndex("by_status_and_joinedDate", (q) => q.eq("status", "active"))
        .order("desc")
        .take(limit * 2);
    }

    // Filter by skills if provided
    if (skillsFilter && skillsFilter.length > 0) {
      const skillsLower = skillsFilter.map((s) => s.toLowerCase());
      members = members.filter((member) => {
        const memberSkills = (member.skills || []).map((s) => s.toLowerCase());
        return skillsLower.some((skill) => memberSkills.includes(skill));
      });
    }

    return members.slice(0, limit).map(transformMemberForUI);
  },
});

/**
 * Helper function to ensure unique member slug
 */
async function ensureUniqueMemberSlug(
  ctx: MutationCtx,
  baseSlug: string,
  excludeMemberId?: string,
): Promise<string> {
  let uniqueSlug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await ctx.db
      .query("members")
      .withIndex("by_slug", (q) => q.eq("slug", uniqueSlug))
      .first();

    // If no existing member has this slug, or the existing member is the one we're updating
    if (!existing || (excludeMemberId && existing._id === excludeMemberId)) {
      break;
    }

    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

/**
 * Get a single member by slug
 */
export const getMemberBySlug = query({
  args: { slug: v.string() },
  returns: v.union(MemberUIValidator, v.null()),
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("members")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!member) {
      return null;
    }
    return transformMemberForUI(member);
  },
});

/**
 * Get recently online members (active within the last 5 minutes)
 * Used for real-time online users display
 */
export const getOnlineMembers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("members"),
      firstName: v.string(),
      lastName: v.string(),
      avatarUrl: v.optional(v.string()),
      fullName: v.string(),
      initials: v.string(),
      slug: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const onlineMembers = await ctx.db
      .query("members")
      .withIndex("by_lastOnline", (q) => q.gt("lastOnline", fiveMinutesAgo))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .take(10); // Limit to prevent overcrowding

    return onlineMembers.map((member) => ({
      _id: member._id,
      firstName: member.firstName,
      lastName: member.lastName,
      avatarUrl: member.avatarUrl,
      fullName: `${member.firstName} ${member.lastName}`,
      initials: `${member.firstName[0]}${member.lastName[0]}`.toUpperCase(),
      slug: member.slug,
    }));
  },
});

/**
 * Get a member by email address
 * Used for guest session validation and guest member lookups
 */
export const getMemberByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const member = await ctx.db
      .query("members")
      .filter((q) => q.and(q.eq(q.field("email"), email), q.eq(q.field("status"), "active")))
      .first();

    return member;
  },
});

/**
 * Search members by name (for migration script)
 */
export const searchByName = query({
  args: {
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let members: Doc<"members">[] = [];

    if (args.name) {
      // Search by full name
      const [firstName, ...lastNameParts] = args.name.split(" ");
      const lastName = lastNameParts.join(" ");

      members = await ctx.db
        .query("members")
        .filter((q) =>
          q.and(q.eq(q.field("firstName"), firstName), q.eq(q.field("lastName"), lastName)),
        )
        .collect();
    } else if (args.firstName && args.lastName) {
      // Search by first and last name
      members = await ctx.db
        .query("members")
        .filter((q) =>
          q.and(
            q.eq(q.field("firstName"), args.firstName),
            q.eq(q.field("lastName"), args.lastName),
          ),
        )
        .collect();
    }

    return members;
  },
});

/**
 * Get all members with @imported.com emails
 */
export const getMembersWithImportedEmails = query({
  args: {},
  handler: async (ctx) => {
    const allMembers = await ctx.db.query("members").collect();
    return allMembers.filter((member) => member.email?.endsWith("@imported.com"));
  },
});

/**
 * Update member information (for migration script)
 */
export const updateMember = mutation({
  args: {
    memberId: v.id("members"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { memberId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(memberId, {
        ...filteredUpdates,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Delete a member (for member merge)
 */
export const deleteMember = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.memberId);
  },
});

/**
 * Update member for merge (admin task, no auth required)
 */
export const updateMemberForMerge = mutation({
  args: {
    memberId: v.id("members"),
    firstName: v.string(),
    lastName: v.string(),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    linkGithub: v.optional(v.string()),
    linkX: v.optional(v.string()),
    linkYouTube: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    joinedDate: v.optional(v.number()),
    lastOnline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { memberId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    // Generate new slug for the updated name
    const fullName = `${args.firstName} ${args.lastName}`;
    const baseSlug = generateMemberSlug(fullName);
    const uniqueSlug = await ensureUniqueMemberSlug(ctx, baseSlug, memberId);

    await ctx.db.patch(memberId, {
      ...filteredUpdates,
      slug: uniqueSlug,
      updatedAt: Date.now(),
    });
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
