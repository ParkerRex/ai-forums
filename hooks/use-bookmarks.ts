"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Bookmark {
  id: string;
  memberId: string;
  targetId: string;
  targetType: "post" | "comment" | "resource";
  createdAt: string;
}

interface BookmarkWithTarget extends Bookmark {
  target?: {
    id: string;
    title: string;
    content: string;
    slug: string;
    createdAt: string;
    member?: {
      id: string;
      firstName: string;
      lastName: string;
      slug: string;
      avatarUrl: string | null;
    };
    category?: {
      id: string;
      name: string;
      displayName: string;
    };
  };
}

async function getBookmarks(targetType?: "post" | "resource"): Promise<{ items: Bookmark[] }> {
  const params = new URLSearchParams();
  if (targetType) params.set("type", targetType);
  const res = await fetch(`/api/bookmarks?${params}`);
  if (!res.ok) {
    throw new Error("Failed to fetch bookmarks");
  }
  return res.json();
}

async function getBookmarksWithDetails(
  targetType?: "post" | "resource",
): Promise<BookmarkWithTarget[]> {
  const params = new URLSearchParams();
  if (targetType) params.set("type", targetType);
  params.set("expand", "true");
  const res = await fetch(`/api/bookmarks?${params}`);
  if (!res.ok) {
    throw new Error("Failed to fetch bookmarks");
  }
  const data = await res.json();
  return data.items || [];
}

async function toggleBookmark(data: {
  targetId: string;
  targetType: "post" | "comment" | "resource";
}): Promise<{ bookmarked: boolean }> {
  const res = await fetch("/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Failed to toggle bookmark");
  }
  return res.json();
}

export function useBookmarks(targetType?: "post" | "resource") {
  return useQuery({
    queryKey: ["bookmarks", targetType],
    queryFn: () => getBookmarks(targetType),
  });
}

export function useBookmarksWithDetails(targetType?: "post" | "resource") {
  return useQuery({
    queryKey: ["bookmarks", "withDetails", targetType],
    queryFn: () => getBookmarksWithDetails(targetType),
  });
}

export function useIsBookmarked(targetId: string, targetType: "post" | "comment" | "resource") {
  const { data: bookmarks } = useBookmarks();
  return bookmarks?.items?.some(
    (b: Bookmark) => b.targetId === targetId && b.targetType === targetType,
  );
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}
