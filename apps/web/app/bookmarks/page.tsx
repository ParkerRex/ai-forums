"use client";

/**
 * @fileoverview Bookmarks page component that displays a user's saved posts and resources.
 * This page provides a centralized location for users to view and manage their bookmarked content,
 * with filtering capabilities to view all items, posts only, or resources only.
 *
 * Features:
 * - Tab-based filtering (All, Posts, Resources)
 * - Paginated display of bookmarked content
 * - Empty state with call-to-action
 * - Responsive design with skeleton loading states
 * - Error handling with retry mechanisms
 *
 * @author VAI Team
 * @since 1.0.0
 */

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/web/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/web/components/ui/tabs";
import PostCard from "@/web/components/posts/post-card";
import {
  PageErrorBoundary,
  QueryErrorBoundary,
} from "@/web/components/error-boundary";
import { PostSkeletonList } from "@/web/components/members/member-skeleton";

/**
 * Main content component for the bookmarks page.
 * Handles the display logic, tab management, and data fetching for user bookmarks.
 *
 * @returns {JSX.Element} The rendered bookmarks content with tabs and filtered results
 */
function BookmarksContent() {
  // State to track which tab is currently active for filtering bookmarks
  const [activeTab, setActiveTab] = useState<"all" | "posts" | "resources">(
    "all",
  );

  // Fetch user's bookmarks with optional filtering by target type
  // targetType is mapped from tab selection: "all" -> undefined, "posts" -> "post", "resources" -> "resource"
  const bookmarksData = useQuery(api.bookmarks.getUserBookmarks, {
    targetType:
      activeTab === "all"
        ? undefined
        : activeTab === "posts"
          ? "post"
          : "resource",
    paginationOpts: { numItems: 20, cursor: null }, // Load 20 items per page
  });

  // Loading state - Convex queries return undefined while loading
  const isLoading = bookmarksData === undefined;
  // Extract bookmarks from paginated response, defaulting to empty array
  const bookmarks = bookmarksData?.page || [];

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Page header with title and description */}
        <div className="mb-8">
          <h1 className="text-foreground mb-2 text-3xl font-bold">
            My Bookmarks
          </h1>
          <p className="text-muted-foreground">
            Your saved posts and resources for easy access
          </p>
        </div>

        {/* Tab navigation for filtering bookmarks by type */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "all" | "posts" | "resources")
          }
          className="mb-8"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Query error boundary to handle data fetching errors gracefully */}
            <QueryErrorBoundary context="loading bookmarks">
              {isLoading ? (
                // Show skeleton loading state while fetching bookmarks
                <PostSkeletonList count={5} />
              ) : bookmarks.length > 0 ? (
                // Display list of bookmarked items when data is available
                <div className="space-y-6">
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark._id} className="relative">
                      {/* Use PostCard component to display bookmark target (post or resource) */}
                      <PostCard post={bookmark.target} />
                      {/* Show when the item was bookmarked */}
                      <div className="text-muted-foreground absolute right-2 top-2 text-xs">
                        Saved{" "}
                        {new Date(bookmark.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Empty state when no bookmarks exist for the current filter
                <div className="py-12 text-center">
                  <h3 className="text-foreground mb-2 text-lg font-semibold">
                    No bookmarks yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Start bookmarking posts and resources to see them here
                  </p>
                  {/* Call-to-action button to encourage user engagement */}
                  <Button asChild>
                    <Link href="/">Browse Posts</Link>
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

/**
 * Bookmarks page component with page-level error boundary.
 * This is the main exported component that wraps the bookmark content
 * with error handling for robust user experience.
 *
 * @returns {JSX.Element} The complete bookmarks page with error boundary
 *
 * @example
 * ```tsx
 * // This component is automatically rendered when user navigates to /bookmarks
 * // It requires user authentication to display personal bookmarks
 * ```
 */
export default function BookmarksPage() {
  return (
    // Page-level error boundary to catch and handle any rendering errors
    <PageErrorBoundary context="loading bookmarks page">
      <BookmarksContent />
    </PageErrorBoundary>
  );
}
