"use client";

import { useCurrentMember } from "@/hooks/use-current-member";
import { useEffect, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NewsItem {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
}

const CACHE_KEY = "vai_news_cache";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_DURATION = 30 * 1000; // 30 seconds

export function NewsFeedWidget() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const { member } = useCurrentMember();
  const hasLoadedRef = useRef(false);

  const loadNews = async (skipCache = false) => {
    // Try to load from cache first
    if (!skipCache) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setNews(data);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load from cache:", error);
      }
    }
      try {
        const defaultSources = [
          {
            type: "repository" as const,
            url: "https://github.com/microsoft/chat-copilot",
            name: "Microsoft Copilot",
          },
          {
            type: "website" as const,
            url: "https://x.ai/news",
            name: "x.ai News",
          },
        ];

        const customSources =
          member?.newsPreferences?.customSources || defaultSources;
        const results: NewsItem[] = [];

        const mainResponse = await fetch("/api/news", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query:
              "latest AI developments machine learning artificial intelligence",
            numResults: 3,
          }),
        });

        if (mainResponse.ok) {
          const mainNews = await mainResponse.json();
          for (const item of mainNews.results || []) {
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

        if (customSources.length > 0) {
          const source = customSources[0];
          try {
            const customResponse = await fetch("/api/news", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: `${source.name} latest updates`,
                numResults: 2,
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
            });

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

        const getTimestamp = (date?: string) => {
          if (!date) return null;
          const ts = new Date(date).getTime();
          return isNaN(ts) ? null : ts;
        };

        const sortedNews = results
          .sort((a, b) => {
            const tsA = getTimestamp(a.publishedDate);
            const tsB = getTimestamp(b.publishedDate);

            if (tsA === null && tsB === null) return 0;
            if (tsA === null) return 1;
            if (tsB === null) return -1;
            return tsB - tsA; // newest first
          })
          .slice(0, 5);

        setNews(sortedNews);
        
        // Cache the results
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: sortedNews,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error("Failed to cache news:", error);
        }
      } catch (error) {
        console.error("Failed to load news:", error);
        toast.error("Failed to load news");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  const handleRefresh = async () => {
    const now = Date.now();
    if (now - lastRefresh < RATE_LIMIT_DURATION) {
      toast.error("Woah, you're doing that too much! Please wait a moment.");
      return;
    }
    
    setRefreshing(true);
    setLastRefresh(now);
    await loadNews(true);
  };

  useEffect(() => {
    // Only load once when component mounts
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadNews();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return "1d ago";
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading && news.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Top</h3>
        </div>
        <div className="text-xs space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="h-3 bg-muted rounded flex-1"></div>
                <div className="h-3 bg-muted rounded w-12"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 bg-muted rounded w-10"></div>
                <div className="h-2 bg-muted rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Top</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:bg-accent/50"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-3 w-3 transition-transform ${refreshing ? 'animate-[spin_0.5s_linear_infinite]' : ''}`} />
        </Button>
      </div>
      <div className={`text-xs space-y-1 transition-all ${refreshing ? 'blur-sm opacity-50' : ''}`}>
        {news.map((item, index) => {
          const domain = item.url
            ? new URL(item.url).hostname.replace("www.", "")
            : item.source;
          return (
            <div key={index} className="group">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-blue-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex-1 leading-tight">{item.title}</span>
                  <span className="text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {formatTimeAgo(item.publishedDate)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5">
                  <span className="text-[10px]">[Article]</span>
                  <span className="ml-2">{item.author || domain}</span>
                </div>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
