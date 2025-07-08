"use client";
import PostHeader from '@/components/post-header';
import PostList from '@/components/post-list';
import PostSidebar from '@/components/post-sidebar';
import { ReactivateBannerInline } from '@/components/reactivate-banner-inline';
import React, { useState } from 'react';

export default function Home() {
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "trending">("newest");

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
