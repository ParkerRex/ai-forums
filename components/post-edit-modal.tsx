"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PostFormFields, ExtendedPostFormData } from "./post-form-fields";
import { PostFormData, validatePostForm } from "@/lib/form-validation";
import { uploadMedia } from "@/lib/upload-media";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Post {
  _id: Id<"posts">;
  title: string;
  content: string;
  slug: string;
  categoryId: Id<"categories">;
  type?: "text" | "image" | "video" | "link";
  mediaUrl?: string;
  thumbnailUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  category?: {
    name: string;
  };
}

interface PostEditModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PostEditModal({ post, isOpen, onClose, onSuccess }: PostEditModalProps) {
  const convex = useConvex();
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<ExtendedPostFormData>({
    title: post.title,
    content: post.content,
    categoryId: post.categoryId,
    type: post.type || "text",
    mediaUrl: post.mediaUrl,
    thumbnailUrl: post.thumbnailUrl,
    linkUrl: post.linkUrl,
    linkTitle: post.linkTitle,
    linkDescription: post.linkDescription,
    linkImage: post.linkImage,
  });

  // Track which fields have been touched by the user
  const [touchedFields, setTouchedFields] = useState<Set<keyof PostFormData>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Check overall form validity for submit button (regardless of touched state)
  const { isValid: formIsValid } = validatePostForm(formData);

  // Additional validation for media/link posts
  const isPostTypeValid = () => {
    if (formData.type === "image" || formData.type === "video") {
      return formData.mediaFile !== undefined || formData.mediaUrl !== undefined;
    }
    if (formData.type === "link") {
      return formData.linkUrl !== undefined && formData.linkUrl.trim() !== "";
    }
    return true;
  };

  const isFormComplete = formIsValid && isPostTypeValid();

  // Mutations
  const editPost = useMutation(api.posts.editPost);

  // Reset form when post changes
  useEffect(() => {
    setFormData({
      title: post.title,
      content: post.content,
      categoryId: post.categoryId,
      type: post.type || "text",
      mediaUrl: post.mediaUrl,
      thumbnailUrl: post.thumbnailUrl,
      linkUrl: post.linkUrl,
      linkTitle: post.linkTitle,
      linkDescription: post.linkDescription,
      linkImage: post.linkImage,
    });
    setTouchedFields(new Set());
    setSubmitError(null);
  }, [post]);

  // Form handlers
  const handleFormDataChange = useCallback((data: Partial<ExtendedPostFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    setSubmitError(null);
  }, []);

  const handleTouchedFieldsChange = useCallback((fields: Set<keyof PostFormData>) => {
    setTouchedFields(fields);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormComplete || isSubmitting) {
      // Mark all fields as touched to show validation errors
      setTouchedFields(new Set(['title', 'content', 'categoryId']));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let mediaUrl = formData.mediaUrl;
      let thumbnailUrl = formData.thumbnailUrl;

      // Upload media if a new file was selected
      if (formData.mediaFile && (formData.type === "image" || formData.type === "video")) {
        try {
          const uploadResult = await uploadMedia(convex, formData.mediaFile, {
            onProgress: (progress) => {
              setUploadProgress(progress.percentage);
            },
          });
          mediaUrl = uploadResult.url;
          thumbnailUrl = uploadResult.thumbnailUrl;
        } catch (uploadError) {
          console.error("Failed to upload media:", uploadError);
          throw new Error("Failed to upload media. Please try again.");
        }
      }

      const result = await editPost({
        postId: post._id,
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        mediaUrl,
        thumbnailUrl,
        categoryId: formData.categoryId,
        linkUrl: formData.linkUrl,
        linkTitle: formData.linkTitle,
        linkDescription: formData.linkDescription,
        linkImage: formData.linkImage,
      });

      toast.success("Post updated successfully!");

      // Invoke success callback before handling navigation
      if (onSuccess) {
        onSuccess();
      }

      // Check if slug changed and redirect to new URL
      if (result.slug !== post.slug) {
        const categoryName = post.category?.name || result.categoryName || "general";
        const newUrl = `/${categoryName}/${result.slug}`;
        onClose();
        router.push(newUrl);
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Failed to update post:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to update post. Please try again.";
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="post-edit-modal">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submit Error */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Uploading media... {uploadProgress}%
              </AlertDescription>
            </Alert>
          )}

          {/* Form Fields */}
          <PostFormFields
            formData={formData}
            touchedFields={touchedFields}
            onFormDataChange={handleFormDataChange}
            onTouchedFieldsChange={handleTouchedFieldsChange}
            isSubmitting={isSubmitting}
            showPreview={false}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormComplete || isSubmitting}
              className="min-w-[100px]"
              data-testid="save-post-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 