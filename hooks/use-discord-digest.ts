"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import type { NewsItem } from "../features/news/utils/news-sources/types";
import { useCurrentMember } from "./use-current-member";

// Discord digest entry interface (matches database schema)
interface DiscordDigestEntry {
  messageId: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  timestamp: number;
  reactions: Array<{
    emoji: string;
    count: number;
  }>;
  channelId: string;
  channelName: string;
  reactionScore: number;
  summary?: string;
  digestDate: string;
  processedAt: number;
}

// Discord preferences interface
interface DiscordPreferences {
  enabled: boolean;
  guildId?: string;
  channels?: string[];
}

// Cache configuration
const CACHE_KEY = "discord-digest";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Local storage cache interface
interface CachedDiscordData {
  data: NewsItem[];
  timestamp: number;
  expiresAt: number;
}

async function fetchDiscordDigest(userId: string, limit: number): Promise<DiscordDigestEntry[]> {
  const response = await fetch(`/api/discord/digest?userId=${userId}&limit=${limit}`);
  if (!response.ok) {
    throw new Error("Failed to fetch Discord digest");
  }
  const data = await response.json();
  return data.entries || [];
}

async function fetchDiscordPreferences(): Promise<DiscordPreferences> {
  const response = await fetch("/api/discord/preferences");
  if (!response.ok) {
    throw new Error("Failed to fetch Discord preferences");
  }
  return response.json();
}

/**
 * Transform Discord digest entry to NewsItem format
 */
function transformDiscordEntryToNewsItem(entry: DiscordDigestEntry): NewsItem {
  const defaultGuildId = "1355280592962453585"; // VAI Discord server

  const maxContentLength = 100;
  const reactionCount = entry.reactions.reduce((sum, r) => sum + r.count, 0);

  let title: string;
  if (entry.content?.trim()) {
    const truncatedContent =
      entry.content.length > maxContentLength
        ? `${entry.content.substring(0, maxContentLength)}...`
        : entry.content;

    const reactionIndicator = reactionCount > 0 ? ` (${reactionCount} reactions)` : "";
    title = `${entry.author.username}: ${truncatedContent}${reactionIndicator}`;
  } else {
    const reactionIndicator = reactionCount > 0 ? ` with ${reactionCount} reactions` : "";
    title = `${entry.author.username} in #${entry.channelName}${reactionIndicator}`;
  }

  const url = `https://discord.com/channels/${defaultGuildId}/${entry.channelId}/${entry.messageId}`;

  return {
    title,
    url,
    publishedDate: new Date(entry.timestamp).toISOString(),
    author: entry.author.username,
    summary:
      entry.summary ||
      (entry.content
        ? entry.content.length > 150
          ? `${entry.content.substring(0, 150)}...`
          : entry.content
        : `Message from ${entry.author.username} in #${entry.channelName}`),
    source: "Discord",
  };
}

/**
 * Custom hook for Discord digest functionality
 */
export function useDiscordDigest(limit?: number) {
  const { member } = useCurrentMember();

  // React Query for Discord digest
  const { data: discordDigestData, isLoading: digestLoading } = useQuery({
    queryKey: ["discordDigest", member?.id, limit || 20],
    queryFn: () => fetchDiscordDigest(member!.id, limit || 20),
    enabled: !!member,
  });

  // React Query for Discord preferences
  const { data: discordPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["discordPreferences", member?.id],
    queryFn: fetchDiscordPreferences,
    enabled: !!member,
  });

  // Transform raw Discord digest data to NewsItems
  const messages = useMemo(() => {
    if (!discordDigestData || !Array.isArray(discordDigestData)) {
      return [];
    }

    try {
      return discordDigestData.map(transformDiscordEntryToNewsItem);
    } catch (error) {
      console.error("Failed to transform Discord digest data:", error);
      return [];
    }
  }, [discordDigestData]);

  // Save to localStorage cache when data changes
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const now = Date.now();
        const cacheData: CachedDiscordData = {
          data: messages,
          timestamp: now,
          expiresAt: now + CACHE_DURATION,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      } catch (error) {
        console.error("Failed to save Discord digest to cache:", error);
      }
    }
  }, [messages]);

  // Load cached data from localStorage
  const loadFromCache = useCallback((): NewsItem[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsedCache: CachedDiscordData = JSON.parse(cached);
      const now = Date.now();

      if (parsedCache.expiresAt > now) {
        return parsedCache.data;
      }

      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error("Failed to load Discord digest from cache:", error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  // Manual refresh function
  const refresh = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error("Failed to clear cache during refresh:", error);
    }
  }, []);

  // Clear cache utility function
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error("Failed to clear Discord digest cache:", error);
    }
  }, []);

  const loading = digestLoading || preferencesLoading;

  // Determine error state
  const error = useMemo(() => {
    if (!member) {
      return "Please sign in to view Discord digest";
    }

    if (preferencesLoading) {
      return null;
    }

    if (!discordPreferences?.enabled) {
      return "Discord digest is not enabled. Please enable it in your news source settings.";
    }

    if (!loading && (!discordDigestData || discordDigestData.length === 0)) {
      const cachedData = loadFromCache();
      if (cachedData && cachedData.length > 0) {
        return "Unable to load fresh Discord data (showing cached content)";
      }
      return null;
    }

    return null;
  }, [member, discordPreferences, loading, discordDigestData, loadFromCache, preferencesLoading]);

  // Use cached data if we have an error and no fresh data
  const finalMessages = useMemo(() => {
    if (messages.length > 0) {
      return messages;
    }

    if (error?.includes("cached content")) {
      const cachedData = loadFromCache();
      return cachedData || [];
    }

    return messages;
  }, [messages, error, loadFromCache]);

  return {
    messages: finalMessages,
    loading,
    error,
    preferences: discordPreferences || null,
    preferencesLoading,
    refresh,
    clearCache,
    isEnabled: discordPreferences?.enabled || false,
    hasMessages: finalMessages.length > 0,
    isEmpty: !loading && finalMessages.length === 0 && !error,
  };
}

/**
 * Lightweight hook for checking Discord preferences only
 */
export function useDiscordPreferences() {
  const { member } = useCurrentMember();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["discordPreferences", member?.id],
    queryFn: fetchDiscordPreferences,
    enabled: !!member,
  });

  return {
    preferences,
    loading: isLoading,
    isEnabled: preferences?.enabled || false,
  };
}
