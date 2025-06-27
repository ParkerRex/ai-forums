"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import PostCard from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";

interface PostListProps {
  categoryId?: Id<"categories">;
  sortBy?: "newest" | "popular" | "trending";
}

export default function PostList({ categoryId, sortBy = "newest" }: PostListProps) {
  const posts = useQuery(api.posts.getPosts, {
    categoryId,
    limit: 20,
    sortBy,
  });

  // Loading state
  if (posts === undefined) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex flex-col items-center space-y-2 mr-4">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex space-x-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (posts === null) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">Unable to load posts. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No posts found. Be the first to create one!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  );
}
