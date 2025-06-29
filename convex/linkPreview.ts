import { query, action } from "./_generated/server";
import { v } from "convex/values";

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
  handler: async (ctx, args) => {
    try {
      // Validate URL
      const urlObj = new URL(args.url);
      
      // TODO: Implement actual OpenGraph fetching
      // This would typically use a library like `node-html-parser` or `cheerio`
      // to parse the HTML and extract OG tags
      
      // Example implementation:
      // const response = await fetch(args.url, {
      //   headers: {
      //     'User-Agent': 'Mozilla/5.0 (compatible; VaiVexBot/1.0)',
      //   },
      //   signal: AbortSignal.timeout(5000), // 5 second timeout
      // });
      // 
      // const html = await response.text();
      // const root = parse(html);
      // 
      // const ogTitle = root.querySelector('meta[property="og:title"]')?.getAttribute('content');
      // const ogDescription = root.querySelector('meta[property="og:description"]')?.getAttribute('content');
      // const ogImage = root.querySelector('meta[property="og:image"]')?.getAttribute('content');
      // const ogSiteName = root.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
      
      // Stub response for development
      const preview = {
        url: args.url,
        title: `Preview for ${urlObj.hostname}`,
        description: "Link preview will be fetched here",
        image: undefined,
        siteName: urlObj.hostname,
        fetchedAt: Date.now(),
      };
      
      // TODO: Store in cache table
      // await ctx.runMutation(internal.linkPreview.storeLinkPreview, preview);
      
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