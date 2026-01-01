// Post-related type definitions

export type PostStatus = "active" | "deleted" | "hidden" | "archived";
export type PostType = "text" | "image" | "video" | "link" | "poll";
export type PinScope = "category" | "global" | "both";

export interface PostAttachment {
  id: string;
  type: "image" | "video" | "pdf" | "youtube";
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  order: number;
  // PDF specific
  pageCount?: number;
  fileSize?: number;
  // YouTube specific
  videoId?: string;
  title?: string;
  duration?: string;
  channelName?: string;
  // Video specific
  videoDuration?: string;
  format?: string;
  resolution?: string;
  codec?: string;
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface PostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  avatarUrl: string | null;
  username?: string;
}

export interface PostCategory {
  id: string;
  name: string;
  displayName: string;
  icon: string | null;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  slug: string;
  preview: string | null;
  type: PostType;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  editedAt?: string | null;
  memberId: string;
  categoryId: string;
  status: PostStatus;
  isPinned?: boolean;
  pinScope?: PinScope;
  isLocked?: boolean;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkImage?: string | null;
  linkPreviews?: Record<string, LinkPreview> | null;
  pollOptions?: PollOption[] | null;
  pollEndsAt?: number | string | null;
  totalPollVotes?: number | null;
  attachments?: PostAttachment[] | null;
  isFree?: boolean;
  isPaywalled?: boolean;
  fullContentRequiresTier?: string;
  member: PostAuthor;
  category: PostCategory;
}

export interface CreatePostInput {
  title: string;
  content: string;
  categoryId: string;
  type?: string;
  attachments?: PostAttachment[];
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  aspectRatio?: number;
  mediaWidth?: number;
  mediaHeight?: number;
  preview?: string;
  isFree?: boolean;
  pollOptions?: string[];
  pollDuration?: number;
}

export interface UpdatePostInput {
  postId: string;
  title?: string;
  content?: string;
  categoryId?: string;
  type?: string;
  attachments?: unknown[];
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  editReason?: string;
  isFree?: boolean;
}

export interface PostVoteResult {
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote: string | null;
  newVoteType: string | null;
}

export interface PostVoter {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  slug: string;
}

export interface PostVersion {
  id: string;
  postId: string;
  version: number;
  title: string;
  content: string;
  editorId: string;
  editedAt: string;
  editor: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  } | null;
}
