import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Doc } from "./_generated/dataModel";

// Shared validator for transformed member data
const MemberUIValidator = v.object({
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
});

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
 * Get all members without pagination (for simple directory view)
 */
export const getAllMembers = query({
  args: {},
  returns: v.array(MemberUIValidator),
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
    page: v.array(v.object({
      _id: v.id("posts"),
      title: v.string(),
      content: v.string(),
      slug: v.string(),
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
      isPinned: v.optional(v.boolean()),
      isLocked: v.optional(v.boolean()),
      editedAt: v.optional(v.number()),
      editReason: v.optional(v.string()),
      // Add computed fields
      timeAgo: v.string(),
      author: v.union(v.object({
        _id: v.id("members"),
        firstName: v.string(),
        lastName: v.string(),
        email: v.string(),
        username: v.string(),
      }), v.null()),
      category: v.union(v.object({
        _id: v.id("categories"),
        name: v.string(),
        displayName: v.string(),
        icon: v.optional(v.string()),
      }), v.null()),
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

    // Enrich posts with category and author information
    const enrichedPage = await Promise.all(
      result.page.map(async (post) => {
        const [category, author] = await Promise.all([
          ctx.db.get(post.categoryId),
          ctx.db.get(post.authorId),
        ]);
        const timeAgo = getTimeAgo(post.createdAt);

        return {
          _id: post._id,
          title: post.title,
          content: post.content,
          slug: post.slug,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          authorId: post.authorId,
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
          timeAgo,
          author: author ? {
            _id: author._id,
            firstName: author.firstName,
            lastName: author.lastName,
            email: author.email,
            username: author.email, // Use email as username for now
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
  returns: v.array(MemberUIValidator),
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
 * Get the current authenticated member
 */
export const getCurrentMember = query({
  args: {},
  returns: v.union(MemberUIValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .unique();

    if (!member) {
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
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    linkGithub: v.optional(v.string()),
    linkX: v.optional(v.string()),
    linkYouTube: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("You must be signed in to update your profile");
    }

    // Get the member being updated
    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new ConvexError("Member profile not found");
    }

    // Verify the authenticated user can edit this profile
    if (member.email !== identity.email) {
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

    const { id, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    try {
      await ctx.db.patch(id, {
        ...filteredUpdates,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Database error updating member profile:", error);
      throw new ConvexError("Failed to save profile changes. Please try again.");
    }

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

/**
 * Get comments by a specific member (mirrors getMemberPosts)
 */
export const getMemberComments = query({
  args: {
    memberId: v.id("members"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(v.object({
      _id: v.id("comments"),
      content: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      authorId: v.id("members"),
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
      post: v.union(v.object({
        _id: v.id("posts"),
        title: v.string(),
        slug: v.string(),
        categoryId: v.id("categories"),
      }), v.null()),
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
          updatedAt: comment.updatedAt,
          authorId: comment.authorId,
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
          post: post ? {
            _id: post._id,
            title: post.title,
            slug: post.slug,
            categoryId: post.categoryId,
          } : null,
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
    if (member.postCount !== undefined && 
        member.commentCount !== undefined && 
        member.netVoteCount !== undefined) {
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
        .withIndex("by_authorId", (q) => q.eq("authorId", args.memberId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect(),
      ctx.db
        .query("comments")
        .withIndex("by_authorId", (q) => q.eq("authorId", args.memberId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect(),
    ]);

    const postCount = posts.length;
    const commentCount = comments.length;

    // Calculate net votes received on member's content (posts + comments)
    const postIds = posts.map(p => p._id);
    const commentIds = comments.map(c => c._id);
    
    const [postVotes, commentVotes] = await Promise.all([
      // Get votes on member's posts
      postIds.length > 0 ? 
        Promise.all(postIds.map(postId => 
          ctx.db.query("votes")
            .withIndex("by_target_and_type", (q) => q.eq("targetId", postId.toString()).eq("targetType", "post"))
            .collect()
        )).then(results => results.flat()) : [],
      // Get votes on member's comments  
      commentIds.length > 0 ?
        Promise.all(commentIds.map(commentId =>
          ctx.db.query("votes")
            .withIndex("by_target_and_type", (q) => q.eq("targetId", commentId.toString()).eq("targetType", "comment"))
            .collect()
        )).then(results => results.flat()) : [],
    ]);

    const allVotes = [...postVotes, ...commentVotes];
    const netVoteCount = allVotes.filter(v => v.voteType === "upvote").length - 
                        allVotes.filter(v => v.voteType === "downvote").length;

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
          q.search("firstName", searchTerm).eq("status", "active")
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
      const skillsLower = skillsFilter.map(s => s.toLowerCase());
      members = members.filter(member => {
        const memberSkills = (member.skills || []).map(s => s.toLowerCase());
        return skillsLower.some(skill => memberSkills.includes(skill));
      });
    }

    return members.slice(0, limit).map(transformMemberForUI);
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