"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type VoteRecord = Record<string, "upvote">;

async function fetchUserVotesBatch(
	targetIds: string[],
	targetType: "post" | "comment" | "resource",
): Promise<VoteRecord> {
	if (targetIds.length === 0) return {};

	const response = await fetch("/api/votes/batch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ targetIds, targetType }),
	});

	if (!response.ok) {
		throw new Error("Failed to fetch votes");
	}

	return response.json();
}

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
	targetType: "post" | "comment" | "resource",
) {
	// Memoize the targetIds array to avoid unnecessary refetches
	const memoizedTargetIds = useMemo(
		() => targetIds,
		[targetIds.join(",")],
	);

	const { data: votes, isLoading } = useQuery({
		queryKey: ["votes", targetType, memoizedTargetIds],
		queryFn: () => fetchUserVotesBatch(memoizedTargetIds, targetType),
		enabled: targetIds.length > 0,
	});

	return {
		votes: votes ?? {},
		isLoading: isLoading && targetIds.length > 0,
	};
}

type Voter = {
	id: string;
	firstName: string;
	lastName: string;
	avatarUrl?: string;
	slug: string;
};

type VotersResponse = {
	voters: Voter[];
	hasMore: boolean;
	total: number;
};

async function fetchPostVoters(
	postId: string,
	limit = 10,
): Promise<VotersResponse> {
	const response = await fetch(
		`/api/votes/voters?targetId=${postId}&targetType=post&limit=${limit}`,
	);

	if (!response.ok) {
		throw new Error("Failed to fetch voters");
	}

	return response.json();
}

/**
 * Hook to fetch voters for a specific post
 */
export function usePostVoters(postId: string | undefined, limit = 10) {
	return useQuery({
		queryKey: ["voters", "post", postId, limit],
		queryFn: () => fetchPostVoters(postId!, limit),
		enabled: !!postId,
	});
}
