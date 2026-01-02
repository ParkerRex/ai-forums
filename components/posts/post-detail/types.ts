/**
 * Shared types for PostDetail components
 */

export interface PostAttachment {
  id: string;
  type: "image" | "video" | "pdf" | "youtube";
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  order: number;
  pageCount?: number;
  fileSize?: number;
  videoId?: string;
  title?: string;
  duration?: string;
  channelName?: string;
  videoDuration?: string;
  format?: string;
  resolution?: string;
  codec?: string;
}

export interface PostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  slug?: string | null;
  avatarUrl?: string | null;
}

export interface PostCategory {
  name: string;
  displayName?: string;
}

export interface PostPollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  slug: string;
  createdAt: string | number;
  editedAt?: string | number | null;
  netVotes: number;
  commentCount: number;
  type?: "text" | "image" | "video" | "link" | "poll";
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkImage?: string | null;
  linkPreviews?: Record<string, LinkPreview> | null;
  pollOptions?: PostPollOption[] | null;
  pollEndsAt?: string | number | null;
  totalPollVotes?: number | null;
  member?: PostAuthor | null;
  category?: PostCategory | null;
  isPinned?: boolean;
  pinScope?: "category" | "global" | "both";
  attachments?: PostAttachment[] | null;
}

export interface PostDetailProps {
  post: Post;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
}
