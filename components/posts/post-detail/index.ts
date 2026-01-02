/**
 * PostDetail component module
 *
 * Provides a modular post detail view with extracted sub-components:
 * - PostHeader: Author info, title, timestamps
 * - PostMedia: Images, videos, YouTube, link previews
 * - PostActionsMenu: Edit, delete, pin, report actions
 *
 * Usage:
 * ```tsx
 * import PostDetail from "@/components/posts/post-detail";
 * <PostDetail post={post} onEdit={handleEdit} />
 * ```
 */

export { PostActionsMenu } from "./PostActionsMenu";
export { default } from "./PostDetail";
export { PostHeader } from "./PostHeader";
export { PostMedia } from "./PostMedia";
export type { Post, PostAttachment, PostAuthor, PostCategory, PostDetailProps } from "./types";
export { getTimeAgo } from "./utils";
