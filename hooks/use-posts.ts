"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";

type Post = {
	id: string;
	title: string;
	content: string;
	slug: string;
	preview: string | null;
	type: string;
	upvotes: number;
	downvotes: number;
	netVotes: number;
	commentCount: number;
	viewCount: number;
	createdAt: string;
	member: {
		id: string;
		firstName: string;
		lastName: string;
		slug: string;
		avatarUrl: string | null;
	};
	category: {
		id: string;
		name: string;
		displayName: string;
		icon: string | null;
	};
};

type PostsResponse = {
	items: Post[];
	nextCursor: string | null;
};

type CreatePostData = {
	title: string;
	content: string;
	categoryId: string;
	type?: string;
	attachments?: unknown[];
	linkUrl?: string;
	isFree?: boolean;
};

async function fetchPosts(params: {
	categoryId?: string;
	sortBy?: string;
	cursor?: string;
	limit?: number;
}): Promise<PostsResponse> {
	const searchParams = new URLSearchParams();
	if (params.categoryId) searchParams.set("categoryId", params.categoryId);
	if (params.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params.cursor) searchParams.set("cursor", params.cursor);
	if (params.limit) searchParams.set("limit", params.limit.toString());

	const response = await fetch(`/api/posts?${searchParams}`);
	if (!response.ok) {
		throw new Error("Failed to fetch posts");
	}
	return response.json();
}

async function fetchPost(postId: string): Promise<Post> {
	const response = await fetch(`/api/posts/${postId}`);
	if (!response.ok) {
		throw new Error("Failed to fetch post");
	}
	return response.json();
}

async function createPost(data: CreatePostData): Promise<Post> {
	const response = await fetch("/api/posts", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create post");
	}
	return response.json();
}

async function voteOnPost(
	postId: string,
	voteType: "upvote" | "downvote",
): Promise<{ upvotes: number; downvotes: number; netVotes: number; userVote: string | null }> {
	const response = await fetch(`/api/posts/${postId}/vote`, {
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

export function usePosts(options?: { categoryId?: string; sortBy?: string }) {
	return useInfiniteQuery({
		queryKey: ["posts", options],
		queryFn: ({ pageParam }) =>
			fetchPosts({ ...options, cursor: pageParam as string | undefined }),
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: undefined as string | undefined,
	});
}

export function usePost(postId: string) {
	return useQuery({
		queryKey: ["posts", postId],
		queryFn: () => fetchPost(postId),
		enabled: !!postId,
	});
}

export function useCreatePost() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createPost,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
	});
}

export function useVoteOnPost() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			postId,
			voteType,
		}: {
			postId: string;
			voteType: "upvote" | "downvote";
		}) => voteOnPost(postId, voteType),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["posts", variables.postId] });
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
	});
}
