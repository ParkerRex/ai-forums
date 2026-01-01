/**
 * Query Key Factory for React Query
 *
 * Provides type-safe, consistent query keys across the application.
 * This prevents typos, makes invalidation predictable, and enables
 * hierarchical cache invalidation.
 *
 * @example
 * ```typescript
 * // Using query keys
 * useQuery({
 *   queryKey: queryKeys.posts.list({ categoryId: "abc" }),
 *   queryFn: () => fetchPosts({ categoryId: "abc" }),
 * });
 *
 * // Invalidating all posts
 * queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
 *
 * // Invalidating a specific post
 * queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
 * ```
 */

export const queryKeys = {
  // Posts
  posts: {
    all: ["posts"] as const,
    lists: () => [...queryKeys.posts.all, "list"] as const,
    list: (filters?: { categoryId?: string; sortBy?: string; freeOnly?: boolean }) =>
      [...queryKeys.posts.all, filters] as const,
    details: () => [...queryKeys.posts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.posts.all, id] as const,
    bySlug: (slug: string) => [...queryKeys.posts.all, "bySlug", slug] as const,
    history: (id: string) => ["postHistory", id] as const,
    voters: (id: string) => ["postVoters", id] as const,
  },

  // Members
  members: {
    all: ["members"] as const,
    lists: () => [...queryKeys.members.all, "list"] as const,
    list: (filters?: { search?: string; status?: string; limit?: number }) =>
      [...queryKeys.members.lists(), filters] as const,
    details: () => [...queryKeys.members.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.members.details(), id] as const,
    bySlug: (slug: string) => [...queryKeys.members.all, "bySlug", slug] as const,
    online: () => [...queryKeys.members.all, "online"] as const,
    posts: (id: string) => [...queryKeys.members.detail(id), "posts"] as const,
    activity: (id: string) => [...queryKeys.members.detail(id), "activity"] as const,
  },

  // Comments
  comments: {
    all: ["comments"] as const,
    byPost: (postId: string, options?: { sortBy?: string; flat?: boolean }) =>
      [...queryKeys.comments.all, "post", postId, options] as const,
  },

  // Votes
  votes: {
    all: ["votes"] as const,
    user: (targetType: string, targetId: string) =>
      [...queryKeys.votes.all, "user", targetType, targetId] as const,
    userVote: (postId: string) => ["userVote", postId] as const,
    userVotesBatch: (targetType: "post" | "comment" | "resource", targetIds: string[]) =>
      ["userVotes", targetType, targetIds] as const,
    batch: (targetType: string, targetIds: string[]) =>
      [...queryKeys.votes.all, "batch", targetType, targetIds] as const,
    postVoters: (postId: string) => ["postVoters", postId] as const,
  },

  // Categories
  categories: {
    all: ["categories"] as const,
    list: () => [...queryKeys.categories.all, "list"] as const,
    detail: (id: string) => [...queryKeys.categories.all, "detail", id] as const,
    byName: (name: string) => [...queryKeys.categories.all, "byName", name] as const,
  },

  // Bookmarks
  bookmarks: {
    all: ["bookmarks"] as const,
    list: (targetType?: string) => [...queryKeys.bookmarks.all, "list", targetType] as const,
    check: (targetType: string, targetId: string) =>
      [...queryKeys.bookmarks.all, "check", targetType, targetId] as const,
  },

  // Notifications
  notifications: {
    all: ["notifications"] as const,
    list: (options?: { limit?: number; unreadOnly?: boolean }) =>
      [...queryKeys.notifications.all, "list", options] as const,
    unreadCount: () => [...queryKeys.notifications.all, "unread"] as const,
  },

  // Auth
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
    session: () => [...queryKeys.auth.all, "session"] as const,
  },

  // Events
  events: {
    all: ["events"] as const,
    list: (filters?: { upcoming?: boolean; past?: boolean }) =>
      [...queryKeys.events.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.events.all, "detail", id] as const,
  },

  // Resources
  resources: {
    all: ["resources"] as const,
    list: (filters?: { topicSlug?: string; sortBy?: string }) =>
      [...queryKeys.resources.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.resources.all, "detail", id] as const,
  },

  // Topics
  topics: {
    all: ["topics"] as const,
    list: (searchTerm?: string) => [...queryKeys.topics.all, "list", searchTerm] as const,
    detail: (slug: string) => [...queryKeys.topics.all, "detail", slug] as const,
  },

  // Polls
  polls: {
    all: ["polls"] as const,
    vote: (pollId: string) => [...queryKeys.polls.all, "vote", pollId] as const,
  },

  // Search
  search: {
    all: ["search"] as const,
    results: (query: string, type?: string) => [...queryKeys.search.all, query, type] as const,
  },

  // Admin
  admin: {
    all: ["admin"] as const,
    members: () => [...queryKeys.admin.all, "members"] as const,
    reportedComments: () => [...queryKeys.admin.all, "reportedComments"] as const,
    analytics: () => [...queryKeys.admin.all, "analytics"] as const,
  },
} as const;

// Type helper for query key inference
export type QueryKeys = typeof queryKeys;
