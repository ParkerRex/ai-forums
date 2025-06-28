"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import PostHeader from "@/components/post-header";
import PostList from "@/components/post-list";
import PostSidebar from "@/components/post-sidebar";
import { notFound } from "next/navigation";
import { useState } from "react";
import { use } from "react";

interface CategoryPageClientProps {
  params: Promise<{
    category: string;
  }>;
}

export default function CategoryPageClient({ params }: CategoryPageClientProps) {
  // Unwrap the params promise (Next.js 15 behavior)
  const resolvedParams = use(params);
  const categoryName = resolvedParams?.category;

  // Fetch category by name
  const category = useQuery(api.categories.getCategoryByName, 
    categoryName ? { name: categoryName } : "skip"
  );

  const [sortBy, setSortBy] = useState<"newest" | "popular" | "trending">("newest");

  // Show loading state while fetching
  if (category === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4 w-48"></div>
          <div className="h-4 bg-muted rounded mb-2 w-96"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            <div className="lg:col-span-3 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show 404 if category doesn't exist
  if (category === null || !categoryName) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Category Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {category.icon && <span className="text-2xl">{category.icon}</span>}
          <h1 className="text-3xl font-bold text-foreground">{category.displayName}</h1>
        </div>
        <p className="text-muted-foreground">{category.description}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>{category.postCount} posts</span>
        </div>
      </div>

      {/* Post Header with sorting */}
      <PostHeader
        selectedCategoryId={category._id}
        onCategorySelect={() => {}} // No category switching on category pages
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Posts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <PostList categoryId={category._id} sortBy={sortBy} />
        </div>
        <div className="lg:col-span-1">
          <PostSidebar />
        </div>
      </div>
    </div>
  );
} 