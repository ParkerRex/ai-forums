// Centralized type exports
// Import types from this file to ensure consistency across the codebase

// API types
export type {
  ApiErrorDetail,
  ApiErrorResponse,
  ApiMeta,
  ApiResponse,
  DeleteResponse,
  ListResponse,
  PaginatedResponse,
  PaginationParams,
  SortParams,
  SuccessResponse,
} from "./api";
// Auth types
export type {
  AuthState,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  LoginResponse,
  PasswordStrengthResult,
  RegisterInput,
  RegisterResponse,
  ResetPasswordInput,
  Session,
  User,
} from "./auth";
// Bookmark types
export type {
  Bookmark,
  BookmarkTarget,
  BookmarkTargetType,
  BookmarkWithTarget,
  ToggleBookmarkInput,
  ToggleBookmarkResult,
} from "./bookmark";

// Category types
export type {
  Category,
  CategorySelectorItem,
  CategoryStatus,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category";
// Comment types
export type {
  Comment,
  CommentAttachment,
  CommentAuthor,
  CommentEditHistory,
  CommentLinkPreview,
  CommentStatus,
  CommentVoteResult,
  CreateCommentInput,
  ReportCommentInput,
  UpdateCommentInput,
} from "./comment";
// Member types
export type {
  Member,
  MemberActivity,
  MemberPost,
  MemberRole,
  MemberStatus,
  MemberTier,
  UpdateMemberInput,
} from "./member";
// Notification types
export type {
  MarkNotificationsInput,
  Notification,
  NotificationActor,
  NotificationEntityType,
  NotificationsQueryOptions,
  NotificationType,
} from "./notification";
// Post types
export type {
  CreatePostInput,
  LinkPreview,
  PinScope,
  PollOption,
  Post,
  PostAttachment,
  PostAuthor,
  PostCategory,
  PostStatus,
  PostType,
  PostVersion,
  PostVoteResult,
  PostVoter,
  UpdatePostInput,
} from "./post";
// Vote types
export type {
  BatchVotesResult,
  UserVoteResult,
  Vote,
  VoteInput,
  VoteTargetType,
  VoteType,
} from "./vote";

// Legacy exports for backwards compatibility
// These can be removed once all imports are updated
export interface MediaItem {
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
  uploadProgress?: number;
  isUploading?: boolean;
  error?: string;
}
