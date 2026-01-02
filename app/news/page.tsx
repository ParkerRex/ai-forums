/**
 * @fileoverview AI News Feed Page Component
 *
 * This is the main news feed page that displays a curated collection of AI-related
 * news articles. It aggregates content from multiple sources including custom user-configured
 * sources and default AI news sources. The page features real-time refresh capabilities,
 * intelligent sorting by publication date, and responsive loading states.
 *
 * Key features:
 * - Aggregates news from multiple sources (default AI sources + custom user sources)
 * - Real-time refresh functionality with loading indicators
 * - Intelligent date-based sorting (newest first, handles invalid dates gracefully)
 * - Responsive skeleton loading states during initial load
 * - User preference integration for customizable news sources
 * - Error handling for failed API requests
 * - Limit of 20 articles to ensure optimal performance
 *
 * @component NewsPage
 * @requires useCurrentMember hook for user preferences
 * @requires NewsCard component for article display
 * @requires /api/news endpoint for fetching articles
 *
 * @author VAI Team
 * @since 1.0.0
 */

"use client";

// Import icons for refresh and settings buttons
import { RefreshCw, Settings } from "lucide-react";
// Import React hooks for state management
import { useState } from "react";
// Import UI components for interactive elements
import { Button } from "@/components/ui/button";
// Import card components for skeleton loading states
import { Card, CardContent } from "@/components/ui/card";
// Import news card component for displaying individual articles
import { NewsCard } from "@/features/news/components";
// Import the news feed hook
import { useNewsFeed } from "@/features/news/hooks";

/**
 * Main news feed page component that displays curated AI news articles.
 *
 * This component serves as the primary interface for users to consume AI-related
 * news content. It intelligently aggregates articles from multiple sources,
 * provides real-time refresh capabilities, and maintains responsive loading states.
 * The component respects user preferences for custom news sources while falling
 * back to sensible defaults for new users.
 *
 * Component behavior:
 * - Loads news automatically on mount and when user preferences change
 * - Supports manual refresh with visual feedback
 * - Displays skeleton loading states during data fetching
 * - Sorts articles by publication date (newest first)
 * - Limits display to 20 articles for optimal performance
 * - Handles API errors gracefully with console logging
 *
 * @component
 * @returns {JSX.Element} The complete news feed page with header, controls, and article grid
 *
 * @example
 * ```tsx
 * // Used in Next.js app router
 * // File: app/news/page.tsx
 * export default function NewsPage() {
 *   // Component implementation
 * }
 * ```
 */
export default function NewsPage() {
  const { news, loading, refresh } = useNewsFeed();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Render skeleton loading state during initial data fetch
  // This provides immediate visual feedback while API requests are in progress
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header section with page title */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">AI News Feed</h1>
          </div>

          {/* Grid of skeleton cards to simulate actual news layout */}
          <div className="grid gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  {/* Animated skeleton content mimicking article structure */}
                  <div className="animate-pulse">
                    {/* Skeleton for article title */}
                    <div className="h-6 bg-muted rounded-sm mb-3"></div>
                    {/* Skeleton for article summary line 1 */}
                    <div className="h-4 bg-muted rounded-sm mb-2"></div>
                    {/* Skeleton for article summary line 2 (shorter) */}
                    <div className="h-4 bg-muted rounded-sm w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render the main news feed interface with articles and controls
  // This is the primary content state after successful data loading
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header section with page title and action buttons */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">AI News Feed</h1>

          {/* Control buttons for refresh and preferences */}
          <div className="flex gap-2">
            {/* Refresh button with loading state and spinner animation */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh} // Trigger refresh with loading indicator
              disabled={refreshing} // Prevent multiple simultaneous refreshes
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {/* Preferences button for future news source customization */}
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </Button>
          </div>
        </div>

        {/* Grid layout for news articles */}
        {/* Uses gap-6 for consistent spacing between article cards */}
        <div className="grid gap-6">
          {news.map((item, index) => (
            <NewsCard key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
