"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { NewsCard } from "./news-card";
import { useCurrentMember } from "@/hooks/use-current-member";
import { useEffect, useState } from "react";
import Link from "next/link";

interface NewsItem {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
}

export function NewsFeedWidget() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { member } = useCurrentMember();

  useEffect(() => {
    const loadNews = async () => {
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
      } catch (error) {
        console.error("Failed to load news:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, [member?.newsPreferences]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Recent AI News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Recent AI News
          </div>
          <Link
            href="/news"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {news.map((item, index) => (
            <NewsCard key={index} item={item} compact />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
