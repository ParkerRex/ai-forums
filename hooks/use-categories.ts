"use client";

import { useQuery } from "@tanstack/react-query";

type Category = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  postCount: number;
  status: string;
};

async function fetchCategories(): Promise<{ items: Category[] }> {
  const response = await fetch("/api/categories");
  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }
  return response.json();
}

async function fetchCategory(categoryId: string): Promise<Category | null> {
  const response = await fetch(`/api/categories/${categoryId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Failed to fetch category");
  }
  return response.json();
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCategory(categoryId: string) {
  return useQuery({
    queryKey: ["categories", categoryId],
    queryFn: () => fetchCategory(categoryId),
    enabled: !!categoryId,
  });
}

/**
 * Fetch category by name (supports both ID and name lookup via API)
 */
export function useCategoryByName(categoryName: string) {
  return useQuery({
    queryKey: ["categories", "byName", categoryName],
    queryFn: () => fetchCategory(categoryName),
    enabled: !!categoryName,
  });
}
