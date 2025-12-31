"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";

type Member = {
	id: string;
	firstName: string;
	lastName: string;
	slug: string;
	avatarUrl: string | null;
	bio: string | null;
	country: string | null;
	location: string | null;
	skills: string[] | null;
	postCount: number;
	commentCount: number;
	netVoteCount: number;
	joinedDate: string;
	lastOnline: string | null;
	role: string;
	email?: string;
	status?: string;
	tier?: string;
	subscriptionStatus?: string;
	subscriptionEndDate?: number | null;
	billingInterval?: string | null;
	linkGithub?: string | null;
	linkX?: string | null;
	linkYouTube?: string | null;
	websiteUrl?: string | null;
	linkedinUrl?: string | null;
};

type MembersResponse = {
	items: Member[];
};

type UpdateMemberData = {
	firstName?: string;
	lastName?: string;
	bio?: string;
	country?: string;
	location?: string;
	websiteUrl?: string;
	linkedinUrl?: string;
	linkGithub?: string;
	linkX?: string;
	linkYouTube?: string;
	skills?: string[];
	avatarUrl?: string;
};

async function fetchMembers(options?: {
	limit?: number;
	search?: string;
	status?: string;
}): Promise<MembersResponse> {
	const searchParams = new URLSearchParams();
	if (options?.limit) searchParams.set("limit", options.limit.toString());
	if (options?.search) searchParams.set("search", options.search);
	if (options?.status) searchParams.set("status", options.status);

	const response = await fetch(`/api/members?${searchParams}`);
	if (!response.ok) {
		throw new Error("Failed to fetch members");
	}
	return response.json();
}

async function fetchMember(memberId: string): Promise<Member> {
	const response = await fetch(`/api/members/${memberId}`);
	if (!response.ok) {
		if (response.status === 404) {
			throw new Error("Member not found");
		}
		throw new Error("Failed to fetch member");
	}
	return response.json();
}

async function fetchOnlineMembers(): Promise<Member[]> {
	const response = await fetch("/api/members?status=active&limit=20");
	if (!response.ok) {
		throw new Error("Failed to fetch online members");
	}
	const data = await response.json();
	// Filter to only include members who were online in the last 5 minutes
	const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
	return data.items.filter(
		(member: Member) =>
			member.lastOnline && new Date(member.lastOnline).getTime() > fiveMinutesAgo,
	);
}

async function updateMember(
	memberId: string,
	data: UpdateMemberData,
): Promise<Member> {
	const response = await fetch(`/api/members/${memberId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update member");
	}
	return response.json();
}

/**
 * Hook to fetch a list of members
 */
export function useMembers(options?: {
	limit?: number;
	search?: string;
	status?: string;
}) {
	return useQuery({
		queryKey: ["members", options],
		queryFn: () => fetchMembers(options),
	});
}

/**
 * Hook to fetch a single member by ID or slug
 */
export function useMember(memberId: string | undefined) {
	return useQuery({
		queryKey: ["members", memberId],
		queryFn: () => fetchMember(memberId!),
		enabled: !!memberId,
	});
}

/**
 * Hook to fetch online members
 */
export function useOnlineMembers() {
	return useQuery({
		queryKey: ["members", "online"],
		queryFn: fetchOnlineMembers,
		refetchInterval: 60000, // Refetch every minute
	});
}

/**
 * Hook to update a member's profile
 */
export function useUpdateMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			memberId,
			data,
		}: {
			memberId: string;
			data: UpdateMemberData;
		}) => updateMember(memberId, data),
		onSuccess: (updatedMember, variables) => {
			// Update the specific member in cache
			queryClient.setQueryData(
				["members", variables.memberId],
				updatedMember,
			);
			// Invalidate member list queries
			queryClient.invalidateQueries({ queryKey: ["members"] });
			// Also invalidate auth cache since the current user might have been updated
			queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
		},
	});
}

// Member posts types and fetch functions
type MemberPost = {
	id: string;
	title: string;
	content: string;
	slug: string;
	createdAt: string;
	upvotes: number;
	downvotes: number;
	netVotes: number;
	commentCount: number;
	viewCount: number;
	member?: {
		id: string;
		firstName: string;
		lastName: string;
		slug: string;
		avatarUrl: string | null;
	};
	category?: {
		id: string;
		name: string;
		displayName: string;
		icon?: string | null;
	};
};

type MemberPostsResponse = {
	items: MemberPost[];
	nextCursor: string | null;
};

type MemberActivity = {
	id: string;
	type: "comment";
	content: string;
	createdAt: string;
	timeAgo?: string;
	postId: string;
	post?: {
		title?: string;
		slug?: string;
		categoryName?: string;
	};
	netVotes: number;
};

type MemberActivityResponse = {
	items: MemberActivity[];
	nextCursor: string | null;
};

async function fetchMemberPosts(
	memberId: string,
	cursor?: string
): Promise<MemberPostsResponse> {
	const params = new URLSearchParams();
	if (cursor) params.set("cursor", cursor);

	const response = await fetch(`/api/members/${memberId}/posts?${params}`);
	if (!response.ok) {
		throw new Error("Failed to fetch member posts");
	}
	return response.json();
}

async function fetchMemberActivity(
	memberId: string,
	cursor?: string
): Promise<MemberActivityResponse> {
	const params = new URLSearchParams();
	if (cursor) params.set("cursor", cursor);

	const response = await fetch(`/api/members/${memberId}/activity?${params}`);
	if (!response.ok) {
		throw new Error("Failed to fetch member activity");
	}
	return response.json();
}

/**
 * Hook to fetch a member's posts with pagination
 */
export function useMemberPosts(memberId: string | undefined) {
	return useInfiniteQuery({
		queryKey: ["memberPosts", memberId],
		queryFn: ({ pageParam }) => fetchMemberPosts(memberId!, pageParam as string | undefined),
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: undefined as string | undefined,
		enabled: !!memberId,
	});
}

/**
 * Hook to fetch a member's activity with pagination
 */
export function useMemberActivity(memberId: string | undefined) {
	return useInfiniteQuery({
		queryKey: ["memberActivity", memberId],
		queryFn: ({ pageParam }) => fetchMemberActivity(memberId!, pageParam as string | undefined),
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: undefined as string | undefined,
		enabled: !!memberId,
	});
}

// Re-export Member type
export type { Member };
