import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";
import { api } from "./_generated/api";

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const MAX_ITEMS_PER_SOURCE = 5;

type NewsSource = {
  type: "rss" | "youtube" | "podcast" | "blog" | "x" | "website";
  url: string;
  name: string;
};

type NewsItem = {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
};

// Hard-coded default sources for Phase 0
const DEFAULT_SOURCES: NewsSource[] = [
  {
    type: "blog",
    url: "https://github.com/microsoft/chat-copilot",
    name: "Microsoft Copilot",
  },
  {
    type: "blog",
    url: "https://x.ai/news",
    name: "x.ai News",
  },
];

// Helper to summarize text
function summarizeText(text: string): string {
  if (!text || text.trim().length === 0) {
    return '';
  }
  
  const maxLength = 150;
  const trimmed = text.trim();
  
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  
  // Find a good break point (end of sentence)
  let cutoff = maxLength;
  const sentenceEnd = trimmed.lastIndexOf('.', maxLength);
  if (sentenceEnd > maxLength * 0.8) {
    cutoff = sentenceEnd + 1;
  }
  
  return trimmed.substring(0, cutoff).trim() + '...';
}

// Fetch news from Exa API
async function fetchFromExaAPI(
  query: string,
  numResults: number,
  includeDomains?: string[]
): Promise<any> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA API key not configured');
  }

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      category: 'news',
      numResults,
      includeDomains,
      contents: {
        text: true,
        summary: true,
      },
      // Temporarily remove date filter to test
      // startPublishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EXA API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export const get = action({
  args: {
    userId: v.optional(v.id("members")),
  },
  handler: async (ctx, args): Promise<NewsItem[]> => {
    const { userId } = args;

    // Generate cache key
    const cacheKey = userId ? `user-${userId}` : "default";

    // Check cache first
    const now = Date.now();
    const cached = await ctx.runQuery(api.newsFeed.getCached, { cacheKey });
    
    if (cached && cached.expiresAt > now) {
      return cached.articles;
    }

    // Get user's custom sources or use defaults
    // For Phase 0, we'll use the default sources only
    // Future phases will add user preferences to the schema
    let sources = DEFAULT_SOURCES;

    // Fetch news from all sources
    const allArticles: NewsItem[] = [];

    // First, fetch general AI news
    try {
      const generalNews = await fetchFromExaAPI(
        "latest AI developments machine learning artificial intelligence",
        15
      );
      
      for (const item of generalNews.results || []) {
        const summary = item.summary || summarizeText(item.text || item.title);
        allArticles.push({
          title: item.title,
          url: item.url,
          publishedDate: item.publishedDate,
          author: item.author,
          summary,
          source: "AI News",
        });
      }
    } catch (error) {
      console.error("Failed to fetch general AI news:", error);
    }

    // Then fetch from custom sources (up to 2 sources)
    for (const source of sources.slice(0, 2)) {
      try {
        // Extract domain for website/blog sources
        let includeDomains: string[] | undefined;
        if (source.type === "blog" || source.type === "website") {
          try {
            const host = new URL(source.url).hostname;
            if (host) {
              includeDomains = [host];
            }
          } catch {
            // Ignore URL parsing errors
          }
        }

        const sourceNews = await fetchFromExaAPI(
          `${source.name} latest updates`,
          MAX_ITEMS_PER_SOURCE,
          includeDomains
        );
        
        for (const item of sourceNews.results || []) {
          const summary = item.summary || summarizeText(item.text || item.title);
          allArticles.push({
            title: item.title,
            url: item.url,
            publishedDate: item.publishedDate,
            author: item.author,
            summary,
            source: source.name,
          });
        }
      } catch (error) {
        console.error(`Failed to fetch from ${source.name}:`, error);
      }
    }

    // Sort by date
    const sortedArticles = allArticles.sort((a, b) => {
      const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
      const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
      return dateB - dateA;
    });

    // Limit to top 20 articles
    const finalArticles = sortedArticles.slice(0, 20);

    // Cache the results
    await ctx.runMutation(api.newsFeed.cache, {
      cacheKey,
      userId,
      articles: finalArticles,
      sources,
      expiresAt: now + CACHE_DURATION,
    });

    return finalArticles;
  },
});

export const getCached = query({
  args: {
    cacheKey: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("newsFeedCache")
      .withIndex("by_userId_createdAt")
      .filter((q) => q.eq(q.field("cacheKey"), args.cacheKey))
      .order("desc")
      .first();
    
    return result;
  },
});

export const cache = mutation({
  args: {
    cacheKey: v.string(),
    userId: v.optional(v.id("members")),
    articles: v.array(v.object({
      title: v.string(),
      url: v.string(),
      publishedDate: v.optional(v.string()),
      author: v.optional(v.string()),
      summary: v.optional(v.string()),
      source: v.string(),
    })),
    sources: v.array(v.object({
      type: v.string(),
      url: v.string(),
      name: v.string(),
    })),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.insert("newsFeedCache", {
      userId: args.userId,
      cacheKey: args.cacheKey,
      articles: args.articles,
      sources: args.sources,
      createdAt: now,
      expiresAt: args.expiresAt,
    });
  },
});