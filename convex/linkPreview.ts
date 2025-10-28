import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Internal mutation to save link preview to cache
 * Called by fetchLinkPreview action after successfully fetching metadata
 */
export const saveLinkPreviewToCache = internalMutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    siteName: v.optional(v.string()),
    isYouTubeEmbed: v.optional(v.boolean()),
    youTubeVideoId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours from now

    // Check if cache entry already exists
    const existing = await ctx.db
      .query("linkPreviewCache")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();

    if (existing) {
      // Update existing cache entry
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        image: args.image,
        siteName: args.siteName,
        fetchedAt: now,
        expiresAt,
        isYouTubeEmbed: args.isYouTubeEmbed,
        youTubeVideoId: args.youTubeVideoId,
      });
    } else {
      // Create new cache entry
      await ctx.db.insert("linkPreviewCache", {
        url: args.url,
        title: args.title,
        description: args.description,
        image: args.image,
        siteName: args.siteName,
        fetchedAt: now,
        expiresAt,
        isYouTubeEmbed: args.isYouTubeEmbed,
        youTubeVideoId: args.youTubeVideoId,
      });
    }

    return null;
  },
});

export const fetchLinkPreview = action({
  args: {
    url: v.string(),
  },
  returns: v.object({
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    siteName: v.optional(v.string()),
    fetchedAt: v.number(),
    isYouTubeEmbed: v.optional(v.boolean()),
    youTubeVideoId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Validate URL
      const urlObj = new URL(args.url);

      const isYouTube =
        urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be");

      if (isYouTube) {
        let videoId = "";
        if (urlObj.hostname.includes("youtu.be")) {
          videoId = urlObj.pathname.slice(1);
        } else if (urlObj.searchParams.has("v")) {
          videoId = urlObj.searchParams.get("v") || "";
        }

        if (videoId) {
          const preview = {
            url: args.url,
            title: `YouTube Video`,
            description: "YouTube video embed",
            image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            siteName: "YouTube",
            fetchedAt: Date.now(),
            isYouTubeEmbed: true,
            youTubeVideoId: videoId,
          };

          // Save to cache
          await ctx.runMutation(internal.linkPreview.saveLinkPreviewToCache, {
            url: preview.url,
            title: preview.title,
            description: preview.description,
            image: preview.image,
            siteName: preview.siteName,
            isYouTubeEmbed: preview.isYouTubeEmbed,
            youTubeVideoId: preview.youTubeVideoId,
          });

          return preview;
        }
      }

      // Stub response for other links
      const preview = {
        url: args.url,
        title: `Preview for ${urlObj.hostname}`,
        description: "Link preview will be fetched here",
        image: undefined,
        siteName: urlObj.hostname,
        fetchedAt: Date.now(),
      };

      // Save stub response to cache as well
      await ctx.runMutation(internal.linkPreview.saveLinkPreviewToCache, {
        url: preview.url,
        title: preview.title,
        description: preview.description,
        image: preview.image,
        siteName: preview.siteName,
      });

      return preview;
    } catch (error) {
      console.error("Failed to fetch link preview:", error);
      const fallbackPreview = {
        url: args.url,
        title: new URL(args.url).hostname,
        description: undefined,
        image: undefined,
        siteName: undefined,
        fetchedAt: Date.now(),
      };

      // Save fallback to cache to avoid re-fetching failed URLs
      try {
        await ctx.runMutation(internal.linkPreview.saveLinkPreviewToCache, {
          url: fallbackPreview.url,
          title: fallbackPreview.title,
          description: fallbackPreview.description,
          image: fallbackPreview.image,
          siteName: fallbackPreview.siteName,
        });
      } catch (cacheError) {
        // Log but don't fail if cache save fails
        console.error("Failed to save fallback preview to cache:", cacheError);
      }

      return fallbackPreview;
    }
  },
});

/**
 * Internal mutation to clean up expired link preview cache entries
 * Called by cron job to remove stale cache data
 */
export const cleanupExpiredLinkPreviews = internalMutation({
  args: {},
  returns: v.object({
    deletedCount: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();

    // Find all expired cache entries
    const expiredEntries = await ctx.db
      .query("linkPreviewCache")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // Delete each expired entry
    for (const entry of expiredEntries) {
      await ctx.db.delete(entry._id);
    }

    return {
      deletedCount: expiredEntries.length,
    };
  },
});

export const getLinkPreview = query({
  args: {
    url: v.string(),
  },
  returns: v.union(
    v.object({
      url: v.string(),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
      fetchedAt: v.number(),
      isYouTubeEmbed: v.optional(v.boolean()),
      youTubeVideoId: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    // Check cache first for this URL
    const cached = await ctx.db
      .query("linkPreviewCache")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();

    // Return cached data if it exists and hasn't expired
    if (cached && Date.now() < cached.expiresAt) {
      return {
        url: cached.url,
        title: cached.title,
        description: cached.description,
        image: cached.image,
        siteName: cached.siteName,
        fetchedAt: cached.fetchedAt,
        isYouTubeEmbed: cached.isYouTubeEmbed,
        youTubeVideoId: cached.youTubeVideoId,
      };
    }

    // If no valid cache entry exists, return null to trigger a fresh fetch
    return null;
  },
});
