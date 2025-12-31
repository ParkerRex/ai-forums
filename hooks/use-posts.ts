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
	editedAt?: string | null;
	memberId: string;
	categoryId: string;
	status: string;
	isPinned?: boolean;
	pinScope?: "category" | "global" | "both";
	isLocked?: boolean;
	mediaUrl?: string | null;
	thumbnailUrl?: string | null;
	linkUrl?: string | null;
	linkTitle?: string | null;
	linkDescription?: string | null;
	linkImage?: string | null;
	linkPreviews?: Record<
		string,
		{
			title?: string;
			description?: string;
			image?: string;
			siteName?: string;
			url: string;
		}
	> | null;
	pollOptions?: Array<{ id: string; text: string; voteCount: number }> | null;
	pollEndsAt?: string | null;
	totalPollVotes?: number | null;
	attachments?: Array<{
		id: string;
		type: "image" | "video" | "pdf" | "youtube";
		url: string;
		thumbnailUrl?: string;
		width?: number;
		height?: number;
		aspectRatio?: number;
		order: number;
		pageCount?: number;
		fileSize?: number;
		videoId?: string;
		title?: string;
		duration?: string;
		channelName?: string;
		videoDuration?: string;
		format?: string;
		resolution?: string;
		codec?: string;
	}> | null;
	isFree?: boolean;
	isPaywalled?: boolean;
	fullContentRequiresTier?: string;
	member: {
		id: string;
		firstName: string;
		lastName: string;
		slug: string;
		avatarUrl: string | null;
		username?: string;
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
	attachments?: Array<{
		id: string;
		type: "image" | "video" | "pdf" | "youtube";
		url: string;
		thumbnailUrl?: string;
		width?: number;
		height?: number;
		aspectRatio?: number;
		order: number;
		// PDF specific
		pageCount?: number;
		fileSize?: number;
		// YouTube specific
		videoId?: string;
		title?: string;
		duration?: string;
		channelName?: string;
		// Video specific
		videoDuration?: string;
		format?: string;
		resolution?: string;
		codec?: string;
	}>;
	linkUrl?: string;
	linkTitle?: string;
	linkDescription?: string;
	linkImage?: string;
	mediaUrl?: string;
	thumbnailUrl?: string;
	aspectRatio?: number;
	mediaWidth?: number;
	mediaHeight?: number;
	preview?: string;
	isFree?: boolean;
	// Poll fields
	pollOptions?: string[];
	pollDuration?: number;
};

type UpdatePostData = {
	postId: string;
	title?: string;
	content?: string;
	categoryId?: string;
	type?: string;
	attachments?: unknown[];
	linkUrl?: string;
	linkTitle?: string;
	linkDescription?: string;
	linkImage?: string;
	mediaUrl?: string;
	thumbnailUrl?: string;
	editReason?: string;
	isFree?: boolean;
};

async function fetchPosts(params: {
	categoryId?: string;
	sortBy?: string;
	cursor?: string;
	limit?: number;
	freeOnly?: boolean;
}): Promise<PostsResponse> {
	const searchParams = new URLSearchParams();
	if (params.categoryId) searchParams.set("categoryId", params.categoryId);
	if (params.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params.cursor) searchParams.set("cursor", params.cursor);
	if (params.limit) searchParams.set("limit", params.limit.toString());
	if (params.freeOnly) searchParams.set("freeOnly", "true");

	const response = await fetch(`/api/posts?${searchParams}`);
	if (!response.ok) {
		throw new Error("Failed to fetch posts");
	}
	return response.json();
}

async function fetchPost(postId: string): Promise<Post | null> {
	const response = await fetch(`/api/posts/${postId}`);
	if (response.status === 404) {
		return null;
	}
	if (!response.ok) {
		throw new Error("Failed to fetch post");
	}
	return response.json();
}

async function fetchPostBySlug(slug: string): Promise<Post | null> {
	const response = await fetch(`/api/posts?slug=${encodeURIComponent(slug)}`);
	if (response.status === 404) {
		return null;
	}
	if (!response.ok) {
		throw new Error("Failed to fetch post");
	}
	const data = await response.json();
	return data.items?.[0] ?? null;
}

async function createPost(data: CreatePostData): Promise<Post & { postId: string; slug: string }> {
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

async function updatePost(
	data: UpdatePostData
): Promise<Post & { slug: string; categoryName?: string }> {
	const { postId, ...updateData } = data;
	const response = await fetch(`/api/posts/${postId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(updateData),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update post");
	}
	return response.json();
}

async function deletePost(postId: string): Promise<{ success: boolean }> {
	const response = await fetch(`/api/posts/${postId}`, {
		method: "DELETE",
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete post");
	}
	return response.json();
}

async function voteOnPost(
	postId: string,
	voteType: "upvote" | "downvote" | "remove"
): Promise<{
	upvotes: number;
	downvotes: number;
	netVotes: number;
	userVote: string | null;
	newVoteType: string | null;
}> {
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

async function pinPost(postId: string, scope: "category" | "global" | "both"): Promise<Post> {
	const response = await fetch(`/api/posts/${postId}/pin`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ scope }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to pin post");
	}
	return response.json();
}

async function unpinPost(postId: string): Promise<Post> {
	const response = await fetch(`/api/posts/${postId}/pin`, {
		method: "DELETE",
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to unpin post");
	}
	return response.json();
}

async function fetchUserVote(postId: string): Promise<{ voteType: string | null }> {
	const response = await fetch(`/api/posts/${postId}/vote`);
	if (!response.ok) {
		return { voteType: null };
	}
	return response.json();
}

async function fetchUserVotesBatch(
	targetIds: string[],
	targetType: "post" | "comment" | "resource"
): Promise<Record<string, string>> {
	if (targetIds.length === 0) return {};
	const response = await fetch(`/api/votes/batch`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ targetIds, targetType }),
	});
	if (!response.ok) {
		return {};
	}
	return response.json();
}

async function fetchPostVoters(postId: string): Promise<{
	voters: Array<{
		id: string;
		firstName: string;
		lastName: string;
		avatarUrl?: string;
		slug: string;
	}>;
	hasMore: boolean;
	total: number;
}> {
	const response = await fetch(`/api/posts/${postId}/voters`);
	if (!response.ok) {
		return { voters: [], hasMore: false, total: 0 };
	}
	return response.json();
}

async function fetchPostHistory(postId: string): Promise<
	Array<{
		id: string;
		postId: string;
		version: number;
		title: string;
		content: string;
		editorId: string;
		editedAt: string;
		editor: {
			id: string;
			firstName: string;
			lastName: string;
			avatarUrl?: string;
		} | null;
	}>
> {
	const response = await fetch(`/api/posts/${postId}/history`);
	if (!response.ok) {
		return [];
	}
	return response.json();
}

async function fetchLinkPreview(url: string): Promise<{
	title?: string;
	description?: string;
	image?: string;
	siteName?: string;
}> {
	const response = await fetch("/api/link-preview", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url }),
	});
	if (!response.ok) {
		return {};
	}
	return response.json();
}

async function generatePostPreview(
	title: string,
	content: string
): Promise<string> {
	const response = await fetch("/api/post-preview", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ title, content }),
	});
	if (!response.ok) {
		throw new Error("Failed to generate preview");
	}
	const data = await response.json();
	return data.preview;
}

export function usePosts(options?: {
	categoryId?: string;
	sortBy?: string;
	freeOnly?: boolean;
}) {
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

export function usePostBySlug(slug: string) {
	return useQuery({
		queryKey: ["posts", "bySlug", slug],
		queryFn: () => fetchPostBySlug(slug),
		enabled: !!slug,
	});
}

export function useCreatePost() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createPost,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			queryClient.invalidateQueries({ queryKey: ["categories"] });
		},
	});
}

export function useUpdatePost() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updatePost,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["posts", variables.postId] });
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
	});
}

export function useDeletePost() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deletePost,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			queryClient.invalidateQueries({ queryKey: ["categories"] });
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
			voteType: "upvote" | "downvote" | "remove";
		}) => voteOnPost(postId, voteType),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["posts", variables.postId] });
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			queryClient.invalidateQueries({ queryKey: ["userVote", variables.postId] });
		},
	});
}

export function usePinPost() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ postId, scope }: { postId: string; scope: "category" | "global" | "both" }) =>
			pinPost(postId, scope),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["posts", variables.postId] });
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
	});
}

export function useUnpinPost() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (postId: string) => unpinPost(postId),
		onSuccess: (_, postId) => {
			queryClient.invalidateQueries({ queryKey: ["posts", postId] });
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
	});
}

export function useUserVote(postId: string) {
	return useQuery({
		queryKey: ["userVote", postId],
		queryFn: () => fetchUserVote(postId),
		enabled: !!postId,
	});
}

export function useUserVotesBatch(
	targetIds: string[],
	targetType: "post" | "comment" | "resource"
) {
	return useQuery({
		queryKey: ["userVotes", targetType, targetIds],
		queryFn: () => fetchUserVotesBatch(targetIds, targetType),
		enabled: targetIds.length > 0,
	});
}

export function usePostVoters(postId: string) {
	return useQuery({
		queryKey: ["postVoters", postId],
		queryFn: () => fetchPostVoters(postId),
		enabled: !!postId,
	});
}

export function usePostHistory(postId: string) {
	return useQuery({
		queryKey: ["postHistory", postId],
		queryFn: () => fetchPostHistory(postId),
		enabled: !!postId,
	});
}

export function useLinkPreview() {
	return useMutation({
		mutationFn: fetchLinkPreview,
	});
}

export function useGeneratePostPreview() {
	return useMutation({
		mutationFn: ({ title, content }: { title: string; content: string }) =>
			generatePostPreview(title, content),
	});
}

// Re-export the Post type for use in components
export type { Post, CreatePostData, UpdatePostData };
