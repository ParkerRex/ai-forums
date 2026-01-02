/**
 * Hooks Index - Centralized exports for backwards compatibility
 *
 * This file re-exports all hooks from feature-based folders to maintain
 * backwards compatibility with existing imports like:
 *   import { usePosts } from "@/hooks"
 *
 * New code should prefer feature-based imports:
 *   import { usePosts } from "@/hooks/posts"
 *   import { useCurrentMember } from "@/hooks/members"
 */

// Comment hooks
export * from "./comments";
// Common/utility hooks (excluding duplicates)
export { useOptimisticVote } from "./common/use-optimistic-vote";
// Member hooks
export * from "./members";
// Posts hooks
export * from "./posts";
// Admin hooks (excluding useUpdateMember which conflicts with members)
export {
  useAdminChurnAnalysis,
  useAdminMemberDetails,
  useAdminMemberStats,
  useAdminMembers,
  useAdminMetrics,
  useAdminMRRHistory,
  useReportedComments,
  useResolveReport,
  useUpdateMemberRole,
  useWebhookFailures,
  useWebhookHealth,
} from "./use-admin";
export {
  useBookmarks,
  useBookmarksWithDetails,
  useIsBookmarked,
  useToggleBookmark,
} from "./use-bookmarks";
export * from "./use-categories";
// Utility hooks
export * from "./use-console-branding";
export * from "./use-discord-digest";
export * from "./use-events";
export * from "./use-intersection-prefetch";
export * from "./use-mobile";
export * from "./use-mutation-error";
export * from "./use-network-status";
export {
  type Notification,
  type NotificationEntityType,
  type NotificationType,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "./use-notifications";
export * from "./use-polls";
export * from "./use-realtime";
export * from "./use-resources";
export * from "./use-search";
export * from "./use-search-hotkey";
export * from "./use-sort-hotkey";
export * from "./use-toast";
export * from "./use-topics";
export { useUserVotes } from "./use-user-votes";
