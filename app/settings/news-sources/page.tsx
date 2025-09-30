"use client";

import { Rss, Settings } from "lucide-react";
import { DiscordSettings } from "@/components/news/discord-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentMember } from "@/hooks/use-current-member";

/**
 * News Sources Settings Page
 *
 * Allows users to manage their news feed sources and preferences.
 * Currently focuses on Discord integration with room for future expansion.
 */
export default function NewsSourcesPage() {
  const { member, isLoading } = useCurrentMember();

  // Show loading state while member data is being fetched
  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3 mb-8"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!member) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground">
            Please sign in to manage your news source preferences.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">News Sources</h1>
        </div>
        <p className="text-muted-foreground">
          Customize your news feed by enabling or disabling different content sources.
        </p>
      </div>

      {/* Discord Integration Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Rss className="h-5 w-5" />
            <CardTitle>Discord Daily Digest</CardTitle>
          </div>
          <CardDescription>
            Get the most popular Discord messages from yesterday in your news feed. Messages are
            ranked by reaction count to surface the most engaging community discussions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DiscordSettings userId={member._id} />
        </CardContent>
      </Card>

      {/* Future Sources Section */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Sources</CardTitle>
          <CardDescription>
            More news sources and customization options coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Rss className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              RSS feeds, custom websites, and other sources will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
