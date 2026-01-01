import { z } from "zod";

/**
 * Comment form schemas for react-hook-form integration
 */

// Comment attachment schema
export const commentAttachmentSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "document", "gif"]),
  url: z.string().url("Invalid attachment URL"),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export type CommentAttachmentInput = z.infer<typeof commentAttachmentSchema>;

// Create comment schema
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment must be less than 5,000 characters")
    .trim(),
  parentCommentId: z.string().optional(),
  replyToMemberId: z.string().optional(),
  replyToCommentId: z.string().optional(),
  attachments: z.array(commentAttachmentSchema).max(5, "Maximum 5 attachments allowed").optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// Edit comment schema
export const editCommentSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required"),
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment must be less than 5,000 characters")
    .trim(),
  attachments: z.array(commentAttachmentSchema).max(5).optional(),
});

export type EditCommentInput = z.infer<typeof editCommentSchema>;

// Report comment schema
export const reportCommentSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required"),
  reason: z.enum(["spam", "harassment", "hate_speech", "misinformation", "other"], {
    message: "Please select a reason",
  }),
  reasonText: z.string().max(500, "Description must be less than 500 characters").optional(),
});

export type ReportCommentInput = z.infer<typeof reportCommentSchema>;

// Default values
export const createCommentDefaults: Partial<CreateCommentInput> = {
  content: "",
  attachments: [],
};
