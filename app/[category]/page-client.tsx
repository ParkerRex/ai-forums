"use client";

import { notFound } from "next/navigation";
import { use, useState } from "react";
import PostHeader from "@/components/posts/post-header";
import PostList from "@/components/posts/post-list";
import PostSidebar from "@/components/posts/post-sidebar";
import { Badge } from "@/components/ui/badge";
import { useCategoryByName } from "@/hooks/use-categories";

interface CategoryPageClientProps {
  /** Promise containing the dynamic route parameters */
  params: Promise<{
    /** The category name from the URL path */
    category: string;
  }>;
}

/**
 * Category Page Client Component
 *
 * Renders the category page with post filtering, sorting, and interactive features.
 * Handles loading states, error states, and category validation.
 *
 * @param params - Promise containing the dynamic route parameters
 * @returns JSX element rendering the category page with posts
 *
 * @example
 * // Used by server component:
 * <CategoryPageClient params={Promise.resolve({ category: "workflows" })} />
 */
export default function CategoryPageClient({ params }: CategoryPageClientProps) {
  // Unwrap the params promise using React's use() hook (Next.js 15 behavior)
  // This allows the component to work with streaming and concurrent features
  const resolvedParams = use(params);
  const categoryName = resolvedParams?.category;

  // Fetch category data by name from PostgreSQL database via React Query
  const { data: category, isLoading, isError } = useCategoryByName(categoryName ?? "");

  // State for post sorting - controls how posts are ordered in the list
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "trending">("newest");

  // Show loading skeleton while fetching category data
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="animate-pulse">
          {/* Category header skeleton */}
          <div className="bg-muted mb-4 h-8 w-48 rounded-none"></div>
          <div className="bg-muted mb-2 h-4 w-96 rounded-none"></div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Post list skeleton */}
            <div className="space-y-4 lg:col-span-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted h-32 rounded-none"></div>
              ))}
            </div>
            {/* Sidebar skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-muted h-64 rounded-none"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle invalid category or missing category name
  // null/undefined from API means the category doesn't exist in the database
  if (!category || !categoryName || isError) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
          <Badge>{category.postCount} posts</Badge>
        </div>
      </div>

      {/* Post Header with sorting controls */}
      <PostHeader sortBy={sortBy} onSortChange={setSortBy} />

      {/* Posts Grid - Responsive layout with main content and sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main post list - takes 3/4 of the width on large screens */}
        <div className="lg:col-span-3">
          <PostList categoryId={category.id} sortBy={sortBy} currentCategoryId={category.id} />
        </div>
        {/* Sidebar - takes 1/4 of the width on large screens */}
        <div className="lg:col-span-1">
          <PostSidebar />
        </div>
      </div>
    </div>
  );
}
