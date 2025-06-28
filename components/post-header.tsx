"use client";
import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";

interface PostHeaderProps {
  selectedCategoryId?: Id<"categories">;
  onCategorySelect?: (categoryId: Id<"categories"> | undefined) => void;
}

export default function PostHeader({ selectedCategoryId, onCategorySelect }: PostHeaderProps) {
  const categories = useQuery(api.categories.getCategories);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-6 overflow-x-auto pb-2">
          {/* All Posts Tab */}
          <button
            onClick={() => onCategorySelect?.(undefined)}
            className={`font-medium pb-1 whitespace-nowrap transition-colors border-b-2 ${!selectedCategoryId
              ? "text-green-700 border-green-700"
              : "text-gray-600 hover:text-green-700 border-transparent hover:border-gray-300"
              }`}
          >
            all posts
          </button>

          {/* Category Tabs */}
          {categories === undefined ? (
            // Loading state
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))
          ) : categories?.length === 0 ? (
            <span className="text-gray-500 text-sm">No categories available</span>
          ) : (
            categories?.map((category) => (
              <button
                key={category._id}
                onClick={() => onCategorySelect?.(category._id)}
                className={`px-3 py-1 text-sm border-b-2 transition-colors ${
                  selectedCategoryId === category._id
                    ? "text-primary border-primary"
                    : "text-muted-foreground hover:text-primary border-transparent hover:border-muted-foreground"
                }`}
              >
                {category.icon} /{category.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
