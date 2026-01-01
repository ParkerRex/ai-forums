"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Create a QueryClient with optimized defaults for this application
 *
 * Configuration rationale:
 * - staleTime: 5 min - data remains fresh longer, reducing unnecessary refetches
 * - gcTime: 30 min - keep cached data around for faster back-navigation
 * - retry: Smart retry logic that doesn't retry 4xx errors
 * - refetchOnWindowFocus: false - prevent surprise refetches that can interrupt users
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,

        // Keep unused data in cache for 30 minutes (formerly cacheTime)
        gcTime: 30 * 60 * 1000,

        // Smart retry: don't retry on 4xx client errors
        retry: (failureCount, error) => {
          // Don't retry on client errors (4xx)
          if (error instanceof Error && "status" in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 3 times for server/network errors
          return failureCount < 3;
        },

        // Exponential backoff for retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Don't refetch on window focus - can be jarring for users
        refetchOnWindowFocus: false,

        // Don't refetch on reconnect by default
        refetchOnReconnect: false,

        // Keep showing stale data while refetching
        placeholderData: (previousData: unknown) => previousData,
      },
      mutations: {
        // Don't retry mutations by default - let the UI handle retries
        retry: false,

        // Global mutation error handling (can be overridden per-mutation)
        onError: (error) => {
          // Log mutation errors for debugging
          console.error("Mutation error:", error);
        },
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Use useState to ensure QueryClient is only created once per component lifecycle
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// Export for use in tests or SSR scenarios
export { createQueryClient };
