import { useState, useCallback, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCurrentMember } from "./use-current-member";

// NewsItem interface matching the Discord API response
interface NewsItem {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
}

// Discord preferences interface
interface DiscordPreferences {
  enabled: boolean;
  guildId: string;
  channels?: string[];
}

// Hook state interface
interface DiscordDigestState {
  messages: NewsItem[];
  loading: boolean;
  error: string | null;
  preferences: DiscordPreferences | null;
  preferencesLoading: boolean;
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
 * Custom hook for Discord digest functionality on the dedicated Discord page
 * Provides Discord-only data fetching with loading states, error handling, and manual refresh
 * Requirements: 4.2, 4.3 - Discord digest page functionality and manual refresh
 */
export function useDiscordDigest(limit?: number) {
  const { member } = useCurrentMember();
  const [state, setState] = useState<DiscordDigestState>({
    messages: [],
    loading: true,
    error: null,
    preferences: null,
    preferencesLoading: true,
  });

  // Convex actions and queries
  const getDiscordDigest = useAction(api.discord.getDiscordDigest);
  const discordPreferences = useQuery(
    api.newsFeedSources.getDiscordPreferences,
    member ? { userId: member._id } : "skip"
  );

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

  // Save data to localStorage cache
  const saveToCache = useCallback((data: NewsItem[]) => {
    try {
      const now = Date.now();
      const cacheData: CachedDiscordData = {
        data,
        timestamp: now,
        expiresAt: now + CACHE_DURATION,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Failed to save Discord digest to cache:", error);
    }
  }, []);

  // Fetch Discord messages with error handling and retry logic
  const fetchDiscordMessages = useCallback(async (skipCache = false): Promise<NewsItem[]> => {
    // Try cache first unless explicitly skipping
    if (!skipCache) {
      const cachedData = loadFromCache();
      if (cachedData) {
        return cachedData;
      }
    }

    try {
      const messages = await getDiscordDigest({
        userId: member?._id,
        limit: limit || 20,
      });

      // Save to cache for future use
      saveToCache(messages);
      return messages;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      // Provide user-friendly error messages based on error type
      if (errorMessage.includes("bot token")) {
        throw new Error("Discord integration is not available. Please contact support.");
      } else if (errorMessage.includes("permission")) {
        throw new Error("Unable to access Discord messages. Bot permissions may need updating.");
      } else if (errorMessage.includes("rate limit")) {
        throw new Error("Discord data temporarily unavailable. Please try again in a few minutes.");
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        throw new Error("Connection to Discord failed. Please check your internet connection.");
      } else {
        throw new Error(`Failed to load Discord messages: ${errorMessage}`);
      }
    }
  }, [getDiscordDigest, member?._id, limit, loadFromCache, saveToCache]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!member) {
      setState(prev => ({
        ...prev,
        error: "Please sign in to view Discord digest",
        loading: false,
      }));
      return;
    }

    // Check if Discord is enabled
    if (!discordPreferences?.enabled) {
      setState(prev => ({
        ...prev,
        messages: [],
        error: "Discord digest is not enabled. Please enable it in your news source settings.",
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const messages = await fetchDiscordMessages(true); // Skip cache for manual refresh
      setState(prev => ({
        ...prev,
        messages,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to refresh Discord messages";
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [member, discordPreferences?.enabled, fetchDiscordMessages]);

  // Initial load effect
  useEffect(() => {
    if (!member) {
      setState(prev => ({
        ...prev,
        loading: false,
        preferencesLoading: false,
        error: "Please sign in to view Discord digest",
      }));
      return;
    }

    // Update preferences state
    setState(prev => ({
      ...prev,
      preferences: discordPreferences || null,
      preferencesLoading: discordPreferences === undefined,
    }));

    // Don't fetch if preferences are still loading
    if (discordPreferences === undefined) {
      return;
    }

    // Check if Discord is enabled
    if (!discordPreferences?.enabled) {
      setState(prev => ({
        ...prev,
        messages: [],
        loading: false,
        error: "Discord digest is not enabled. Please enable it in your news source settings.",
      }));
      return;
    }

    // Fetch Discord messages
    const loadMessages = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const messages = await fetchDiscordMessages();
        setState(prev => ({
          ...prev,
          messages,
          loading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load Discord messages";
        
        // Try to load from cache as fallback
        const cachedData = loadFromCache();
        if (cachedData) {
          setState(prev => ({
            ...prev,
            messages: cachedData,
            loading: false,
            error: `${errorMessage} (showing cached content)`,
          }));
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
        }
      }
    };

    loadMessages();
  }, [member, discordPreferences, fetchDiscordMessages, loadFromCache]);

  // Clear cache utility function
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error("Failed to clear Discord digest cache:", error);
    }
  }, []);

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    preferences: state.preferences,
    preferencesLoading: state.preferencesLoading,
    refresh,
    clearCache,
    // Computed properties for convenience
    isEnabled: state.preferences?.enabled || false,
    hasMessages: state.messages.length > 0,
    isEmpty: !state.loading && state.messages.length === 0 && !state.error,
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