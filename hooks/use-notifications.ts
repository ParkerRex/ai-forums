"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type NotificationType =
  | "mention"
  | "reply"
  | "upvote"
  | "follow"
  | "comment_report"
  | "payment_reminder";

export type NotificationEntityType = "post" | "comment" | "payment";

export type Notification = {
  id: string;
  recipientId: string;
  actorId: string | null;
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
  postId: string | null;
  postSlug: string | null;
};

type NotificationsResponse = {
  items: Notification[];
  unreadCount: number;
};

type NotificationsOptions = {
  limit?: number;
  unreadOnly?: boolean;
};

async function fetchNotifications(options?: NotificationsOptions): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (options?.unreadOnly) {
    params.set("unread", "true");
  }
  if (options?.limit) {
    params.set("limit", options.limit.toString());
  }
  const queryString = params.toString();
  const url = queryString ? `/api/notifications?${queryString}` : "/api/notifications";

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return response.json();
}

async function fetchUnreadCount(): Promise<number> {
  const response = await fetch("/api/notifications/unread-count");
  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }
  const data = await response.json();
  return data.unreadCount;
}

async function markNotificationsRead(notificationIds?: string[], markAll?: boolean): Promise<void> {
  const response = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notificationIds, markAll }),
  });
  if (!response.ok) {
    throw new Error("Failed to mark notifications");
  }
}

async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch("/api/notifications/mark-all-read", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to mark all notifications");
  }
}

async function deleteNotification(notificationId: string): Promise<void> {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete notification");
  }
}

export function useNotifications(options?: NotificationsOptions) {
  const query = useQuery({
    queryKey: ["notifications", options],
    queryFn: () => fetchNotifications(options),
    refetchInterval: 30000, // Poll every 30 seconds for real-time feel
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Return just the items array to match component expectations
  return {
    ...query,
    data: query.data?.items,
    unreadCount: query.data?.unreadCount ?? 0,
  };
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 10000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationIds, markAll }: { notificationIds?: string[]; markAll?: boolean }) =>
      markNotificationsRead(notificationIds, markAll),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
