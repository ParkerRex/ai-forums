import { v } from "convex/values";
import { action, query } from "./_generated/server";

// Cache table for storing link preview data
// You may want to add this to your schema.ts:
// linkPreviews: defineTable({
//   url: v.string(),
//   title: v.optional(v.string()),
//   description: v.optional(v.string()),
//   image: v.optional(v.string()),
//   siteName: v.optional(v.string()),
//   fetchedAt: v.number(),
// }).index("by_url", ["url"]),

export const fetchLinkPreview = action({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, args) => {
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
          return {
            url: args.url,
            title: `YouTube Video`,
            description: "YouTube video embed",
            image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            siteName: "YouTube",
            fetchedAt: Date.now(),
            isYouTubeEmbed: true,
            youTubeVideoId: videoId,
          };
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

      return preview;
    } catch (error) {
      console.error("Failed to fetch link preview:", error);
      return {
        url: args.url,
        title: new URL(args.url).hostname,
        description: undefined,
        image: undefined,
        siteName: undefined,
        fetchedAt: Date.now(),
      };
    }
  },
});

export const getLinkPreview = query({
  args: {
    url: v.string(),
  },
  handler: async () => {
    // TODO: Check cache first
    // const cached = await ctx.db
    //   .query("linkPreviews")
    //   .withIndex("by_url", (q) => q.eq("url", args.url))
    //   .first();
    //
    // if (cached && Date.now() - cached.fetchedAt < 24 * 60 * 60 * 1000) {
    //   return cached;
    // }

    // For now, return null to trigger a fresh fetch
    return null;
  },
});
