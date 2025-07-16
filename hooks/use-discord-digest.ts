import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCurrentMember } from "./use-current-member";
import type { NewsItem } from "../features/news/utils/news-sources/types";

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
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (matching localStorage pattern)

// Local storage cache interface
interface CachedDiscordData {
  data: NewsItem[];
  timestamp: number;
  expiresAt: number;
}

/**
 * Transform Discord digest entry to NewsItem format
 * Requirements: 2.4 - Transform Discord messages to NewsItem interface format
 */
function transformDiscordEntryToNewsItem(entry: DiscordDigestEntry): NewsItem {
  const defaultGuildId = "1355280592962453585"; // VAI VEX Discord server
  
  // Create meaningful title from the message
  const maxContentLength = 100;
  const reactionCount = entry.reactions.reduce((sum, r) => sum + r.count, 0);
  
  let title: string;
  if (entry.content && entry.content.trim()) {
    const truncatedContent = entry.content.length > maxContentLength 
      ? `${entry.content.substring(0, maxContentLength)}...`
      : entry.content;
    
    const reactionIndicator = reactionCount > 0 ? ` (${reactionCount} reactions)` : '';
    title = `${entry.author.username}: ${truncatedContent}${reactionIndicator}`;
  } else {
    const reactionIndicator = reactionCount > 0 ? ` with ${reactionCount} reactions` : '';
    title = `${entry.author.username} in #${entry.channelName}${reactionIndicator}`;
  }
  
  // Create Discord message URL
  const url = `https://discord.com/channels/${defaultGuildId}/${entry.channelId}/${entry.messageId}`;
  
  return {
    title,
    url,
    publishedDate: new Date(entry.timestamp).toISOString(),
    author: entry.author.username,
    summary: entry.summary || (entry.content ? 
      (entry.content.length > 150 ? `${entry.content.substring(0, 150)}...` : entry.content) :
      `Message from ${entry.author.username} in #${entry.channelName}`
    ),
    source: "Discord",
  };
}

/**
 * Custom hook for Discord digest functionality on the dedicated Discord page
 * Provides Discord-only data fetching with loading states, error handling, and manual refresh
 * Requirements: 4.2, 4.3 - Discord digest page functionality and manual refresh
 */
export function useDiscordDigest(limit?: number) {
  const { member } = useCurrentMember();

  // Convex queries
  const discordDigestData = useQuery(
    api.discord.getDiscordDigest,
    member ? { 
      userId: member._id, 
      limit: limit || 20
    } : "skip"
  );
  const discordPreferences = useQuery(
    api.newsFeedSources.getDiscordPreferences,
    member ? { userId: member._id } : "skip"
  );

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

      // Check if cache is still valid
      if (parsedCache.expiresAt > now) {
        return parsedCache.data;
      }

      // Remove expired cache
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error("Failed to load Discord digest from cache:", error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  // Manual refresh function - clears cache and forces component re-render
  const refresh = useCallback(() => {
    // Clear the cache to force fresh data
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error("Failed to clear cache during refresh:", error);
    }
    
    // Note: Convex queries automatically refetch when their dependencies change
    // The cache clearing will ensure we don't show stale cached data
    // The query will naturally refetch due to Convex's reactive nature
  }, []);

  // Clear cache utility function
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error("Failed to clear Discord digest cache:", error);
    }
  }, []);

  // Determine loading state
  const loading = discordDigestData === undefined || discordPreferences === undefined;
  
  // Determine error state
  const error = useMemo(() => {
    if (!member) {
      return "Please sign in to view Discord digest";
    }
    
    if (discordPreferences === undefined) {
      return null; // Still loading preferences
    }
    
    if (!discordPreferences?.enabled) {
      return "Discord digest is not enabled. Please enable it in your news source settings.";
    }
    
    // If we have no data and we're not loading, there might be an issue
    if (!loading && (!discordDigestData || discordDigestData.length === 0)) {
      // Try to load from cache as fallback
      const cachedData = loadFromCache();
      if (cachedData && cachedData.length > 0) {
        return "Unable to load fresh Discord data (showing cached content)";
      }
      return null; // No error, just no data available
    }
    
    return null;
  }, [member, discordPreferences, loading, discordDigestData, loadFromCache]);

  // Use cached data if we have an error and no fresh data
  const finalMessages = useMemo(() => {
    if (messages.length > 0) {
      return messages;
    }
    
    // If we have an error but no fresh data, try to use cached data
    if (error && error.includes("cached content")) {
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
    preferencesLoading: discordPreferences === undefined,
    refresh,
    clearCache,
    // Computed properties for convenience
    isEnabled: discordPreferences?.enabled || false,
    hasMessages: finalMessages.length > 0,
    isEmpty: !loading && finalMessages.length === 0 && !error,
  };
}

/**
 * Lightweight hook for checking Discord preferences only
 * Useful for components that only need to know if Discord is enabled
 */
export function useDiscordPreferences() {
  const { member } = useCurrentMember();
  const preferences = useQuery(
    api.newsFeedSources.getDiscordPreferences,
    member ? { userId: member._id } : "skip"
  );

  return {
    preferences,
    loading: preferences === undefined,
    isEnabled: preferences?.enabled || false,
  };
}