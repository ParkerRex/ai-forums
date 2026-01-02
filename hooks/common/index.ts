/**
 * Common hooks - shared utilities used across features
 */

// Re-export utility hooks for backwards compatibility
export {
  useBookmarks,
  useBookmarksWithDetails,
  useIsBookmarked,
  useToggleBookmark,
} from "../use-bookmarks";
export {
  type Notification,
  type NotificationEntityType,
  type NotificationType,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "../use-notifications";
export { useUserVotes } from "../use-user-votes";
export { useOptimisticVote } from "./use-optimistic-vote";
