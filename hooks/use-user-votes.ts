"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Hook to batch fetch user votes for multiple items at once.
 * 
 * This hook optimizes performance by fetching all votes in a single query
 * instead of making individual queries per item. It's designed to be used
 * in list components that display multiple voteable items.
 * 
 * @param targetIds - Array of IDs to fetch votes for
 * @param targetType - Type of content (post, comment, or resource)
 * @returns Object containing the vote map and loading state
 * 
 * @example
 * ```typescript
 * const { votes, isLoading } = useUserVotes(postIds, "post");
 * // votes: { "post123": "upvote", "post789": "upvote" }
 * ```
 */
export function useUserVotes(
  targetIds: string[],
  targetType: "post" | "comment" | "resource"
) {
  // Memoize the targetIds array to avoid unnecessary refetches
  const memoizedTargetIds = useMemo(() => targetIds, [targetIds.join(",")]);

  const votes = useQuery(
    api.votes.getUserVotesBatch,
    targetIds.length > 0
      ? {
          targetIds: memoizedTargetIds,
          targetType,
        }
      : "skip"
  );

  return {
    votes: votes ?? {},
    isLoading: votes === undefined && targetIds.length > 0,
  };
} 