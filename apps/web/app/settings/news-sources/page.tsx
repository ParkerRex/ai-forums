"use client";

import { useCurrentMember } from "@/hooks/use-current-member";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/web/components/ui/card";
import { DiscordSettings } from "@/web/components/news/discord-settings";
import { Rss, Settings } from "lucide-react";

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
          <div className="bg-muted mb-2 h-8 w-1/3 rounded"></div>
          <div className="bg-muted mb-8 h-4 w-2/3 rounded"></div>
          <div className="bg-muted h-32 rounded"></div>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!member) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Authentication Required</h1>
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
        <div className="mb-2 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">News Sources</h1>
        </div>
        <p className="text-muted-foreground">
          Customize your news feed by enabling or disabling different content
          sources.
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
            Get the most popular Discord messages from yesterday in your news
            feed. Messages are ranked by reaction count to surface the most
            engaging community discussions.
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
          <div className="py-8 text-center">
            <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Rss className="text-muted-foreground h-8 w-8" />
            </div>
            <p className="text-muted-foreground text-sm">
              RSS feeds, custom websites, and other sources will be available
              here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
