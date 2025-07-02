"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostCard from "@/components/post-card";
import { PageErrorBoundary, QueryErrorBoundary } from "@/components/error-boundary";
import { PostSkeletonList } from "@/components/member-skeleton";

function BookmarksContent() {
  const [activeTab, setActiveTab] = useState<"all" | "posts" | "resources">("all");
  
  const bookmarksData = useQuery(
    api.bookmarks.getUserBookmarks,
    {
      targetType: activeTab === "all" ? undefined : activeTab === "posts" ? "post" : "resource",
      paginationOpts: { numItems: 20, cursor: null }
    }
  );

  const isLoading = bookmarksData === undefined;
  const bookmarks = bookmarksData?.page || [];

  return (
    <div className="font-mono min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Bookmarks</h1>
          <p className="text-muted-foreground">
            Your saved posts and resources for easy access
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <QueryErrorBoundary context="loading bookmarks">
              {isLoading ? (
                <PostSkeletonList count={5} />
              ) : bookmarks.length > 0 ? (
                <div className="space-y-6">
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark._id} className="relative">
                      <PostCard post={bookmark.target} />
                      <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                        Saved {new Date(bookmark.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No bookmarks yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Start bookmarking posts and resources to see them here
                  </p>
                  <Button asChild>
                    <a href="/">Browse Posts</a>
                  </Button>
                </div>
              )}
            </QueryErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <PageErrorBoundary context="loading bookmarks page">
      <BookmarksContent />
    </PageErrorBoundary>
  );
}
