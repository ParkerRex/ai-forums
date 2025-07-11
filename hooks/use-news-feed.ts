"use client";

import { useCallback, useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentMember } from "./use-current-member";

export type NewsItem = {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
};

const CACHE_KEY = "vai_news_cache";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CachedData {
  data: NewsItem[];
  timestamp: number;
}

export function useNewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { member } = useCurrentMember();
  const getNews = useAction(api.newsFeed.get);

  const loadNews = useCallback(async (skipCache = false) => {
    // Try to load from localStorage cache first
    if (!skipCache) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp }: CachedData = JSON.parse(cached);
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
      setLoading(true);
      
      // Fetch news from Convex action
      const articles = await getNews({
        userId: member?._id,
      });

      setNews(articles);

      // Cache the results in localStorage
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: articles,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.error("Failed to cache news:", error);
      }
    } catch (error) {
      console.error("Failed to load news:", error);
    } finally {
      setLoading(false);
    }
  }, [getNews, member?._id]);

  const refresh = useCallback(async () => {
    await loadNews(true);
  }, [loadNews]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  return {
    news,
    loading,
    refresh,
  };
}