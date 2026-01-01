"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type NewsItem = {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
  imageUrl?: string;
};

type NewsFeedResponse = {
  articles: NewsItem[];
  sources: Array<{
    type: string;
    name: string;
    url?: string;
  }>;
  cached: boolean;
  expiresAt: string;
};

async function fetchNewsFeed(): Promise<NewsFeedResponse> {
  const response = await fetch("/api/news/feed");
  if (!response.ok) {
    throw new Error("Failed to fetch news feed");
  }
  return response.json();
}

async function refreshNewsFeed(): Promise<NewsFeedResponse> {
  const response = await fetch("/api/news/feed", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to refresh news feed");
  }
  return response.json();
}

export function useNewsFeed() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["newsFeed"],
    queryFn: fetchNewsFeed,
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });

  const refreshMutation = useMutation({
    mutationFn: refreshNewsFeed,
    onSuccess: (data) => {
      queryClient.setQueryData(["newsFeed"], data);
    },
  });

  return {
    news: query.data?.articles || [],
    loading: query.isLoading,
    error: query.error,
    refresh: () => refreshMutation.mutate(),
    isRefreshing: refreshMutation.isPending,
  };
}
