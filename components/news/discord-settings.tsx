"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface DiscordSettingsProps {
  userId: Id<"members">;
}

/**
 * Discord Settings Component
 *
 * Provides UI controls for managing Discord digest preferences including:
 * - Enable/disable toggle with immediate updates
 * - Current status display
 * - Channel selection interface (future enhancement)
 * - Error handling and user feedback
 */
export function DiscordSettings({ userId }: DiscordSettingsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  // Query Discord preferences for the current user
  const discordPreferences = useQuery(
    api.newsFeedSources.getDiscordPreferences,
    {
      userId,
    },
  );

  // Mutation to update Discord preferences
  const updateDiscordPreferences = useMutation(
    api.newsFeedSources.updateDiscordPreferences,
  );

  // Mutation for quick toggle functionality
  const toggleDiscordDigest = useMutation(
    api.newsFeedSources.toggleDiscordDigest,
  );

  /**
   * Handle Discord toggle with immediate preference updates
   * Provides user feedback through loading states and toast notifications
   */
  const handleToggleDiscord = async (enabled: boolean) => {
    setIsUpdating(true);

    try {
      await updateDiscordPreferences({
        userId,
        enabled,
        // For now, we don't specify channels (uses all channels)
        // This can be extended later for channel-specific filtering
      });

      toast.success(
        enabled
          ? "Discord digest enabled! You'll see Discord messages in your news feed."
          : "Discord digest disabled. Discord messages will no longer appear in your news feed.",
      );
    } catch (error) {
      console.error("Failed to update Discord preferences:", error);
      toast.error("Failed to update Discord settings. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Quick toggle function for convenience
   * Uses the dedicated toggle mutation for atomic operations
   */
  const handleQuickToggle = async () => {
    setIsUpdating(true);

    try {
      const newState = await toggleDiscordDigest({ userId });

      toast.success(
        newState ? "Discord digest enabled!" : "Discord digest disabled.",
      );
    } catch (error) {
      console.error("Failed to toggle Discord digest:", error);
      toast.error("Failed to update Discord settings. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Show loading state while preferences are being fetched
  if (discordPreferences === undefined) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="bg-muted mb-2 h-6 w-1/3 rounded"></div>
          <div className="bg-muted mb-4 h-4 w-2/3 rounded"></div>
          <div className="bg-muted h-10 w-full rounded"></div>
        </div>
      </div>
    );
  }

  const isEnabled = discordPreferences?.enabled || false;
  const guildId = discordPreferences?.guildId;

  return (
    <div className="space-y-6">
      {/* Main Toggle Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <Label htmlFor="discord-toggle" className="text-base font-medium">
              Enable Discord Digest
            </Label>
            {isEnabled && (
              <Badge
                variant="outline"
                className="border-green-500 text-green-600"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Active
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Include popular Discord messages from yesterday in your news feed
          </p>
        </div>

        <Switch
          id="discord-toggle"
          checked={isEnabled}
          onCheckedChange={handleToggleDiscord}
          disabled={isUpdating}
        />
      </div>

      <Separator />

      {/* Status and Configuration Section */}
      <div className="space-y-4">
        <div>
          <h4 className="mb-2 text-sm font-medium">Configuration</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Server:</span>
              <span>VAI Discord</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guild ID:</span>
              <span className="font-mono text-xs">{guildId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Channels:</span>
              <span>All channels</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ranking:</span>
              <span>By reaction count</span>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-muted/50 rounded-none p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
            <div className="text-sm">
              <p className="text-foreground mb-1 font-medium">How it works</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Messages from the previous day are collected</li>
                <li>• Ranked by total reaction count (👍, ❤️, etc.)</li>
                <li>• Top messages appear in your news feed</li>
                <li>• Updates automatically with your news feed refresh</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {isEnabled && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickToggle}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              Quick Toggle
            </Button>
          </div>
        )}
      </div>

      {/* Future Channel Selection Interface */}
      {/* This section is prepared for future enhancement when channel-specific filtering is needed */}
      {false && isEnabled && (
        <>
          <Separator />
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">Channel Selection</h4>
              <p className="text-muted-foreground mb-3 text-sm">
                Choose specific channels to include in your digest (coming soon)
              </p>

              {/* Placeholder for channel selection UI */}
              <div className="bg-muted/30 rounded-none p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  Channel filtering will be available in a future update
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
