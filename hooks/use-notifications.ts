"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Notification = {
	id: string;
	type: string;
	entityType: string | null;
	entityId: string | null;
	message: string | null;
	read: boolean;
	createdAt: string;
	actor: {
		id: string;
		firstName: string;
		lastName: string;
		slug: string;
		avatarUrl: string | null;
	} | null;
};

type NotificationsResponse = {
	items: Notification[];
	unreadCount: number;
};

async function fetchNotifications(
	unreadOnly?: boolean,
): Promise<NotificationsResponse> {
	const params = unreadOnly ? "?unread=true" : "";
	const response = await fetch(`/api/notifications${params}`);
	if (!response.ok) {
		throw new Error("Failed to fetch notifications");
	}
	return response.json();
}

async function markNotificationsRead(
	notificationIds?: string[],
	markAll?: boolean,
): Promise<void> {
	const response = await fetch("/api/notifications", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ notificationIds, markAll }),
	});
	if (!response.ok) {
		throw new Error("Failed to mark notifications");
	}
}

export function useNotifications(unreadOnly?: boolean) {
	return useQuery({
		queryKey: ["notifications", { unreadOnly }],
		queryFn: () => fetchNotifications(unreadOnly),
		refetchInterval: 30000, // Refetch every 30 seconds
	});
}

export function useMarkNotificationsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			notificationIds,
			markAll,
		}: {
			notificationIds?: string[];
			markAll?: boolean;
		}) => markNotificationsRead(notificationIds, markAll),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
	});
}
