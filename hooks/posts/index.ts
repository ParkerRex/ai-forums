/**
 * Post-related hooks
 *
 * Re-exports all post hooks from the original files for backwards compatibility.
 */

export {
  useCreatePost,
  useDeletePost,
  useGeneratePostPreview,
  useLinkPreview,
  usePinPost,
  usePost,
  usePostBySlug,
  usePostHistory,
  usePostVoters,
  usePosts,
  useUnpinPost,
  useUpdatePost,
  useUserVote,
  useUserVotesBatch,
  useVoteOnPost,
  type CreatePostData,
  type Post,
  type UpdatePostData,
} from "../use-posts";

export { usePostAnalytics } from "../use-post-analytics";
