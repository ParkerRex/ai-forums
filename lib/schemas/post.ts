import { z } from "zod";

/**
 * Post form schemas for react-hook-form integration
 *
 * These schemas provide:
 * - Type-safe form validation
 * - Consistent error messages
 * - Reusable across all post-related forms
 */

// Post type enum
export const postTypeSchema = z.enum(["text", "image", "video", "link", "poll"]);
export type PostType = z.infer<typeof postTypeSchema>;

// Post status enum
export const postStatusSchema = z.enum(["active", "deleted", "hidden", "archived"]);
export type PostStatus = z.infer<typeof postStatusSchema>;

// Attachment schema
export const attachmentSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "video", "pdf", "youtube"]),
  url: z.string().url("Invalid attachment URL"),
  thumbnailUrl: z.string().url().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  aspectRatio: z.number().optional(),
  order: z.number(),
  // PDF specific
  pageCount: z.number().optional(),
  fileSize: z.number().optional(),
  // YouTube specific
  videoId: z.string().optional(),
  title: z.string().optional(),
  duration: z.string().optional(),
  channelName: z.string().optional(),
  // Video specific
  videoDuration: z.string().optional(),
  format: z.string().optional(),
  resolution: z.string().optional(),
  codec: z.string().optional(),
});

export type AttachmentInput = z.infer<typeof attachmentSchema>;

// Create post schema
export const createPostSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters")
    .trim(),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(10000, "Content must be less than 10,000 characters")
    .trim(),
  categoryId: z.string().min(1, "Please select a category"),
  type: postTypeSchema.default("text"),
  attachments: z.array(attachmentSchema).optional(),
  // Link post fields
  linkUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkTitle: z.string().max(200).optional(),
  linkDescription: z.string().max(500).optional(),
  linkImage: z.string().url().optional().or(z.literal("")),
  // Media fields
  mediaUrl: z.string().url().optional().or(z.literal("")),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  aspectRatio: z.number().optional(),
  mediaWidth: z.number().optional(),
  mediaHeight: z.number().optional(),
  // Content options
  preview: z.string().max(500).optional(),
  isFree: z.boolean().default(false),
  // Poll fields
  pollOptions: z
    .array(z.string().min(1, "Poll option cannot be empty").max(200))
    .min(2, "At least 2 poll options required")
    .max(10, "Maximum 10 poll options allowed")
    .optional(),
  pollDuration: z.number().min(1).max(168).optional(), // 1-168 hours (1 week max)
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

// Update post schema (all fields optional except postId)
export const updatePostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters")
    .trim()
    .optional(),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(10000, "Content must be less than 10,000 characters")
    .trim()
    .optional(),
  categoryId: z.string().min(1).optional(),
  type: postTypeSchema.optional(),
  attachments: z.array(attachmentSchema).optional(),
  linkUrl: z.string().url().optional().or(z.literal("")),
  linkTitle: z.string().max(200).optional(),
  linkDescription: z.string().max(500).optional(),
  linkImage: z.string().url().optional().or(z.literal("")),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  editReason: z.string().max(500).optional(),
  isFree: z.boolean().optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// Default values for create post form
export const createPostDefaults: Partial<CreatePostInput> = {
  title: "",
  content: "",
  categoryId: "",
  type: "text",
  isFree: false,
  attachments: [],
};
