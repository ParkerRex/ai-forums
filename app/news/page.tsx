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
 * @author VAI VEX Team
 * @since 1.0.0
 */

"use client";

// Import authentication hook to access user preferences and news source configuration
import { useCurrentMember } from "@/hooks/use-current-member";
// Import React hooks for state management and side effects
import { useEffect, useState } from "react";
// Import news card component for displaying individual articles
import { NewsCard } from "@/components/news/news-card";
// Import UI components for interactive elements
import { Button } from "@/components/ui/button";
// Import icons for refresh and settings buttons
import { Settings, RefreshCw } from "lucide-react";
// Import card components for skeleton loading states
import { Card, CardContent } from "@/components/ui/card";

/**
 * Represents a news article with all relevant metadata.
 *
 * This interface defines the structure of news items returned from the API
 * and displayed in the news feed. It includes optional fields to handle
 * varying data quality from different news sources.
 *
 * @interface NewsItem
 * @property {string} title - The headline or title of the news article
 * @property {string} url - Direct link to the full article on the source website
 * @property {string} [publishedDate] - Optional ISO date string when the article was published
 * @property {string} [author] - Optional author name or byline information
 * @property {string} [summary] - Optional AI-generated or article summary/excerpt
 * @property {string} source - Human-readable source name (e.g., "AI News", "TechCrunch")
 */
interface NewsItem {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
}

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
  // State for storing the fetched news articles array
  // Starts as empty array and gets populated by loadNews function
  const [news, setNews] = useState<NewsItem[]>([]);

  // State for tracking initial page load status
  // Controls display of skeleton loading states vs actual content
  const [loading, setLoading] = useState(true);

  // State for tracking manual refresh operations
  // Controls spinner animation on refresh button and prevents multiple simultaneous refreshes
  const [refreshing, setRefreshing] = useState(false);

  // Access current authenticated member for personalized news source preferences
  // Used to determine which custom news sources to query
  const { member } = useCurrentMember();

  /**
   * Loads and aggregates news articles from multiple sources.
   *
   * This function is the core of the news aggregation system. It fetches articles
   * from both default AI news sources and user-configured custom sources. The function
   * handles multiple concurrent API requests, processes responses, and sorts results
   * by publication date for optimal user experience.
   *
   * Process flow:
   * 1. Set loading states based on refresh context
   * 2. Define default news sources as fallback
   * 3. Use custom sources from user preferences if available
   * 4. Fetch general AI news (15 articles)
   * 5. Fetch from up to 2 custom sources (5 articles each)
   * 6. Combine, sort, and limit results to 20 articles
   * 7. Update component state with processed news
   *
   * @param {boolean} [showRefreshing=false] - Whether to show refresh loading indicator
   * @returns {Promise<void>} - Promise that resolves when news loading is complete
   *
   * @example
   * ```typescript
   * // Initial load on component mount
   * await loadNews();
   *
   * // Manual refresh with visual feedback
   * await loadNews(true);
   * ```
   */
  const loadNews = async (showRefreshing = false) => {
    // Set refreshing state if this is a manual refresh operation
    // This enables the spinning animation on the refresh button
    if (showRefreshing) setRefreshing(true);

    try {
      // Define default news sources for users without custom preferences
      // These sources provide reliable AI-focused content
      const defaultSources = [
        {
          type: "repository" as const, // GitHub repository source type
          url: "https://github.com/microsoft/chat-copilot",
          name: "Microsoft Copilot", // Human-readable source name
        },
        {
          type: "website" as const, // Website source type
          url: "https://x.ai/news", // x.ai official news page
          name: "x.ai News", // Human-readable source name
        },
      ];

      // Use custom sources from user preferences, fallback to defaults
      // This allows personalized news feeds based on user interests
      const customSources =
        member?.newsPreferences?.customSources || defaultSources;

      // Initialize results array to collect articles from all sources
      const results: NewsItem[] = [];

      // Fetch general AI news articles using broad search terms
      // This provides the foundation of content covering major AI developments
      const mainResponse = await fetch("/api/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Broad query to capture diverse AI-related news content
          query:
            "latest AI developments machine learning artificial intelligence",
          numResults: 15, // Request 15 articles for good coverage
        }),
      });

      // Process successful main news response
      // Extract articles and normalize them to our NewsItem interface
      if (mainResponse.ok) {
        const mainNews = await mainResponse.json();

        // Iterate through API results and transform to our standardized format
        // Handle potential missing or undefined results array gracefully
        for (const item of mainNews.results || []) {
          results.push({
            title: item.title, // Article headline
            url: item.url, // Direct link to full article
            publishedDate: item.publishedDate, // When the article was published
            author: item.author, // Article author if available
            summary: item.summary, // AI-generated summary
            source: "AI News", // Standardized source label
          });
        }
      }

      // Fetch articles from user's custom news sources
      // Limited to first 2 sources to maintain reasonable load times
      for (const source of customSources.slice(0, 2)) {
        try {
          // Make API request for each custom source with source-specific query
          // This provides personalized content based on user's interests
          const customResponse = await fetch("/api/news", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              // Create source-specific query for more relevant results
              query: `${source.name} latest updates`,
              numResults: 5, // Fewer results per source to maintain diversity

              // Extract domain from website sources for targeted searching
              // This ensures results come from the specified source domain
              includeDomains: (() => {
                // Only apply domain filtering for website sources
                if (source.type !== "website") return undefined;

                try {
                  // Parse hostname from source URL for domain filtering
                  const host = new URL(source.url).hostname;
                  return host ? [host] : undefined;
                } catch {
                  // Return undefined if URL parsing fails
                  // This allows the search to proceed without domain filtering
                  return undefined;
                }
              })(),
            }),
          });

          // Process successful custom source response
          // Add articles to results array with source attribution
          if (customResponse.ok) {
            const customNews = await customResponse.json();

            // Transform custom source results to standardized format
            // Use the custom source name for proper attribution
            for (const item of customNews.results || []) {
              results.push({
                title: item.title, // Article headline
                url: item.url, // Direct link to full article
                publishedDate: item.publishedDate, // Publication timestamp
                author: item.author, // Author information
                summary: item.summary, // Article summary
                source: source.name, // Use custom source name for attribution
              });
            }
          }
        } catch (error) {
          // Log custom source errors without breaking the overall news loading
          // This ensures one failing source doesn't prevent other sources from loading
          console.error(`Failed to fetch news from ${source.name}:`, error);
        }
      }

      /**
       * Safely converts date strings to timestamps for sorting.
       *
       * This helper function handles inconsistent date formats from different
       * news sources. It returns null for invalid dates to enable graceful
       * sorting where articles with invalid dates appear at the bottom.
       *
       * @param {string} [date] - Optional date string to convert
       * @returns {number | null} - Timestamp in milliseconds or null if invalid
       */
      const getTimestamp = (date?: string) => {
        // Return null immediately if no date provided
        if (!date) return null;

        // Attempt to parse date string to timestamp
        const ts = new Date(date).getTime();

        // Return null for invalid dates (NaN), valid timestamp otherwise
        return isNaN(ts) ? null : ts;
      };

      // Sort all collected articles by publication date (newest first)
      // Apply intelligent sorting that handles missing/invalid dates gracefully
      const sortedNews = results
        .sort((a, b) => {
          // Get timestamps for both articles, handling invalid dates
          const tsA = getTimestamp(a.publishedDate);
          const tsB = getTimestamp(b.publishedDate);

          // Both articles have invalid dates - maintain original order
          if (tsA === null && tsB === null) return 0;

          // Article A has invalid date - move to bottom
          if (tsA === null) return 1;

          // Article B has invalid date - move to bottom
          if (tsB === null) return -1;

          // Both articles have valid dates - sort newest first
          return tsB - tsA;
        })
        // Limit to 20 articles for optimal page performance and user experience
        .slice(0, 20);

      // Update component state with processed and sorted news articles
      setNews(sortedNews);
    } catch (error) {
      // Log errors for debugging while maintaining user experience
      // The UI will continue to show previous news or empty state
      console.error("Failed to load news:", error);
    } finally {
      // Always clean up loading states regardless of success or failure
      // This ensures the UI properly transitions from loading to content state
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Effect hook to load news when component mounts or user preferences change
  // This ensures fresh content when users update their news source preferences
  useEffect(() => {
    loadNews();
  }, [member?.newsPreferences, loadNews]); // Re-run when news preferences change

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
                    <div className="h-6 bg-muted rounded mb-3"></div>
                    {/* Skeleton for article summary line 1 */}
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    {/* Skeleton for article summary line 2 (shorter) */}
                    <div className="h-4 bg-muted rounded w-3/4"></div>
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
              onClick={() => loadNews(true)} // Trigger refresh with loading indicator
              disabled={refreshing} // Prevent multiple simultaneous refreshes
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
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
