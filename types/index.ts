// Centralized type exports
// Import types from this file to ensure consistency across the codebase

// Post types
export type {
  Post,
  PostStatus,
  PostType,
  PinScope,
  PostAttachment,
  LinkPreview,
  PollOption,
  PostAuthor,
  PostCategory,
  CreatePostInput,
  UpdatePostInput,
  PostVoteResult,
  PostVoter,
  PostVersion,
} from "./post";

// Member types
export type {
  Member,
  MemberStatus,
  MemberTier,
  SubscriptionStatus,
  BillingInterval,
  MemberRole,
  UpdateMemberInput,
  MemberPost,
  MemberActivity,
} from "./member";

// Comment types
export type {
  Comment,
  CommentStatus,
  CommentAuthor,
  CommentAttachment,
  CommentLinkPreview,
  CommentEditHistory,
  CreateCommentInput,
  UpdateCommentInput,
  CommentVoteResult,
  ReportCommentInput,
} from "./comment";

// Category types
export type {
  Category,
  CategoryStatus,
  CategorySelectorItem,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category";

// Notification types
export type {
  Notification,
  NotificationType,
  NotificationEntityType,
  NotificationActor,
  NotificationsQueryOptions,
  MarkNotificationsInput,
} from "./notification";

// Bookmark types
export type {
  Bookmark,
  BookmarkTargetType,
  BookmarkTarget,
  BookmarkWithTarget,
  ToggleBookmarkInput,
  ToggleBookmarkResult,
} from "./bookmark";

// Vote types
export type {
  Vote,
  VoteType,
  VoteTargetType,
  VoteInput,
  UserVoteResult,
  BatchVotesResult,
} from "./vote";

// API types
export type {
  ApiResponse,
  ApiMeta,
  PaginatedResponse,
  ListResponse,
  ApiErrorResponse,
  ApiErrorDetail,
  SuccessResponse,
  DeleteResponse,
  PaginationParams,
  SortParams,
} from "./api";

// Auth types
export type {
  User,
  Session,
  AuthState,
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  PasswordStrengthResult,
} from "./auth";

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
