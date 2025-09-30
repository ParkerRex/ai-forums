import { z } from "zod";

// Post creation form validation schema
export const postValidationSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters long")
    .max(200, "Title must be less than 200 characters")
    .trim(),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters long")
    .max(10000, "Content must be less than 10,000 characters")
    .trim(),
  categoryId: z.string().min(1, "Please select a category"),
});

export type PostFormData = z.infer<typeof postValidationSchema>;

// Individual field validation functions
export const validateTitle = (title: string): string | null => {
  const trimmed = title.trim();
  if (trimmed.length < 5) {
    return "Title must be at least 5 characters long";
  }
  if (trimmed.length > 200) {
    return "Title must be less than 200 characters";
  }
  return null;
};

export const validateContent = (content: string): string | null => {
  const trimmed = content.trim();
  if (trimmed.length < 10) {
    return "Content must be at least 10 characters long";
  }
  if (trimmed.length > 10000) {
    return "Content must be less than 10,000 characters";
  }
  return null;
};

export const validateCategory = (categoryId: string): string | null => {
  if (!categoryId || categoryId.trim().length === 0) {
    return "Please select a category";
  }
  return null;
};

// Helper function to get character count with status
export const getCharacterCountInfo = (text: string, min: number, max: number) => {
  const length = text.trim().length;
  const remaining = max - length;

  let status: "normal" | "warning" | "error" = "normal";
  if (length < min) {
    status = "error";
  } else if (remaining < max * 0.1) {
    // Warning when 90% full
    status = "warning";
  }

  return {
    length,
    remaining,
    status,
    isValid: length >= min && length <= max,
  };
};

// Form validation state helper
export const validatePostForm = (
  data: Partial<PostFormData>,
  touchedFields?: Set<keyof PostFormData>,
) => {
  const errors: Partial<Record<keyof PostFormData, string>> = {};

  // Only validate fields that have been touched (or validate all if no touchedFields provided)
  if (data.title !== undefined && (!touchedFields || touchedFields.has("title"))) {
    const titleError = validateTitle(data.title);
    if (titleError) errors.title = titleError;
  }

  if (data.content !== undefined && (!touchedFields || touchedFields.has("content"))) {
    const contentError = validateContent(data.content);
    if (contentError) errors.content = contentError;
  }

  if (data.categoryId !== undefined && (!touchedFields || touchedFields.has("categoryId"))) {
    const categoryError = validateCategory(data.categoryId);
    if (categoryError) errors.categoryId = categoryError;
  }

  // For form submission validation, check all fields regardless of touched state
  const allFieldsValid =
    validateTitle(data.title || "") === null &&
    validateContent(data.content || "") === null &&
    validateCategory(data.categoryId || "") === null;

  return {
    errors,
    isValid: touchedFields ? Object.keys(errors).length === 0 : allFieldsValid,
  };
};
