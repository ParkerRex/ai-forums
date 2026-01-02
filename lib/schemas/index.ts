/**
 * Centralized form schemas for react-hook-form + zod integration
 *
 * Usage with react-hook-form:
 * ```tsx
 * import { useForm } from "react-hook-form";
 * import { zodResolver } from "@hookform/resolvers/zod";
 * import { createPostSchema, type CreatePostInput, createPostDefaults } from "@/lib/schemas";
 *
 * const form = useForm<CreatePostInput>({
 *   resolver: zodResolver(createPostSchema),
 *   defaultValues: createPostDefaults,
 * });
 * ```
 */

// Comment schemas
export {
  type CommentAttachmentInput,
  type CreateCommentInput,
  commentAttachmentSchema,
  createCommentDefaults,
  createCommentSchema,
  type EditCommentInput,
  editCommentSchema,
  type ReportCommentInput,
  reportCommentSchema,
} from "./comment";
// Member/Auth schemas
export {
  type ChangePasswordInput,
  changePasswordSchema,
  type ForgotPasswordInput,
  forgotPasswordSchema,
  type ResetPasswordInput,
  resetPasswordSchema,
  type SignInInput,
  type SignUpInput,
  signInDefaults,
  signInSchema,
  signUpDefaults,
  signUpSchema,
  type UpdateProfileInput,
  updateProfileSchema,
} from "./member";
// Post schemas
export {
  type AttachmentInput,
  attachmentSchema,
  type CreatePostInput,
  createPostDefaults,
  createPostSchema,
  type PostStatus,
  type PostType,
  postStatusSchema,
  postTypeSchema,
  type UpdatePostInput,
  updatePostSchema,
} from "./post";
