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

// Post schemas
export {
  attachmentSchema,
  createPostDefaults,
  createPostSchema,
  postStatusSchema,
  postTypeSchema,
  updatePostSchema,
  type AttachmentInput,
  type CreatePostInput,
  type PostStatus,
  type PostType,
  type UpdatePostInput,
} from "./post";

// Comment schemas
export {
  commentAttachmentSchema,
  createCommentDefaults,
  createCommentSchema,
  editCommentSchema,
  reportCommentSchema,
  type CommentAttachmentInput,
  type CreateCommentInput,
  type EditCommentInput,
  type ReportCommentInput,
} from "./comment";

// Member/Auth schemas
export {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInDefaults,
  signInSchema,
  signUpDefaults,
  signUpSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
  type UpdateProfileInput,
} from "./member";
