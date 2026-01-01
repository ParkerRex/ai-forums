// Real-time event types for WebSocket communication

export type RealtimeEventType =
  | "post:created"
  | "post:updated"
  | "post:deleted"
  | "post:voted"
  | "comment:created"
  | "comment:updated"
  | "comment:deleted"
  | "comment:voted"
  | "notification:created"
  | "member:updated"
  | "member:online"
  | "member:offline";

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  channel: string;
  payload: T;
  timestamp: number;
}

export interface PostEvent {
  postId: string;
  categoryId?: string;
  memberId?: string;
}

export interface CommentEvent {
  commentId: string;
  postId: string;
  memberId?: string;
}

export interface VoteEvent {
  targetId: string;
  targetType: "post" | "comment";
  netVotes: number;
  upvoteCount: number;
  downvoteCount: number;
}

export interface NotificationEvent {
  notificationId: string;
  memberId: string;
  type: string;
}

export interface MemberEvent {
  memberId: string;
}

export interface PresenceEvent {
  memberId: string;
  memberName: string;
  isOnline: boolean;
}

// Channel patterns
export const Channels = {
  // Global channels
  posts: "posts",
  members: "members",
  presence: "presence",

  // Scoped channels
  post: (postId: string) => `posts:${postId}`,
  category: (categoryId: string) => `categories:${categoryId}`,
  notifications: (memberId: string) => `notifications:${memberId}`,
  member: (memberId: string) => `members:${memberId}`,
} as const;

// Helper to create events
export function createEvent<T>(
  type: RealtimeEventType,
  channel: string,
  payload: T,
): RealtimeEvent<T> {
  return {
    type,
    channel,
    payload,
    timestamp: Date.now(),
  };
}
