"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNewsFeed, NewsItem } from "../hooks/use-news-feed";

const RATE_LIMIT_DURATION = 30 * 1000; // 30 seconds

export function NewsFeedWidget() {
  const { news, loading, refresh } = useNewsFeed();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  const handleRefresh = async () => {
    const now = Date.now();
    if (now - lastRefresh < RATE_LIMIT_DURATION) {
      toast.error("Woah, you're doing that too much! Please wait a moment.");
      return;
    }

    setRefreshing(true);
    setLastRefresh(now);
    await refresh();
    setRefreshing(false);
  };

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
          <h3 className="text-sm font-medium">Top AI Stories</h3>
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
          <RefreshCw
            className={`h-3 w-3 transition-transform ${refreshing ? "animate-[spin_0.5s_linear_infinite]" : ""}`}
          />
        </Button>
      </div>
      <div
        className={`text-xs space-y-1 transition-all ${refreshing ? "blur-sm opacity-50" : ""}`}
      >
        {news.slice(0, 5).map((item: NewsItem, index: number) => {
          return (
            <div key={index} className="group">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex-1 leading-tight">{item.title}</span>
                  <span className="text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {formatTimeAgo(item.publishedDate)}
                  </span>
                </div>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
