// Comment-related type definitions

export type CommentStatus = "active" | "deleted" | "hidden";

export interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  avatarUrl: string | null;
}

export interface CommentAttachment {
  id: string;
  type: "image" | "document" | "gif";
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export interface CommentLinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface CommentEditHistory {
  content: string;
  attachments?: CommentAttachment[];
  editedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  parentCommentId: string | null;
  depth: number;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  createdAt: string;
  editedAt?: string | null;
  status?: CommentStatus;
  attachments?: CommentAttachment[];
  linkPreviews?: CommentLinkPreview[];
  editHistory?: CommentEditHistory[];
  member: CommentAuthor;
  // GitHub-style flat display fields
  replyToMemberId?: string | null;
  replyToCommentId?: string | null;
}

export interface CreateCommentInput {
  content: string;
  parentCommentId?: string;
  replyToMemberId?: string;
  replyToCommentId?: string;
  attachments?: CommentAttachment[];
}

export interface UpdateCommentInput {
  content: string;
  attachments?: CommentAttachment[];
  editReason?: string;
}

export interface CommentVoteResult {
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: string | null;
}

export interface ReportCommentInput {
  reason: string;
  reasonText?: string;
}
