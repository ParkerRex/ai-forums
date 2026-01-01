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

import Link from "next/link";
import { useState } from "react";
import { PageErrorBoundary, QueryErrorBoundary } from "@/components/error-boundary";
import { PostSkeletonList } from "@/components/members/member-skeleton";
import PostPreview from "@/components/posts/post-preview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBookmarksWithDetails } from "@/hooks/use-bookmarks";

/**
 * Main content component for the bookmarks page.
 * Handles the display logic, tab management, and data fetching for user bookmarks.
 *
 * @returns {JSX.Element} The rendered bookmarks content with tabs and filtered results
 */
function BookmarksContent() {
  // State to track which tab is currently active for filtering bookmarks
  const [activeTab, setActiveTab] = useState<"all" | "posts" | "resources">("all");

  // Determine target type based on active tab for API filtering
  const targetType = activeTab === "all" ? undefined : activeTab === "posts" ? "post" : "resource";

  // Fetch user's bookmarks with optional filtering by target type
  const { data: bookmarks, isLoading, isError } = useBookmarksWithDetails(targetType);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Page header with title and description */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Bookmarks</h1>
          <p className="text-muted-foreground">Your saved posts and resources for easy access</p>
        </div>

        {/* Tab navigation for filtering bookmarks by type */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "all" | "posts" | "resources")}
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
              ) : isError ? (
                // Show error state
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Error loading bookmarks
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Something went wrong while loading your bookmarks
                  </p>
                  <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
              ) : bookmarks && bookmarks.length > 0 ? (
                // Display list of bookmarked items when data is available
                <div className="space-y-6">
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="relative">
                      {/* Use PostCard component to display bookmark target (post or resource) */}
                      {bookmark.target && (
                        <PostPreview
                          post={{
                            id: bookmark.target.id,
                            title: bookmark.target.title,
                            content: bookmark.target.content,
                            createdAt: new Date(bookmark.target.createdAt).getTime(),
                            upvotes: 0,
                            downvotes: 0,
                            commentCount: 0,
                            viewCount: 0,
                            member: bookmark.target.member,
                            category: bookmark.target.category,
                          }}
                          size="medium"
                        />
                      )}
                      {/* Show when the item was bookmarked */}
                      <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                        Saved {new Date(bookmark.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Empty state when no bookmarks exist for the current filter
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-foreground mb-2">No bookmarks yet</h3>
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
