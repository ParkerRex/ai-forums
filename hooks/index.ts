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

// Posts hooks
export * from "./posts";

// Member hooks
export * from "./members";

// Comment hooks
export * from "./comments";

// Common/utility hooks (excluding duplicates)
export { useOptimisticVote } from "./common/use-optimistic-vote";
export {
  useBookmarks,
  useBookmarksWithDetails,
  useIsBookmarked,
  useToggleBookmark,
} from "./use-bookmarks";
export {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationCount,
  type Notification,
  type NotificationEntityType,
  type NotificationType,
} from "./use-notifications";
export { useUserVotes } from "./use-user-votes";

// Admin hooks (excluding useUpdateMember which conflicts with members)
export {
  useAdminChurnAnalysis,
  useAdminMemberDetails,
  useAdminMembers,
  useAdminMemberStats,
  useAdminMetrics,
  useAdminMRRHistory,
  useReportedComments,
  useResolveReport,
  useUpdateMemberRole,
  useWebhookFailures,
  useWebhookHealth,
} from "./use-admin";
export * from "./use-categories";
export * from "./use-events";
export * from "./use-polls";
export * from "./use-realtime";
export * from "./use-resources";
export * from "./use-search";
export * from "./use-topics";
export * from "./use-discord-digest";

// Utility hooks
export * from "./use-console-branding";
export * from "./use-intersection-prefetch";
export * from "./use-mobile";
export * from "./use-mutation-error";
export * from "./use-network-status";
export * from "./use-search-hotkey";
export * from "./use-sort-hotkey";
export * from "./use-toast";
