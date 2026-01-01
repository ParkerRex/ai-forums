// Notification-related type definitions

export type NotificationType =
  | "mention"
  | "reply"
  | "upvote"
  | "follow"
  | "comment_report"
  | "payment_reminder";

export type NotificationEntityType = "post" | "comment" | "payment";

export interface NotificationActor {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  avatarUrl: string | null;
}

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType | string;
  entityType: NotificationEntityType | string | null;
  entityId: string | null;
  message: string | null;
  read: boolean;
  createdAt: string;
  actor: NotificationActor | null;
  postId: string | null;
  postSlug: string | null;
}

export interface NotificationsQueryOptions {
  limit?: number;
  unreadOnly?: boolean;
}

export interface MarkNotificationsInput {
  notificationIds?: string[];
  markAll?: boolean;
}
