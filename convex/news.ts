import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

export const fetchAINews = action({
  args: {
    categories: v.optional(v.array(v.string())),
    customSources: v.optional(
      v.array(
        v.object({
          type: v.union(v.literal("repository"), v.literal("website")),
          url: v.string(),
          name: v.string(),
        }),
      ),
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      title: v.string(),
      url: v.string(),
      publishedDate: v.optional(v.string()),
      author: v.optional(v.string()),
      summary: v.optional(v.string()),
      source: v.string(),
    }),
  ),
  handler: async (_ctx, args) => {
    const limit = args.limit || 10;
    const results = [];

    try {
      const defaultQuery = "latest AI developments machine learning artificial intelligence";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CONVEX_URL?.replace("convex.cloud", "vercel.app") || "http://localhost:3000"}/api/news`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: defaultQuery,
            numResults: Math.ceil(limit * 0.7),
          }),
        },
      );

      if (response.ok) {
        const defaultNews = await response.json();
        for (const item of defaultNews.results || []) {
          results.push({
            title: item.title,
            url: item.url,
            publishedDate: item.publishedDate,
            author: item.author,
            summary: item.summary,
            source: "AI News",
          });
        }
      }

      if (args.customSources) {
        for (const source of args.customSources.slice(0, 2)) {
          try {
            const customResponse = await fetch(
              `${process.env.NEXT_PUBLIC_CONVEX_URL?.replace("convex.cloud", "vercel.app") || "http://localhost:3000"}/api/news`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  query: `${source.name} latest updates`,
                  numResults: Math.ceil(limit * 0.15),
                  includeDomains: (() => {
                    if (source.type !== "website") return undefined;
                    try {
                      const host = new URL(source.url).hostname;
                      return host ? [host] : undefined;
                    } catch {
                      return undefined;
                    }
                  })(),
                }),
              },
            );

            if (customResponse.ok) {
              const customNews = await customResponse.json();
              for (const item of customNews.results || []) {
                results.push({
                  title: item.title,
                  url: item.url,
                  publishedDate: item.publishedDate,
                  author: item.author,
                  summary: item.summary,
                  source: source.name,
                });
              }
            }
          } catch (error) {
            console.error(`Failed to fetch news from ${source.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch news:", error);
    }

    return results
      .sort((a, b) => {
        if (!a.publishedDate) return 1;
        if (!b.publishedDate) return -1;
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      })
      .slice(0, limit);
  },
});

export const updateNewsPreferences = mutation({
  args: {
    memberId: v.id("members"),
    preferences: v.object({
      enabledCategories: v.array(v.string()),
      customSources: v.array(
        v.object({
          type: v.union(v.literal("repository"), v.literal("website"), v.literal("discord")),
          url: v.string(),
          name: v.string(),
          guildId: v.optional(v.string()),
          channels: v.optional(v.array(v.string())),
        }),
      ),
      refreshInterval: v.number(),
      discordEnabled: v.optional(v.boolean()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId, {
      newsPreferences: args.preferences,
    });
    return null;
  },
});

export const getNewsPreferences = query({
  args: { memberId: v.id("members") },
  returns: v.union(
    v.null(),
    v.object({
      enabledCategories: v.array(v.string()),
      customSources: v.array(
        v.object({
          type: v.union(v.literal("repository"), v.literal("website"), v.literal("discord")),
          url: v.string(),
          name: v.string(),
          guildId: v.optional(v.string()),
          channels: v.optional(v.array(v.string())),
        }),
      ),
      refreshInterval: v.number(),
      discordEnabled: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    return member?.newsPreferences || null;
  },
});
