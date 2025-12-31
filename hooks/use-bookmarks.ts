"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Bookmark {
	id: string;
	memberId: string;
	targetId: string;
	targetType: "post" | "comment" | "resource";
	createdAt: string;
}

async function getBookmarks(): Promise<Bookmark[]> {
	const res = await fetch("/api/bookmarks");
	if (!res.ok) {
		throw new Error("Failed to fetch bookmarks");
	}
	return res.json();
}

async function toggleBookmark(data: {
	targetId: string;
	targetType: "post" | "comment" | "resource";
}): Promise<{ bookmarked: boolean }> {
	const res = await fetch("/api/bookmarks", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		throw new Error("Failed to toggle bookmark");
	}
	return res.json();
}

export function useBookmarks() {
	return useQuery({
		queryKey: ["bookmarks"],
		queryFn: getBookmarks,
	});
}

export function useIsBookmarked(
	targetId: string,
	targetType: "post" | "comment" | "resource",
) {
	const { data: bookmarks } = useBookmarks();
	return bookmarks?.some(
		(b) => b.targetId === targetId && b.targetType === targetType,
	);
}

export function useToggleBookmark() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: toggleBookmark,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
		},
	});
}
