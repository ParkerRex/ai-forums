import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { generateSlug, ensureUniqueSlug } from "../lib/slug-utils";
import { getAuthenticatedMember } from "./auth";

// Helper function to check if a member is the author of a post
function isPostAuthor(post: { memberId: Id<"members"> }, memberId: Id<"members">): boolean {
  return post.memberId === memberId;
}

// Helper function to validate URLs in content
function validateContentUrls(content: string): void {
  // Match URLs and markdown links
  const urlRegex = /https?:\/\/[^\s)]+/g;
  const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  
  const urls = new Set<string>();
  
  // Extract bare URLs
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    urls.add(match[0]);
  }
  
  // Extract URLs from markdown links
  while ((match = markdownRegex.exec(content)) !== null) {
    urls.add(match[2]);
  }
  
  // Validate each URL
  for (const url of urls) {
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

// Get all posts with pagination and filtering
export const getPosts = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("popular"), v.literal("trending"))),
  },
  handler: async (ctx, { categoryId, limit = 20, sortBy = "newest" }) => {
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

    // Filter active posts and apply ordering
    const posts = await query
      .filter((q) => q.eq(q.field("status"), "active"))
      .order(sortBy === "newest" ? "desc" : "desc")
      .take(limit);

    // Enrich posts with member and category data
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
            email: member.email,
            username: member.email.split('@')[0], // Derive username from email
            slug: member.slug || "",
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

// Get single post by ID with full details
export const getPostById = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "active") {
      return null;
    }

    // Get member and category data
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

// Get single post by slug
export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
      
    if (!post) {
      return null;
    }

    // Get member and category data
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

// Create new post
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
      // Multi-attachment support
      attachments: args.attachments,
    });

    // Update category post count
    await ctx.db.patch(args.categoryId, {
      postCount: (category.postCount || 0) + 1,
      updatedAt: now,
    });

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

// Delete post (soft delete)
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

// Track post view
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseSearch = (q: any) => {
      let query = q.search("title", searchTerm).eq("status", "active");
      if (categoryId) {
        query = query.eq("categoryId", categoryId);
      }
      return query;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseContentSearch = (q: any) => {
      let query = q.search("content", searchTerm).eq("status", "active");
      if (categoryId) {
        query = query.eq("categoryId", categoryId);
      }
      return query;
    };

    // Search titles
    const titleQuery = ctx.db
      .query("posts")
      .withSearchIndex("search_posts", baseSearch);

    let posts = await titleQuery.take(limit);

    // Also search content if requested
    if (includeContent) {
      const contentQuery = ctx.db
        .query("posts")
        .withSearchIndex("search_posts_content", baseContentSearch);
      
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