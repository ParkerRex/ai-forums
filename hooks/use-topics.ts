"use client";

import { useQuery } from "@tanstack/react-query";

export type Topic = {
	id: string;
	name: string;
	displayName: string;
	description: string | null;
	icon: string | null;
	resourceCount: number;
	status: string;
	createdAt: string;
	updatedAt: string;
};

async function fetchTopics(searchTerm?: string): Promise<{ items: Topic[] }> {
	const params = new URLSearchParams();
	if (searchTerm) {
		params.set("search", searchTerm);
	}
	const url = `/api/topics${params.toString() ? `?${params}` : ""}`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Failed to fetch topics");
	}
	return response.json();
}

async function fetchTopic(topicSlug: string): Promise<Topic | null> {
	const response = await fetch(`/api/topics/${encodeURIComponent(topicSlug)}`);
	if (response.status === 404) {
		return null;
	}
	if (!response.ok) {
		throw new Error("Failed to fetch topic");
	}
	return response.json();
}

/**
 * Hook to fetch all topics with optional search
 */
export function useTopics(searchTerm?: string) {
	return useQuery({
		queryKey: ["topics", searchTerm],
		queryFn: () => fetchTopics(searchTerm),
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

/**
 * Hook to fetch a single topic by name or id
 */
export function useTopic(topicSlug: string) {
	return useQuery({
		queryKey: ["topics", topicSlug],
		queryFn: () => fetchTopic(topicSlug),
		enabled: !!topicSlug,
	});
}

/**
 * Hook to fetch topic by name - alias for useTopic
 */
export function useTopicByName(topicName: string) {
	return useTopic(topicName);
}
