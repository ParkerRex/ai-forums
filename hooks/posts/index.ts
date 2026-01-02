/**
 * Post-related hooks
 *
 * Re-exports all post hooks from the original files for backwards compatibility.
 */

export { usePostAnalytics } from "../use-post-analytics";
export {
  type CreatePostData,
  type Post,
  type UpdatePostData,
  useCreatePost,
  useDeletePost,
  useGeneratePostPreview,
  useLinkPreview,
  usePinPost,
  usePost,
  usePostBySlug,
  usePostHistory,
  usePosts,
  usePostVoters,
  useUnpinPost,
  useUpdatePost,
  useUserVote,
  useUserVotesBatch,
  useVoteOnPost,
} from "../use-posts";
