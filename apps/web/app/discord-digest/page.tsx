/**
 * @fileoverview Discord Daily Digest Page Component
 *
 * This is the dedicated Discord digest page that displays Discord-only content
 * from the VAI Discord server. It shows the most popular Discord messages
 * from the previous day, ranked by reaction count, with summaries and manual
 * refresh functionality.
 *
 * Key features:
 * - Displays Discord-only content with summaries
 * - Manual refresh functionality with loading states
 * - Error handling for Discord unavailability or disabled state
 * - Prompts users to enable Discord digest if not enabled
 * - Uses existing UI patterns from the news feed
 *
 * Requirements: 4.1, 4.4, 4.5
 * - 4.1: Dedicated Discord digest page at /discord-digest
 * - 4.4: Appropriate error messages when Discord is unavailable
 * - 4.5: Prompt to enable Discord digest if not enabled
 *
 * @component DiscordDigestPage
 * @requires useDiscordDigest hook for Discord data fetching
 * @requires NewsCard component for message display
 *
 * @author VAI Team
 * @since 1.0.0
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/web/components/ui/button";
import { Card, CardContent } from "@/web/components/ui/card";
import { Alert, AlertDescription } from "@/web/components/ui/alert";
import {
  RefreshCw,
  Settings,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { NewsCard } from "@/features/news/components";
import { useDiscordDigest } from "@/hooks/use-discord-digest";

/**
 * Discord Daily Digest page component that displays Discord-only content.
 *
 * This component serves as a dedicated interface for users to view Discord
 * messages from the VAI Discord server. It shows the most popular messages
 * from the previous day, ranked by reaction count, and provides manual refresh
 * functionality with appropriate error handling.
 *
 * Component behavior:
 * - Loads Discord messages automatically on mount
 * - Supports manual refresh with visual feedback
 * - Displays skeleton loading states during data fetching
 * - Shows error messages when Discord is unavailable or disabled
 * - Prompts users to enable Discord digest if not enabled
 * - Uses existing NewsCard component for consistent UI
 *
 * @component
 * @returns {JSX.Element} The complete Discord digest page
 */
export default function DiscordDigestPage() {
  const {
    messages,
    loading,
    error,
    preferencesLoading,
    refresh,
    isEnabled,
    hasMessages,
    isEmpty,
  } = useDiscordDigest();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Show loading state while preferences are being loaded
  if (preferencesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Discord Daily Digest</h1>
          </div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="bg-muted mb-3 h-6 rounded"></div>
                    <div className="bg-muted mb-2 h-4 rounded"></div>
                    <div className="bg-muted h-4 w-3/4 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show prompt to enable Discord digest if not enabled
  if (!isEnabled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Discord Daily Digest</h1>
          </div>

          <Alert className="mb-6">
            <MessageSquare className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Discord digest is not enabled. Enable it in your news source
                settings to see Discord messages here.
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings/news-sources">
                  <Settings className="mr-2 h-4 w-4" />
                  Enable in Settings
                </Link>
              </Button>
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
              <h3 className="mb-2 text-lg font-semibold">
                Discord Daily Digest
              </h3>
              <p className="text-muted-foreground mb-4">
                Get the most popular Discord messages from the VAI community,
                ranked by reactions. See what discussions you might have missed
                from yesterday.
              </p>
              <Button asChild>
                <Link href="/settings/news-sources">
                  <Settings className="mr-2 h-4 w-4" />
                  Enable Discord Digest
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading state while Discord messages are being fetched
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Discord Daily Digest</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings/news-sources">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="bg-muted mb-3 h-6 rounded"></div>
                    <div className="bg-muted mb-2 h-4 rounded"></div>
                    <div className="bg-muted mb-2 h-4 w-3/4 rounded"></div>
                    <div className="bg-muted h-3 w-1/2 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state when Discord is unavailable
  if (error && !hasMessages) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Discord Daily Digest</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Retry
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings/news-sources">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
              <h3 className="mb-2 text-lg font-semibold">
                Unable to Load Discord Messages
              </h3>
              <p className="text-muted-foreground mb-4">
                We&apos;re having trouble connecting to Discord right now.
                Please try again in a few minutes.
              </p>
              <Button onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show empty state when no messages are available
  if (isEmpty) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Discord Daily Digest</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings/news-sources">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
              <h3 className="mb-2 text-lg font-semibold">
                No Discord Messages Today
              </h3>
              <p className="text-muted-foreground mb-4">
                There were no popular Discord messages from yesterday. Check
                back tomorrow for new content!
              </p>
              <div className="flex justify-center gap-2">
                <Button onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button asChild variant="outline">
                  <a
                    href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Join Discord
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main content state - show Discord messages
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header section with page title and action buttons */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Discord Daily Digest</h1>
            <p className="text-muted-foreground mt-1">
              Popular messages from the VAI Discord community
            </p>
          </div>

          {/* Control buttons for refresh and settings */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/news-sources">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* Show error alert if there's an error but we have cached messages */}
        {error && hasMessages && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Grid layout for Discord messages using existing NewsCard component */}
        <div className="grid gap-6">
          {messages.map((item, index) => (
            <NewsCard key={`${item.url}-${index}`} item={item} />
          ))}
        </div>

        {/* Footer with Discord link */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-2 text-sm">
            Want to join the conversation?
          </p>
          <Button asChild variant="outline" size="sm">
            <a
              href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Join VAI Discord
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
