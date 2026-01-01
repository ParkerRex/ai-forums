/**
 * Common hooks - shared utilities used across features
 */

export { useOptimisticVote } from "./use-optimistic-vote";

// Re-export utility hooks for backwards compatibility
export {
  useBookmarks,
  useBookmarksWithDetails,
  useIsBookmarked,
  useToggleBookmark,
} from "../use-bookmarks";

export {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationCount,
  type Notification,
  type NotificationEntityType,
  type NotificationType,
} from "../use-notifications";

export { useUserVotes } from "../use-user-votes";
