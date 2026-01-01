"use client";

import { useQuery } from "@tanstack/react-query";

interface SearchResult {
  id: string;
  type: "post" | "comment" | "link";
  title?: string;
  content?: string;
  link?: string;
  domain?: string;
  restricted?: boolean;
  slug?: string;
  categoryName?: string;
  postId?: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    slug: string;
  };
}

async function searchContent(searchTerm: string): Promise<SearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
  if (!res.ok) {
    throw new Error("Search failed");
  }
  return res.json();
}

export function useSearch(searchTerm: string) {
  return useQuery({
    queryKey: ["search", searchTerm],
    queryFn: () => searchContent(searchTerm),
    enabled: searchTerm.trim().length > 0,
    staleTime: 30000,
  });
}
