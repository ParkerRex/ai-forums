"use client";
import React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation";

interface PostHeaderProps {
  selectedCategoryId?: Id<"categories">;
  onCategorySelect?: (categoryId: Id<"categories"> | undefined) => void;
  sortBy?: "newest" | "popular" | "trending";
  onSortChange?: (sort: "newest" | "popular" | "trending") => void;
}

export default function PostHeader({ selectedCategoryId, onCategorySelect, sortBy = "newest", onSortChange }: PostHeaderProps) {
  const categories = useQuery(api.categories.getCategories);
  const pathname = usePathname();

  // Check if we're on a category page
  const isOnCategoryPage = pathname.startsWith('/') && pathname !== '/' && !pathname.startsWith('/members') && !pathname.startsWith('/create') && !pathname.startsWith('/post');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-6 overflow-x-auto pb-2">
          {/* All Posts Tab */}
          {isOnCategoryPage ? (
            <Link href="/" className="font-medium pb-1 whitespace-nowrap transition-colors border-b-2 text-gray-600 hover:text-green-700 border-transparent hover:border-gray-300">
              all posts
            </Link>
          ) : (
            <button
              onClick={() => onCategorySelect?.(undefined)}
              className={`font-medium pb-1 whitespace-nowrap transition-colors border-b-2 ${!selectedCategoryId
                ? "text-green-700 border-green-700"
                : "text-gray-600 hover:text-green-700 border-transparent hover:border-gray-300"
                }`}
            >
              all posts
            </button>
          )}

          {/* Category Tabs */}
          {categories === undefined ? (
            // Loading state
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))
          ) : categories?.length === 0 ? (
            <span className="text-gray-500 text-sm">No categories available</span>
          ) : (
            categories?.map((category) => {
              const isActive = isOnCategoryPage ? 
                pathname === `/${category.name}` : 
                selectedCategoryId === category._id;

              return isOnCategoryPage ? (
                <Link
                  key={category._id}
                  href={`/${category.name}`}
                  className={`px-3 py-1 text-sm border-b-2 transition-colors ${
                    isActive
                      ? "text-primary border-primary"
                      : "text-muted-foreground hover:text-primary border-transparent hover:border-muted-foreground"
                  }`}
                >
                  {category.icon} /{category.name}
                </Link>
              ) : (
                <button
                  key={category._id}
                  onClick={() => onCategorySelect?.(category._id)}
                  className={`px-3 py-1 text-sm border-b-2 transition-colors ${
                    isActive
                      ? "text-primary border-primary"
                      : "text-muted-foreground hover:text-primary border-transparent hover:border-muted-foreground"
                  }`}
                >
                  {category.icon} /{category.name}
                </button>
              );
            })
          )}
        </div>

        {/* Sort Options */}
        {onSortChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as "newest" | "popular" | "trending")}
              className="text-sm border border-border rounded px-2 py-1 bg-background text-foreground"
            >
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
              <option value="trending">Trending</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
