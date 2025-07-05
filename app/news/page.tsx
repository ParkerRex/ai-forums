"use client";

import { useCurrentMember } from "@/hooks/use-current-member";
import { useEffect, useState } from "react";
import { NewsCard } from "@/components/news/news-card";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface NewsItem {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { member } = useCurrentMember();

  const loadNews = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
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
          numResults: 15,
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

      for (const source of customSources.slice(0, 2)) {
        try {
          const customResponse = await fetch("/api/news", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `${source.name} latest updates`,
              numResults: 5,
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

      const sortedNews = results
        .sort((a, b) => {
          if (!a.publishedDate) return 1;
          if (!b.publishedDate) return -1;
          return (
            new Date(b.publishedDate).getTime() -
            new Date(a.publishedDate).getTime()
          );
        })
        .slice(0, 20);

      setNews(sortedNews);
    } catch (error) {
      console.error("Failed to load news:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [member?.newsPreferences]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">AI News Feed</h1>
          </div>
          <div className="grid gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-muted rounded mb-3"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">AI News Feed</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadNews(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {news.map((item, index) => (
            <NewsCard key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
