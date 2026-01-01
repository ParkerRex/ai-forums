"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type Resource = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  type: "article" | "video" | "course" | "documentation" | "tool" | "book" | "other";
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  isPaid: boolean;
  isFree: boolean;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  viewCount: number;
  topicId: string;
  memberId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  linkTitle: string | null;
  linkDescription: string | null;
  linkImage: string | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
  } | null;
};

type ResourcesResponse = {
  items: Resource[];
};

type CreateResourceData = {
  topicSlug: string;
  title: string;
  description?: string;
  url: string;
  type?: "article" | "video" | "course" | "documentation" | "tool" | "book" | "other";
  difficulty?: "beginner" | "intermediate" | "advanced";
  isPaid?: boolean;
  isFree?: boolean;
};

type UpdateResourceData = {
  resourceId: string;
  title?: string;
  description?: string;
  url?: string;
  type?: "article" | "video" | "course" | "documentation" | "tool" | "book" | "other";
  difficulty?: "beginner" | "intermediate" | "advanced";
  isPaid?: boolean;
  isFree?: boolean;
};

async function fetchResources(params: {
  topicSlug: string;
  sortBy?: string;
  searchTerm?: string;
}): Promise<ResourcesResponse> {
  const searchParams = new URLSearchParams();
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.searchTerm) searchParams.set("search", params.searchTerm);

  const url = `/api/topics/${encodeURIComponent(params.topicSlug)}/resources${
    searchParams.toString() ? `?${searchParams}` : ""
  }`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch resources");
  }
  return response.json();
}

async function fetchResource(resourceId: string): Promise<Resource | null> {
  const response = await fetch(`/api/resources/${resourceId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Failed to fetch resource");
  }
  return response.json();
}

async function createResource(data: CreateResourceData): Promise<Resource> {
  const { topicSlug, ...resourceData } = data;
  const response = await fetch(`/api/topics/${encodeURIComponent(topicSlug)}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resourceData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create resource");
  }
  return response.json();
}

async function updateResource(data: UpdateResourceData): Promise<Resource> {
  const { resourceId, ...updateData } = data;
  const response = await fetch(`/api/resources/${resourceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update resource");
  }
  return response.json();
}

async function deleteResource(resourceId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/resources/${resourceId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete resource");
  }
  return response.json();
}

async function voteOnResource(
  resourceId: string,
  voteType: "upvote" | "downvote" | "remove",
): Promise<{
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote: string | null;
  newVoteType: string | null;
}> {
  const response = await fetch(`/api/resources/${resourceId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voteType }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to vote");
  }
  return response.json();
}

async function fetchUserVote(resourceId: string): Promise<{ voteType: string | null }> {
  const response = await fetch(`/api/resources/${resourceId}/vote`);
  if (!response.ok) {
    return { voteType: null };
  }
  return response.json();
}

async function trackResourceView(resourceId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/resources/${resourceId}/view`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to track view");
  }
  return response.json();
}

/**
 * Hook to fetch resources for a topic
 */
export function useResources(options: {
  topicSlug: string;
  sortBy?: "newest" | "popular";
  searchTerm?: string;
}) {
  return useQuery({
    queryKey: queryKeys.resources.list(options),
    queryFn: () => fetchResources(options),
    enabled: !!options.topicSlug,
  });
}

/**
 * Hook to fetch a single resource
 */
export function useResource(resourceId: string) {
  return useQuery({
    queryKey: queryKeys.resources.detail(resourceId),
    queryFn: () => fetchResource(resourceId),
    enabled: !!resourceId,
  });
}

/**
 * Hook to create a new resource
 */
export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createResource,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.topics.detail(variables.topicSlug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.topics.all });
    },
  });
}

/**
 * Hook to update a resource
 */
export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateResource,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.detail(variables.resourceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
    },
  });
}

/**
 * Hook to delete a resource
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.topics.all });
    },
  });
}

/**
 * Hook to vote on a resource
 */
export function useVoteOnResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      resourceId,
      voteType,
    }: {
      resourceId: string;
      voteType: "upvote" | "downvote" | "remove";
    }) => voteOnResource(resourceId, voteType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.detail(variables.resourceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.votes.user("resource", variables.resourceId) });
    },
  });
}

/**
 * Hook to get user's vote on a resource
 */
export function useUserResourceVote(resourceId: string) {
  return useQuery({
    queryKey: queryKeys.votes.user("resource", resourceId),
    queryFn: () => fetchUserVote(resourceId),
    enabled: !!resourceId,
  });
}

/**
 * Hook to track resource view
 */
export function useTrackResourceView() {
  return useMutation({
    mutationFn: trackResourceView,
  });
}
