"use client";
import PostHeader from '@/components/post-header';
import PostList from '@/components/post-list';
import PostSidebar from '@/components/post-sidebar';
import React, { useState } from 'react';
import { Id } from '@/convex/_generated/dataModel';

export default function Home() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<"categories"> | undefined>(undefined);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PostHeader
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={setSelectedCategoryId}
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-3">
          <PostList categoryId={selectedCategoryId} />
        </div>
        <div className="lg:col-span-1">
          <PostSidebar />
        </div>
      </div>
    </div>
  );
}
