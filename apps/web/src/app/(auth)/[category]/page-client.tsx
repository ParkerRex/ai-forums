"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import PostHeader from "../components/posts/post-header";
import PostList from "../components/posts/post-list";
import PostSidebar from "../components/posts/post-sidebar";
import { notFound } from "next/navigation";
import { useState } from "react";
import { use } from "react";
import { Badge } from "../../../components/ui/badge";

interface CategoryPageClientProps {
  /** Promise containing the dynamic route parameters */
  params: Promise<{
    /** The category name from the URL path */
    category: string;
  }>;
}

export default function CategoryPageClient({
  params,
}: CategoryPageClientProps) {
  // Unwrap the params promise using React's use() hook (Next.js 15 behavior)
  // This allows the component to work with streaming and concurrent features
  const resolvedParams = use(params);
  const categoryName = resolvedParams?.category;

  // Fetch category data by name from Convex database
  // Uses conditional query - skips if no categoryName to avoid unnecessary requests
  const category = useQuery(
    api.categories.getCategoryByName,
    categoryName ? { name: categoryName } : "skip"
  );

  // State for post sorting - controls how posts are ordered in the list
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "trending">(
    "newest"
  );

  // Show loading skeleton while fetching category data
  // In Convex, undefined means loading, null means not found
  if (category === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="animate-pulse">
          {/* Category header skeleton */}
          <div className="bg-muted mb-4 h-8 w-48 rounded-none" />
          <div className="bg-muted mb-2 h-4 w-96 rounded-none" />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Post list skeleton */}
            <div className="space-y-4 lg:col-span-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted h-32 rounded-none" />
              ))}
            </div>
            {/* Sidebar skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-muted h-64 rounded-none" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle invalid category or missing category name
  // null from Convex means the category doesn't exist in the database
  if (category === null || !categoryName) {
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
          <PostList
            categoryId={category._id}
            sortBy={sortBy}
            currentCategoryId={category._id}
          />
        </div>
        {/* Sidebar - takes 1/4 of the width on large screens */}
        <div className="lg:col-span-1">
          <PostSidebar />
        </div>
      </div>
    </div>
  );
}
