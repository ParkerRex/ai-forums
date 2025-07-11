"use client";
import PostHeader from '@/components/post-header';
import PostList from '@/components/post-list';
import PostSidebar from '@/components/post-sidebar';
import { ReactivateBannerInline } from '@/components/reactivate-banner-inline';
import React, { useState, useEffect } from 'react';
import PostHeaderSkeleton from '@/components/post-header-skeleton';
import { PostSkeletonList } from '@/components/member-skeleton';

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
      <>
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header skeleton */}
          <PostHeaderSkeleton />
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* Post list skeleton */}
            <div className="lg:col-span-3">
              <PostSkeletonList count={5} />
            </div>
            
            {/* Sidebar skeleton */}
            <div className="lg:col-span-1 space-y-2">
              {/* News feed skeleton */}
              <div className="bg-card border rounded-lg p-4">
                <div className="h-5 bg-muted rounded w-24 animate-pulse mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              </div>
              
              {/* Online users skeleton */}
              <div className="bg-card border rounded-lg p-4">
                <div className="h-5 bg-muted rounded w-28 animate-pulse mb-3" />
                <div className="flex -space-x-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                  ))}
                </div>
              </div>
              
              {/* About VAI skeleton */}
              <div className="bg-card border rounded-lg p-4">
                <div className="h-5 bg-muted rounded w-20 animate-pulse mb-3" />
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ReactivateBannerInline />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PostHeader sortBy={sortBy} onSortChange={setSortBy} />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-3">
            <PostList sortBy={sortBy} />
          </div>
          <div className="lg:col-span-1">
            <PostSidebar />
          </div>
        </div>
      </div>
    </>
  );
}
