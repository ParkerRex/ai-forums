"use client";
import PostHeader from '@/components/post-header';
import PostList from '@/components/post-list';
import PostSidebar from '@/components/post-sidebar';
import React, { useState } from 'react';

export default function BlogPage() {
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "trending">("newest");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">VAI Blog</h1>
        <p className="text-gray-600">Free articles and insights from the AI engineering community</p>
      </div>
      <PostHeader sortBy={sortBy} onSortChange={setSortBy} />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-3">
          <PostList sortBy={sortBy} freeOnly={true} />
        </div>
        <div className="lg:col-span-1">
          <PostSidebar />
        </div>
      </div>
    </div>
  );
}