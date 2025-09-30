"use client";

import { useEffect, useState } from "react";
import { PostSkeletonList } from "@/components/members/member-skeleton";
import PostHeader from "@/components/posts/post-header";
import PostHeaderSkeleton from "@/components/posts/post-header-skeleton";
import PostList from "@/components/posts/post-list";
import PostSidebar from "@/components/posts/post-sidebar";

export default function Home() {
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "trending">("newest");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Track initial page load to show coordinated skeleton
  useEffect(() => {
    // Small delay to ensure we catch the actual loading state
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Show full page skeleton on initial load to prevent layout shift
  if (isInitialLoad) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header skeleton */}
        <PostHeaderSkeleton />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          {/* Post list skeleton */}
          <div className="lg:col-span-3">
            <PostSkeletonList count={5} />
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-2 lg:col-span-1">
            {/* News feed skeleton */}
            <div className="bg-card rounded-none border p-4">
              <div className="bg-muted mb-3 h-5 w-24 animate-pulse rounded" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-muted h-12 animate-pulse rounded" />
                ))}
              </div>
            </div>

            {/* Online users skeleton */}
            <div className="bg-card rounded-none border p-4">
              <div className="bg-muted mb-3 h-5 w-28 animate-pulse rounded" />
              <div className="flex -space-x-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                ))}
              </div>
            </div>

            {/* About VAI skeleton */}
            <div className="bg-card rounded-none border p-4">
              <div className="bg-muted mb-3 h-5 w-20 animate-pulse rounded" />
              <div className="space-y-2">
                <div className="bg-muted h-3 animate-pulse rounded" />
                <div className="bg-muted h-3 animate-pulse rounded" />
                <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <PostHeader sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <PostList sortBy={sortBy} />
        </div>
        <div className="lg:col-span-1">
          <PostSidebar />
        </div>
      </div>
    </div>
  );
}
