/**
 * @fileoverview Posts Module - Core content management system for community posts
 * 
 * This module handles all post-related operations including creation, editing, deletion,
 * and retrieval. It supports rich content types including text, images, videos, links,
 * and polls with comprehensive media attachment support.
 * 
 * Key features:
 * - Multi-media post creation with attachment support
 * - Post editing with version history tracking
 * - URL validation and security for shared links
 * - Voting and engagement metrics
 * - Category-based organization
 * - Search functionality across titles and content
 * - View tracking and analytics
 * - Mention notifications and social features
 * 
 * @author VAI Development Team
 * @version 1.0.0
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id, Doc } from "./_generated/dataModel";
import { generateSlug, ensureUniqueSlug } from "../lib/slug-utils";
import { getAuthenticatedMember, getAuthenticatedMemberOrNull } from "./auth";
import { insertNotification } from "./notifications";
import { canViewFullContent, canViewPost } from "./helpers/subscriptionAccess";
import { api } from "./_generated/api";

/**
 * Checks if a member is the author of a post for authorization purposes.
 * 
 * @param post - Post object containing memberId
 * @param memberId - Member ID to check against
 * @returns True if the member is the post author
 */
function isPostAuthor(post: { memberId: Id<"members"> }, memberId: Id<"members">): boolean {
  return post.memberId === memberId;
}

/**
 * Validates and sanitizes URLs found in post content for security.
 * 
 * Scans content for both bare URLs and markdown-formatted links, then validates
 * each URL against security policies. Blocks dangerous schemes, private/localhost
 * addresses, and malformed URLs to prevent XSS and SSRF attacks.
 * 
 * @param content - Post content to scan for URLs
 * @throws Error when dangerous or invalid URLs are detected
 * 
 * @example
 * ```typescript
 * validateContentUrls("Check out https://example.com and [GitHub](https://github.com)");
 * // No error - valid public URLs
 * 
 * validateContentUrls("Don't visit javascript:alert('xss')");
 * // Throws error - dangerous scheme blocked
 * ```
 */
function validateContentUrls(content: string): void {
  // Extract, deduplicate, and validate any URLs (including markdown links)
  // present within the provided content string. Throws an error for any
  // URL that is malformed, uses a disallowed protocol, or targets a
  // private/localhost address to mitigate XSS and SSRF vectors.
  // Match URLs and markdown links
  const urlPattern = /https?:\/\/[^\s)]+/g;
  const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  const urls = new Set<string>();

  // Extract bare URLs
  let match;
  while ((match = urlPattern.exec(content)) !== null) {
    urls.add(match[0]);
  }

  // Extract URLs from markdown links
  while ((match = markdownRegex.exec(content)) !== null) {
    urls.add(match[2]);
  }

  // Validate each URL
  for (const url of Array.from(urls)) {
    try {
      const parsedUrl = new URL(url);

      // Only allow http and https
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`Invalid protocol in URL: ${url}`);
      }

      // Block localhost and private IPs for security
      const hostname = parsedUrl.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)
      ) {
        throw new Error(`Private/localhost URLs not allowed: ${url}`);
      }

      // Block javascript: and data: schemes
      if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
        throw new Error(`Dangerous URL scheme not allowed: ${url}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid URL')) {
        throw new Error(`Invalid URL format: ${url}`);
      }
      throw error;
    }
  }
}

/**
 * Retrieves paginated posts with filtering and sorting options.
 * 
 * Supports filtering by category and sorting by newest, popular, or trending.
 * Returns enriched posts with member and category information for display.
 * Uses database indexes for efficient querying at scale.
 * 
 * @param categoryId - Optional category filter
 * @param limit - Maximum number of posts to return (default: 20)
 * @param sortBy - Sort order: "newest", "popular", or "trending" (default: "newest")
 * @returns Array of enriched post objects with member and category data
 * 
 * @example
 * ```typescript
 * // Get latest posts from all categories
 * const latestPosts = await getPosts({});
 * 
 * // Get popular posts from specific category
 * const popularInCategory = await getPosts({
 *   categoryId: "category123",
 *   sortBy: "popular",
 *   limit: 10
 * });
 * ```
 */
export const getPosts = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("popular"), v.literal("trending"))),
    freeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { categoryId, limit = 20, sortBy = "newest", freeOnly = false }) => {
    let pinnedPosts: Doc<"posts">[] = [];
    let regularPosts: Doc<"posts">[] = [];

    // First, get pinned posts
    if (categoryId) {
      // Get category-specific pinned posts
      pinnedPosts = await ctx.db
        .query("posts")
        .withIndex("by_pinned_and_category")
        .filter(q =>
          q.and(
            q.eq(q.field("isPinned"), true),
            q.eq(q.field("categoryId"), categoryId),
            q.eq(q.field("status"), "active"),
            q.or(
              q.eq(q.field("pinScope"), "category"),
              q.eq(q.field("pinScope"), "both")
            )
          )
        )
        .order("desc")
        .collect();
    } else {
      // Get globally pinned posts for "all posts" view
      pinnedPosts = await ctx.db
        .query("posts")
        .withIndex("by_pinned_global")
        .filter(q =>
          q.and(
            q.eq(q.field("isPinned"), true),
            q.eq(q.field("status"), "active"),
            q.or(
              q.eq(q.field("pinScope"), "global"),
              q.eq(q.field("pinScope"), "both")
            )
          )
        )
        .order("desc")
        .collect();
    }

    // Sort pinned posts by pinnedAt timestamp (newest first)
    pinnedPosts.sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));

    // Apply free-only filter to pinned posts if requested
    if (freeOnly) {
      pinnedPosts = pinnedPosts.filter(post => post.isFree === true);
    }

    // Limit pinned posts to not exceed the total limit
    pinnedPosts = pinnedPosts.slice(0, limit);

    // Calculate how many regular posts we need
    const remainingLimit = Math.max(0, limit - pinnedPosts.length);

    // Then get regular (non-pinned) posts if we need more
    if (remainingLimit > 0) {
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

      // Filter active, non-pinned posts and apply ordering
      let regularPostsQuery = query
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "active"),
            q.or(
              q.eq(q.field("isPinned"), false),
              q.eq(q.field("isPinned"), undefined)
            )
          )
        );

      // Apply free-only filter if requested
      if (freeOnly) {
        regularPostsQuery = regularPostsQuery.filter((q) => q.eq(q.field("isFree"), true));
      }

      regularPosts = await regularPostsQuery
        .order(sortBy === "newest" ? "desc" : "desc")
        .take(remainingLimit);
    }

    // Combine pinned and regular posts
    const allPosts = [...pinnedPosts, ...regularPosts];

    // Collect unique member and category IDs
    const memberIds = Array.from(new Set(allPosts.map(post => post.memberId)));
    const categoryIds = Array.from(new Set(allPosts.map(post => post.categoryId)));

    // Fetch all members and categories in parallel
    const [members, categories] = await Promise.all([
      Promise.all(memberIds.map(id => ctx.db.get(id) as Promise<Doc<"members"> | null>)),
      Promise.all(categoryIds.map(id => ctx.db.get(id) as Promise<Doc<"categories"> | null>))
    ]);

    // Create lookup maps for fast access
    const memberMap = new Map(
      members.map((member, index) => [memberIds[index], member])
    );
    const categoryMap = new Map(
      categories.map((category, index) => [categoryIds[index], category])
    );

    // Enrich posts with member and category data
    const enrichedPosts = allPosts.map((post) => {
      const member = memberMap.get(post.memberId);
      const category = categoryMap.get(post.categoryId);

      return {
        ...post,
        member: member ? {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          username: member.email.split('@')[0], // Derive username from email
          slug: member.slug || "",
          avatarUrl: member.avatarUrl || null,
        } : null,
        category: category ? {
          _id: category._id,
          name: category.name,
          displayName: category.displayName,
          icon: category.icon,
        } : null,
      };
    });

    return enrichedPosts;
  },
});

/**
 * Retrieves posts with pagination support.
 * 
 * This query provides cursor-based pagination for efficiently loading large sets of posts.
 * It maintains the same filtering, sorting, and pinning logic as getPosts but returns
 * results in a paginated format compatible with Convex's usePaginatedQuery hook.
 * 
 * Features:
 * - Cursor-based pagination for efficient loading
 * - Category filtering with pinned posts support
 * - Sorting by newest, popular, or trending
 * - Free-only content filtering
 * - Pinned posts appear only on the first page
 * 
 * IMPORTANT IMPLEMENTATION NOTES:
 * - The first page may contain more items than requested when pinned posts exist
 * - This is intentional to maintain cursor integrity and prevent posts from being skipped
 * - Pinned posts are limited to 20 to prevent performance issues
 * - The cursor from the first page correctly continues to unpinned posts
 * 
 * @param paginationOpts - Pagination options (cursor, numItems)
 * @param categoryId - Optional category filter
 * @param sortBy - Sort order: "newest", "popular", or "trending"
 * @param freeOnly - If true, only returns free posts
 * @returns Paginated results with posts and continuation cursor
 * 
 * @example
 * ```typescript
 * const { results, status, loadMore } = usePaginatedQuery(
 *   api.posts.getPostsPaginated,
 *   { categoryId: "cat123", sortBy: "popular" },
 *   { initialNumItems: 20 }
 * );
 * ```
 */
export const getPostsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    categoryId: v.optional(v.id("categories")),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("popular"), v.literal("trending"))),
    freeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { paginationOpts, categoryId, sortBy = "newest", freeOnly = false }) => {
    // For the first page, we need to include pinned posts
    const isFirstPage = !paginationOpts.cursor;
    let pinnedPosts: Doc<"posts">[] = [];
    
    if (isFirstPage) {
      // Get pinned posts logic (same as getPosts)
      if (categoryId) {
        // Get category-specific pinned posts
        pinnedPosts = await ctx.db
          .query("posts")
          .withIndex("by_pinned_and_category")
          .filter(q =>
            q.and(
              q.eq(q.field("isPinned"), true),
              q.eq(q.field("categoryId"), categoryId),
              q.eq(q.field("status"), "active"),
              q.or(
                q.eq(q.field("pinScope"), "category"),
                q.eq(q.field("pinScope"), "both")
              )
            )
          )
          .order("desc")
          .collect();
      } else {
        // Get globally pinned posts for "all posts" view
        pinnedPosts = await ctx.db
          .query("posts")
          .withIndex("by_pinned_global")
          .filter(q =>
            q.and(
              q.eq(q.field("isPinned"), true),
              q.eq(q.field("status"), "active"),
              q.or(
                q.eq(q.field("pinScope"), "global"),
                q.eq(q.field("pinScope"), "both")
              )
            )
          )
          .order("desc")
          .collect();
      }

      // Sort pinned posts by pinnedAt timestamp (newest first)
      pinnedPosts.sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));
      
      // Limit pinned posts to prevent performance issues
      // If there are more than 20 pinned posts, only show the 20 most recent
      if (pinnedPosts.length > 20) {
        console.warn(`Limiting pinned posts from ${pinnedPosts.length} to 20 for performance`);
        pinnedPosts = pinnedPosts.slice(0, 20);
      }

      // Apply free-only filter to pinned posts if requested
      if (freeOnly) {
        pinnedPosts = pinnedPosts.filter(post => post.isFree === true);
      }
    }

    // Build the query for regular posts
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

    // Filter active, non-pinned posts
    let regularPostsQuery = query
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.or(
            q.eq(q.field("isPinned"), false),
            q.eq(q.field("isPinned"), undefined)
          )
        )
      );

    // Apply free-only filter if requested
    if (freeOnly) {
      regularPostsQuery = regularPostsQuery.filter((q) => q.eq(q.field("isFree"), true));
    }

    // Get paginated results
    const paginatedResults = await regularPostsQuery
      .order("desc") // All our indexes are designed for descending order
      .paginate(paginationOpts);

    // Combine pinned posts with paginated results for the first page
    let allPosts = paginatedResults.page;
    let continueCursor = paginatedResults.continueCursor;
    
    if (isFirstPage && pinnedPosts.length > 0) {
      // For the first page, prepend pinned posts to the regular posts
      // We don't adjust the cursor or pagination - we simply add pinned posts on top
      // This means the first page might have more items than requested, but maintains cursor integrity
      allPosts = [...pinnedPosts, ...paginatedResults.page];
      
      // Safety limit: If we have too many items (e.g., more than 100), warn in console
      // This prevents memory issues if someone pins hundreds of posts
      if (allPosts.length > 100) {
        console.warn(`Warning: First page has ${allPosts.length} posts (${pinnedPosts.length} pinned). Consider limiting pinned posts.`);
      }
    }

    // Collect unique member and category IDs
    const memberIds = Array.from(new Set(allPosts.map(post => post.memberId)));
    const categoryIds = Array.from(new Set(allPosts.map(post => post.categoryId)));

    // Fetch all members and categories in parallel
    const [members, categories] = await Promise.all([
      Promise.all(memberIds.map(id => ctx.db.get(id) as Promise<Doc<"members"> | null>)),
      Promise.all(categoryIds.map(id => ctx.db.get(id) as Promise<Doc<"categories"> | null>))
    ]);

    // Create lookup maps for fast access
    const memberMap = new Map(
      members.map((member, index) => [memberIds[index], member])
    );
    const categoryMap = new Map(
      categories.map((category, index) => [categoryIds[index], category])
    );

    // Enrich posts with member and category data
    const enrichedPosts = allPosts.map((post) => {
      const member = memberMap.get(post.memberId);
      const category = categoryMap.get(post.categoryId);

      return {
        ...post,
        member: member ? {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          username: member.email.split('@')[0], // Derive username from email
          slug: member.slug || "",
          avatarUrl: member.avatarUrl || null,
        } : null,
        category: category ? {
          _id: category._id,
          name: category.name,
          displayName: category.displayName,
          icon: category.icon,
        } : null,
      };
    });

    return {
      ...paginatedResults,
      page: enrichedPosts,
      continueCursor: continueCursor
    };
  },
});

/**
 * Retrieves a single post by ID with complete details and related data.
 * 
 * Returns full post information including author profile, category details,
 * and all metadata. Used for post detail pages and editing interfaces.
 * Only returns active posts - deleted or hidden posts return null.
 * 
 * This function implements content access control based on user authentication:
 * - Authenticated users with active memberships see full content
 * - Unauthenticated or inactive users see truncated content (50 chars preview)
 * - The `isPaywalled` flag indicates whether content was truncated
 * - `fullContentRequiresTier` specifies the required membership level for full access
 * 
 * @param postId - Unique identifier of the post to retrieve
 * @returns Complete post object with member and category data, or null if not found/inactive
 *          Returns paywalled version with truncated content for users without access
 * 
 * @example
 * ```typescript
 * const post = await getPostById({ postId: "post123" });
 * if (post) {
 *   if (post.isPaywalled) {
 *     console.log("Content preview:", post.content); // Truncated to 50 chars
 *     console.log("Requires tier:", post.fullContentRequiresTier); // "member"
 *   } else {
 *     console.log("Full content:", post.content);
 *   }
 * }
 * ```
 */
export const getPostById = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "active") {
      return null;
    }

    // Get the authenticated member to check access
    // Uses getAuthenticatedMemberOrNull to allow both authenticated and unauthenticated access
    const currentMember = await getAuthenticatedMemberOrNull(ctx);
    // Check if the user has an active membership tier that grants full content access
    const hasFullAccess = canViewFullContent(currentMember);

    // Get member and category data
    const [member, category] = await Promise.all([
      ctx.db.get(post.memberId),
      ctx.db.get(post.categoryId),
    ]);

    // If user doesn't have full access, return paywalled version
    if (!hasFullAccess) {
      // Truncate content to a preview length to encourage membership signup
      const PREVIEW_LENGTH = 50;
      const preview = post.content.substring(0, PREVIEW_LENGTH);
      const needsEllipsis = post.content.length > PREVIEW_LENGTH;

      return {
        ...post,
        content: needsEllipsis ? preview + "..." : preview,
        // Flag to indicate the content has been truncated due to access restrictions
        isPaywalled: true,
        // Specify which membership tier is required for full content access
        fullContentRequiresTier: "member",
        member: member ? {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          username: member.email.split('@')[0],
          bio: member.bio,
          location: member.location,
          linkGithub: member.linkGithub,
          linkX: member.linkX,
          linkYouTube: member.linkYouTube,
          slug: member.slug || "",
          avatarUrl: member.avatarUrl,
        } : null,
        category: category ? {
          _id: category._id,
          name: category.name,
          displayName: category.displayName,
          description: category.description,
          icon: category.icon,
        } : null,
      };
    }

    // Full access - return complete post
    return {
      ...post,
      // No paywall - user has full access to content
      isPaywalled: false,
      member: member ? {
        _id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        username: member.email.split('@')[0],
        bio: member.bio,
        location: member.location,
        linkGithub: member.linkGithub,
        linkX: member.linkX,
        linkYouTube: member.linkYouTube,
        slug: member.slug || "",
        avatarUrl: member.avatarUrl,
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

/**
 * Retrieves a single post by its URL slug with complete details.
 * 
 * Used for SEO-friendly URLs and post routing. Returns the same detailed
 * information as getPostById but queries by slug instead of ID.
 * Essential for public post URLs and social sharing.
 * 
 * This function implements the same content access control as getPostById:
 * - Authenticated users with active memberships see full content
 * - Unauthenticated or inactive users see truncated content (50 chars preview)
 * - The `isPaywalled` flag indicates whether content was truncated
 * - `fullContentRequiresTier` specifies the required membership level for full access
 * 
 * @param slug - URL-friendly post identifier
 * @returns Complete post object with member and category data, or null if not found
 *          Returns paywalled version with truncated content for users without access
 * 
 * @example
 * ```typescript
 * const post = await getPostBySlug({ slug: "my-awesome-post" });
 * if (post) {
 *   if (post.isPaywalled) {
 *     console.log("Content preview:", post.content); // Truncated to 50 chars
 *     console.log("Requires tier:", post.fullContentRequiresTier); // "member"
 *   } else {
 *     console.log("Full content:", post.content);
 *   }
 * }
 * // Used in: /category/posts/my-awesome-post
 * ```
 */
export const getPostBySlug = query({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (ctx, { slug }) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!post) {
      return null;
    }

    // Get the authenticated member to check access
    const currentMember = await getAuthenticatedMemberOrNull(ctx);
    const hasFullAccess = canViewFullContent(currentMember);

    // Get member and category data
    const [member, category] = await Promise.all([
      ctx.db.get(post.memberId),
      ctx.db.get(post.categoryId),
    ]);

    // If user doesn't have full access, return paywalled version
    if (!hasFullAccess) {
      const PREVIEW_LENGTH = 50;
      const preview = post.content.substring(0, PREVIEW_LENGTH);
      const needsEllipsis = post.content.length > PREVIEW_LENGTH;

      return {
        ...post,
        content: needsEllipsis ? preview + "..." : preview,
        // Flag to indicate the content has been truncated due to access restrictions
        isPaywalled: true,
        // Specify which membership tier is required for full content access
        fullContentRequiresTier: "member",
        member: member ? {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          username: member.email.split('@')[0],
          bio: member.bio,
          location: member.location,
          linkGithub: member.linkGithub,
          linkX: member.linkX,
          linkYouTube: member.linkYouTube,
          slug: member.slug || "",
          avatarUrl: member.avatarUrl,
        } : null,
        category: category ? {
          _id: category._id,
          name: category.name,
          displayName: category.displayName,
          description: category.description,
          icon: category.icon,
        } : null,
      };
    }

    // Full access - return complete post
    return {
      ...post,
      // No paywall - user has full access to content
      isPaywalled: false,
      member: member ? {
        _id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        username: member.email.split('@')[0],
        bio: member.bio,
        location: member.location,
        linkGithub: member.linkGithub,
        linkX: member.linkX,
        linkYouTube: member.linkYouTube,
        slug: member.slug || "",
        avatarUrl: member.avatarUrl,
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

/**
 * Creates a new post with rich content support and validation.
 * 
 * Handles creation of posts with various content types including text, images,
 * videos, links, and multi-media attachments. Performs content validation,
 * URL safety checks, and generates unique slugs. Also handles mention
 * notifications and category post count updates.
 * 
 * @param title - Post title/headline
 * @param content - Post body content (markdown supported)
 * @param categoryId - Category to post in
 * @param type - Content type: "text", "image", "video", "link"
 * @param mediaUrl - Primary media URL for legacy compatibility
 * @param thumbnailUrl - Thumbnail/preview image URL
 * @param aspectRatio - Media aspect ratio for layout
 * @param mediaWidth - Original media width in pixels
 * @param mediaHeight - Original media height in pixels
 * @param linkUrl - Shared link URL for link posts
 * @param linkTitle - Extracted link title
 * @param linkDescription - Extracted link description
 * @param linkImage - Link preview image URL
 * @param mentions - Array of mentioned member IDs
 * @param attachments - Array of multimedia attachments with metadata
 * @returns Object with created post ID and slug
 * 
 * @example
 * ```typescript
 * const result = await createPost({
 *   title: "Check out this amazing tool!",
 *   content: "I found this great resource for learning AI...",
 *   categoryId: "workflows-category-id",
 *   type: "link",
 *   linkUrl: "https://example.com",
 *   mentions: ["user123"]
 * });
 * console.log(`Created post: ${result.slug}`);
 * ```
 */
export const createPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    categoryId: v.id("categories"),
    type: v.optional(v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("link"))),
    mediaUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    aspectRatio: v.optional(v.number()),
    mediaWidth: v.optional(v.number()),
    mediaHeight: v.optional(v.number()),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    linkDescription: v.optional(v.string()),
    linkImage: v.optional(v.string()),
    mentions: v.optional(v.array(v.id("members"))),
    preview: v.optional(v.string()),
    // Multi-attachment support
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      type: v.union(v.literal("image"), v.literal("video"), v.literal("pdf"), v.literal("youtube")),
      url: v.string(),
      thumbnailUrl: v.optional(v.string()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      aspectRatio: v.optional(v.number()),
      order: v.number(),
      // PDF specific
      pageCount: v.optional(v.number()),
      fileSize: v.optional(v.number()),
      // YouTube specific
      videoId: v.optional(v.string()),
      title: v.optional(v.string()),
      duration: v.optional(v.string()),
      channelName: v.optional(v.string()),
      // Video specific
      videoDuration: v.optional(v.string()),
      format: v.optional(v.string()),
      resolution: v.optional(v.string()),
      codec: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    // Verify category exists and is active
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.status !== "active") {
      throw new Error("Invalid category");
    }

    // Validate URLs in content for security
    validateContentUrls(args.content);

    // Process attachments and determine legacy fields from first attachment
    let resolvedType = args.type || "text";
    let resolvedMediaUrl = args.mediaUrl;
    let resolvedThumbnailUrl = args.thumbnailUrl;
    let resolvedAspectRatio = args.aspectRatio;
    let resolvedMediaWidth = args.mediaWidth;
    let resolvedMediaHeight = args.mediaHeight;

    if (args.attachments && args.attachments.length > 0) {
      // Set legacy fields from first attachment for backward compatibility
      const firstAttachment = args.attachments[0];

      // Map attachment type to post type
      if (firstAttachment.type === "image") {
        resolvedType = "image";
      } else if (firstAttachment.type === "video") {
        resolvedType = "video";
      } else if (firstAttachment.type === "youtube") {
        resolvedType = "video"; // YouTube embeds are treated as video posts
      }
      // PDF doesn't map to a specific post type, keep as is

      resolvedMediaUrl = resolvedMediaUrl || firstAttachment.url;
      resolvedThumbnailUrl = resolvedThumbnailUrl || firstAttachment.thumbnailUrl;
      resolvedAspectRatio = resolvedAspectRatio || firstAttachment.aspectRatio;
      resolvedMediaWidth = resolvedMediaWidth || firstAttachment.width;
      resolvedMediaHeight = resolvedMediaHeight || firstAttachment.height;
    }

    // Validate type-specific requirements
    const postType = resolvedType;
    if (postType === "image" && !resolvedMediaUrl) {
      throw new Error("Image posts require a media URL");
    }
    if (postType === "video" && !resolvedMediaUrl) {
      throw new Error("Video posts require a media URL");
    }
    if (postType === "link" && !args.linkUrl) {
      throw new Error("Link posts require a link URL");
    }

    // Generate unique slug
    const baseSlug = generateSlug(args.title);
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
      title: args.title.trim(),
      content: args.content.trim(),
      slug,
      createdAt: now,
      updatedAt: now,
      memberId: member._id,
      categoryId: args.categoryId,
      status: "active",
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      commentCount: 0,
      viewCount: 0,
      isPinned: false,
      isLocked: false,
      // New media/link fields
      type: resolvedType,
      mediaUrl: resolvedMediaUrl,
      thumbnailUrl: resolvedThumbnailUrl,
      aspectRatio: resolvedAspectRatio,
      mediaWidth: resolvedMediaWidth,
      mediaHeight: resolvedMediaHeight,
      linkUrl: args.linkUrl,
      linkTitle: args.linkTitle,
      linkDescription: args.linkDescription,
      linkImage: args.linkImage,
      mentions: args.mentions,
      // Multi-attachment support
      attachments: args.attachments,
      // Free content and preview
      preview: args.preview || "", // Use provided preview or empty string
      isFree: false, // Default to paywalled
    });

    // Update category post count
    await ctx.db.patch(args.categoryId, {
      postCount: (category.postCount || 0) + 1,
      updatedAt: now,
    });

    // Schedule preview generation if not provided
    if (!args.preview || args.preview.trim() === "") {
      await ctx.scheduler.runAfter(
        0,
        api.previewGeneration.generateAndUpdatePostPreview,
        {
          postId,
          title: args.title.trim(),
          content: args.content.trim()
        }
      );
    }

    // Create mention notifications
    try {
      if (args.mentions && args.mentions.length > 0) {
        for (const mentionedMemberId of args.mentions) {
          // Skip if mentioning self
          if (mentionedMemberId === member._id) continue;

          // Verify the mentioned member exists
          const mentionedMember = await ctx.db.get(mentionedMemberId);
          if (mentionedMember) {
            await insertNotification(ctx, {
              recipientId: mentionedMemberId,
              type: "mention",
              entityType: "post",
              entityId: postId,
              actorId: member._id,
              message: `${member.firstName} ${member.lastName} mentioned you in a post`,
            });
          }
        }
      }
    } catch (error) {
      // Log notification errors but don't fail the post creation
      console.error("Failed to create notifications for post:", error);
    }

    return { postId, slug };
  },
});

// Update post (edit) - DEPRECATED, use editPost instead
export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    editReason: v.optional(v.string()),
    type: v.optional(v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("link"))),
    mediaUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    aspectRatio: v.optional(v.number()),
    mediaWidth: v.optional(v.number()),
    mediaHeight: v.optional(v.number()),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    linkDescription: v.optional(v.string()),
    linkImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if user is the author
    if (!isPostAuthor(post, member._id)) {
      throw new Error("Only the author can edit this post");
    }

    // Validate type-specific requirements
    const postType = args.type || post.type || "text";
    if (postType === "image" && args.mediaUrl === "") {
      throw new Error("Image posts require a media URL");
    }
    if (postType === "video" && args.mediaUrl === "") {
      throw new Error("Video posts require a media URL");
    }
    if (postType === "link" && args.linkUrl === "") {
      throw new Error("Link posts require a link URL");
    }

    const now = Date.now();
    const updates: {
      updatedAt: number;
      editedAt: number;
      title?: string;
      content?: string;
      slug?: string;
      editReason?: string;
      type?: "text" | "image" | "video" | "link" | "poll";
      mediaUrl?: string;
      thumbnailUrl?: string;
      aspectRatio?: number;
      mediaWidth?: number;
      mediaHeight?: number;
      linkUrl?: string;
      linkTitle?: string;
      linkDescription?: string;
      linkImage?: string;
    } = {
      updatedAt: now,
      editedAt: now,
    };

    // If title is being updated, regenerate slug
    if (args.title !== undefined) {
      updates.title = args.title.trim();

      // Generate new slug from updated title
      const baseSlug = generateSlug(args.title);
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_slug")
        .filter((q) => q.neq(q.field("_id"), args.postId)) // Exclude current post
        .collect();
      const existingSlugs = posts
        .map(p => p.slug)
        .filter((slug): slug is string => slug !== undefined);
      updates.slug = ensureUniqueSlug(baseSlug, existingSlugs);
    }

    if (args.content !== undefined) {
      updates.content = args.content.trim();
    }
    if (args.editReason !== undefined) {
      updates.editReason = args.editReason.trim();
    }

    // Handle media/link field updates
    if (args.type !== undefined) {
      updates.type = args.type;
    }
    if (args.mediaUrl !== undefined) {
      updates.mediaUrl = args.mediaUrl;
    }
    if (args.thumbnailUrl !== undefined) {
      updates.thumbnailUrl = args.thumbnailUrl;
    }
    if (args.aspectRatio !== undefined) {
      updates.aspectRatio = args.aspectRatio;
    }
    if (args.mediaWidth !== undefined) {
      updates.mediaWidth = args.mediaWidth;
    }
    if (args.mediaHeight !== undefined) {
      updates.mediaHeight = args.mediaHeight;
    }
    if (args.linkUrl !== undefined) {
      updates.linkUrl = args.linkUrl;
    }
    if (args.linkTitle !== undefined) {
      updates.linkTitle = args.linkTitle;
    }
    if (args.linkDescription !== undefined) {
      updates.linkDescription = args.linkDescription;
    }
    if (args.linkImage !== undefined) {
      updates.linkImage = args.linkImage;
    }

    await ctx.db.patch(args.postId, updates);
    return args.postId;
  },
});

// Edit post mutation with version history
export const editPost = mutation({
  args: {
    postId: v.id("posts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    editReason: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    type: v.optional(v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("link"))),
    mediaUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    aspectRatio: v.optional(v.number()),
    mediaWidth: v.optional(v.number()),
    mediaHeight: v.optional(v.number()),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    linkDescription: v.optional(v.string()),
    linkImage: v.optional(v.string()),
    // Multi-attachment support
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      type: v.union(v.literal("image"), v.literal("video"), v.literal("pdf"), v.literal("youtube")),
      url: v.string(),
      thumbnailUrl: v.optional(v.string()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      aspectRatio: v.optional(v.number()),
      order: v.number(),
      // PDF specific
      pageCount: v.optional(v.number()),
      fileSize: v.optional(v.number()),
      // YouTube specific
      videoId: v.optional(v.string()),
      title: v.optional(v.string()),
      duration: v.optional(v.string()),
      channelName: v.optional(v.string()),
      // Video specific
      videoDuration: v.optional(v.string()),
      format: v.optional(v.string()),
      resolution: v.optional(v.string()),
      codec: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if user is the author
    if (!isPostAuthor(post, member._id)) {
      throw new Error("Only the author can edit this post");
    }

    // Process attachments and determine legacy fields from first attachment
    let resolvedType = args.type ?? post.type ?? "text";
    let resolvedMediaUrl = args.mediaUrl;
    let resolvedThumbnailUrl = args.thumbnailUrl;
    let resolvedAspectRatio = args.aspectRatio;
    let resolvedMediaWidth = args.mediaWidth;
    let resolvedMediaHeight = args.mediaHeight;

    if (args.attachments && args.attachments.length > 0) {
      // Set legacy fields from first attachment for backward compatibility
      const firstAttachment = args.attachments[0];

      // Map attachment type to post type
      if (firstAttachment.type === "image") {
        resolvedType = "image";
      } else if (firstAttachment.type === "video") {
        resolvedType = "video";
      } else if (firstAttachment.type === "youtube") {
        resolvedType = "video"; // YouTube embeds are treated as video posts
      }
      // PDF doesn't map to a specific post type, keep as is

      // Only override if not explicitly provided
      resolvedMediaUrl = args.mediaUrl !== undefined ? args.mediaUrl : firstAttachment.url;
      resolvedThumbnailUrl = args.thumbnailUrl !== undefined ? args.thumbnailUrl : firstAttachment.thumbnailUrl;
      resolvedAspectRatio = args.aspectRatio !== undefined ? args.aspectRatio : firstAttachment.aspectRatio;
      resolvedMediaWidth = args.mediaWidth !== undefined ? args.mediaWidth : firstAttachment.width;
      resolvedMediaHeight = args.mediaHeight !== undefined ? args.mediaHeight : firstAttachment.height;
    }

    // Validate type-specific requirements
    const postType = resolvedType;
    if (postType === "image" && resolvedMediaUrl === "") {
      throw new Error("Image posts require a media URL");
    }
    if (postType === "video" && resolvedMediaUrl === "") {
      throw new Error("Video posts require a media URL");
    }
    if (postType === "link" && args.linkUrl === "") {
      throw new Error("Link posts require a link URL");
    }

    // Get the next version number
    const versions = await ctx.db
      .query("post_versions")
      .withIndex("by_post_and_version", (q) => q.eq("postId", args.postId))
      .order("desc")
      .first();
    const nextVersion = (versions?.version ?? 0) + 1;

    // Save current state to version history
    await ctx.db.insert("post_versions", {
      postId: args.postId,
      version: nextVersion,
      title: post.title,
      content: post.content,
      editorId: member._id,
      editedAt: Date.now(),
      editReason: args.editReason,
      // Preserve media/link fields
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
      // Preserve attachments
      attachments: post.attachments,
    });

    const now = Date.now();
    const updates: {
      updatedAt: number;
      editedAt: number;
      title?: string;
      content?: string;
      slug?: string;
      editReason?: string;
      type?: "text" | "image" | "video" | "link" | "poll";
      mediaUrl?: string;
      thumbnailUrl?: string;
      aspectRatio?: number;
      mediaWidth?: number;
      mediaHeight?: number;
      linkUrl?: string;
      linkTitle?: string;
      linkDescription?: string;
      linkImage?: string;
      categoryId?: Id<"categories">;
      attachments?: Array<{
        id: string;
        type: "image" | "video" | "pdf" | "youtube";
        url: string;
        thumbnailUrl?: string;
        width?: number;
        height?: number;
        aspectRatio?: number;
        order: number;
        pageCount?: number;
        fileSize?: number;
        videoId?: string;
        title?: string;
        duration?: string;
        channelName?: string;
        videoDuration?: string;
        format?: string;
        resolution?: string;
        codec?: string;
      }>;
    } = {
      updatedAt: now,
      editedAt: now,
    };

    // If title is being updated, regenerate slug
    if (args.title !== undefined) {
      updates.title = args.title.trim();

      // Generate new slug from updated title
      const baseSlug = generateSlug(args.title);
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_slug")
        .filter((q) => q.neq(q.field("_id"), args.postId)) // Exclude current post
        .collect();
      const existingSlugs = posts
        .map(p => p.slug)
        .filter((slug): slug is string => slug !== undefined);
      updates.slug = ensureUniqueSlug(baseSlug, existingSlugs);
    }

    if (args.content !== undefined) {
      updates.content = args.content.trim();
    }
    if (args.editReason !== undefined) {
      updates.editReason = args.editReason.trim();
    }

    // Handle media/link field updates
    if (args.type !== undefined || resolvedType !== post.type) {
      updates.type = resolvedType;
    }
    if (args.mediaUrl !== undefined || resolvedMediaUrl !== post.mediaUrl) {
      updates.mediaUrl = resolvedMediaUrl;
    }
    if (args.thumbnailUrl !== undefined || resolvedThumbnailUrl !== post.thumbnailUrl) {
      updates.thumbnailUrl = resolvedThumbnailUrl;
    }
    if (args.aspectRatio !== undefined || resolvedAspectRatio !== post.aspectRatio) {
      updates.aspectRatio = resolvedAspectRatio;
    }
    if (args.mediaWidth !== undefined || resolvedMediaWidth !== post.mediaWidth) {
      updates.mediaWidth = resolvedMediaWidth;
    }
    if (args.mediaHeight !== undefined || resolvedMediaHeight !== post.mediaHeight) {
      updates.mediaHeight = resolvedMediaHeight;
    }
    if (args.linkUrl !== undefined) {
      updates.linkUrl = args.linkUrl;
    }
    if (args.linkTitle !== undefined) {
      updates.linkTitle = args.linkTitle;
    }
    if (args.linkDescription !== undefined) {
      updates.linkDescription = args.linkDescription;
    }
    if (args.linkImage !== undefined) {
      updates.linkImage = args.linkImage;
    }

    // Handle attachments update
    if (args.attachments !== undefined) {
      updates.attachments = args.attachments;
    }

    // Handle category change
    if (args.categoryId !== undefined && args.categoryId !== post.categoryId) {
      // Validate category
      const newCategory = await ctx.db.get(args.categoryId);
      if (!newCategory || newCategory.status !== "active") {
        throw new Error("Invalid category");
      }

      // Update category post counts
      const oldCategory = await ctx.db.get(post.categoryId);
      if (oldCategory) {
        await ctx.db.patch(oldCategory._id, {
          postCount: Math.max(0, (oldCategory.postCount || 0) - 1),
          updatedAt: now,
        });
      }
      await ctx.db.patch(args.categoryId, {
        postCount: (newCategory.postCount || 0) + 1,
        updatedAt: now,
      });

      updates.categoryId = args.categoryId;
    }

    await ctx.db.patch(args.postId, updates);

    // Return the updated post data including the new slug
    const updatedPost = await ctx.db.get(args.postId);
    if (!updatedPost) {
      throw new Error("Failed to retrieve updated post");
    }

    // Schedule preview regeneration if title or content changed
    if ((args.title !== undefined || args.content !== undefined) && (!updatedPost.preview || updatedPost.preview.trim() === "")) {
      await ctx.scheduler.runAfter(
        0,
        api.previewGeneration.generateAndUpdatePostPreview,
        {
          postId: args.postId,
          title: updatedPost.title,
          content: updatedPost.content
        }
      );
    }

    // Get the category for the URL (use updated category if changed)
    const category = await ctx.db.get(updatedPost.categoryId);

    return {
      _id: updatedPost._id,
      slug: updatedPost.slug,
      title: updatedPost.title,
      categoryName: category?.name
    };
  },
});

/**
 * Soft deletes a post by changing its status to "deleted".
 * 
 * Only the post author can delete their own posts. The post data is preserved
 * but hidden from public view. Updates the category post count and maintains
 * referential integrity for comments and other related data.
 * 
 * @param postId - ID of the post to delete
 * @returns The ID of the deleted post
 * @throws Error if user is not the post author or post not found
 * 
 * @example
 * ```typescript
 * await deletePost({ postId: "post123" });
 * // Post is now hidden but data preserved
 * ```
 */
export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    // Get authenticated member using unified helper
    const member = await getAuthenticatedMember(ctx);

    const post = await ctx.db.get(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if user is the author
    if (!isPostAuthor(post, member._id)) {
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

/**
 * Records a post view for analytics and engagement tracking.
 * 
 * Implements deduplication logic to prevent inflated view counts from the same
 * user within 24 hours. Supports both authenticated and anonymous users.
 * Used for trending algorithms and content performance metrics.
 * 
 * @param postId - ID of the post being viewed
 * @param ipAddress - IP address for anonymous user deduplication
 * @param userAgent - Browser user agent for analytics
 * @returns Object indicating whether a new view was recorded
 * 
 * @example
 * ```typescript
 * const result = await trackPostView({
 *   postId: "post123",
 *   ipAddress: "192.168.1.1",
 *   userAgent: "Mozilla/5.0..."
 * });
 * console.log(`New view recorded: ${result.viewRecorded}`);
 * ```
 */
export const canUserViewPost = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) {
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

    return canViewPost(member, post);
  },
});

export const trackPostView = mutation({
  args: {
    postId: v.id("posts"),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, { postId, ipAddress, userAgent }) => {
    let userId: Id<"members"> | undefined;

    // Optional auth - get member if authenticated
    try {
      const member = await getAuthenticatedMember(ctx);
      userId = member._id;
    } catch {
      // Not authenticated - that's fine for view tracking
      userId = undefined;
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

    // Search titles
    const titleQuery = ctx.db
      .query("posts")
      .withSearchIndex("search_posts", (q) => {
        let query = q.search("title", searchTerm).eq("status", "active");
        if (categoryId) {
          query = query.eq("categoryId", categoryId);
        }
        return query;
      });

    let posts = await titleQuery.take(limit);

    // Also search content if requested
    if (includeContent) {
      const contentQuery = ctx.db
        .query("posts")
        .withSearchIndex("search_posts_content", (q) => {
          let query = q.search("content", searchTerm).eq("status", "active");
          if (categoryId) {
            query = query.eq("categoryId", categoryId);
          }
          return query;
        });

      const contentPosts = await contentQuery.take(limit);

      // Dedupe by ID, preferring title matches
      const seenIds = new Set(posts.map(p => p._id));
      const uniqueContentPosts = contentPosts.filter(p => !seenIds.has(p._id));
      posts = [...posts, ...uniqueContentPosts].slice(0, limit);
    }

    // Enrich with member and category data
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const [member, category] = await Promise.all([
          ctx.db.get(post.memberId),
          ctx.db.get(post.categoryId),
        ]);

        return {
          ...post,
          member: member ? {
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            username: member.email.split('@')[0],
            slug: member.slug || "",
            avatarUrl: member.avatarUrl || null,
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

// Get posts by author (renamed to getPostsByMember for consistency)
export const getPostsByMember = query({
  args: {
    memberId: v.id("members"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { memberId, limit = 10 }) => {
    // Use new unified index
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_member_and_createdAt", (q) => q.eq("memberId", memberId))
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

/**
 * Pins a post to the top of its category or globally for admin visibility.
 * 
 * Only administrators can pin posts. Enforces limits of 3 pinned posts per
 * category and 3 globally pinned posts. Posts can be pinned in their category,
 * globally, or both simultaneously.
 * 
 * @param postId - ID of the post to pin
 * @param scope - Pin scope: "category", "global", or "both"
 * @returns Success indicator
 * @throws Error if user is not admin, limits exceeded, or post not found
 * 
 * @example
 * ```typescript
 * await pinPost({ 
 *   postId: "post123", 
 *   scope: "category" 
 * });
 * // Post now appears at top of its category
 * ```
 */
export const pinPost = mutation({
  args: {
    postId: v.id("posts"),
    scope: v.union(v.literal("category"), v.literal("global"), v.literal("both"))
  },
  handler: async (ctx, { postId, scope }) => {
    // Get authenticated member and verify admin
    const member = await getAuthenticatedMember(ctx);
    if (member.role !== "admin") {
      throw new Error("Only admins can pin posts");
    }

    const post = await ctx.db.get(postId);
    if (!post || post.status !== "active") {
      throw new Error("Post not found or not active");
    }

    // Check pinning limits based on scope
    if (scope === "category" || scope === "both") {
      const categoryPinnedPosts = await ctx.db
        .query("posts")
        .withIndex("by_pinned_and_category")
        .filter(q =>
          q.and(
            q.eq(q.field("isPinned"), true),
            q.eq(q.field("categoryId"), post.categoryId),
            q.eq(q.field("status"), "active"),
            q.neq(q.field("_id"), postId) // Exclude current post if already pinned
          )
        )
        .collect();

      const categoryPinnedCount = categoryPinnedPosts.filter(p =>
        p.pinScope === "category" || p.pinScope === "both"
      ).length;

      if (categoryPinnedCount >= 3) {
        throw new Error("Maximum 3 posts can be pinned per category");
      }
    }

    if (scope === "global" || scope === "both") {
      const globalPinnedPosts = await ctx.db
        .query("posts")
        .withIndex("by_pinned_global")
        .filter(q =>
          q.and(
            q.eq(q.field("isPinned"), true),
            q.eq(q.field("status"), "active"),
            q.neq(q.field("_id"), postId) // Exclude current post if already pinned
          )
        )
        .collect();

      const globalPinnedCount = globalPinnedPosts.filter(p =>
        p.pinScope === "global" || p.pinScope === "both"
      ).length;

      if (globalPinnedCount >= 3) {
        throw new Error("Maximum 3 posts can be pinned globally");
      }
    }

    // Pin the post
    await ctx.db.patch(postId, {
      isPinned: true,
      pinScope: scope,
      pinnedAt: Date.now(),
      pinnedBy: member._id,
      updatedAt: Date.now()
    });

    return { success: true };
  }
});

/**
 * Unpins a previously pinned post, removing it from top placement.
 * 
 * Only administrators can unpin posts. Removes all pin metadata and returns
 * the post to normal chronological or popularity-based sorting.
 * 
 * @param postId - ID of the post to unpin
 * @returns Success indicator
 * @throws Error if user is not admin or post not found
 * 
 * @example
 * ```typescript
 * await unpinPost({ postId: "post123" });
 * // Post returns to normal sort order
 * ```
 */
export const unpinPost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    // Get authenticated member and verify admin
    const member = await getAuthenticatedMember(ctx);
    if (member.role !== "admin") {
      throw new Error("Only admins can unpin posts");
    }

    const post = await ctx.db.get(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Unpin the post
    await ctx.db.patch(postId, {
      isPinned: false,
      pinScope: undefined,
      pinnedAt: undefined,
      pinnedBy: undefined,
      updatedAt: Date.now()
    });

    return { success: true };
  }
});

/**
 * Internal query to get all posts for migration scripts
 * Only accessible from backend scripts, not from clients
 */
export const getAllPostsForMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

/**
 * Internal mutation to update a post's preview
 * Used by the batch preview generation script
 */
export const updatePostPreview = internalMutation({
  args: {
    postId: v.id("posts"),
    preview: v.string(),
  },
  handler: async (ctx, { postId, preview }) => {
    const post = await ctx.db.get(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    await ctx.db.patch(postId, {
      preview,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get post routing information for navigation
 * 
 * Lightweight query that returns only the URL components needed for navigation.
 * Used by the success page to redirect back to the original post after purchase.
 * 
 * @param postId - ID of the post to get routing info for
 * @returns Object with category name and post slug, or null if post not found
 * 
 * @example
 * ```typescript
 * const routing = await getPostRouting({ postId: "post123" });
 * if (routing) {
 *   router.push(`/${routing.categoryName}/${routing.slug}`);
 * }
 * ```
 */
export const getPostRouting = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "active") {
      return null;
    }

    const category = await ctx.db.get(post.categoryId);
    if (!category) {
      return null;
    }

    return {
      categoryName: category.name,
      slug: post.slug,
    };
  },
});
