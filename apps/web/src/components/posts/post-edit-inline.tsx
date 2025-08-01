"use client";

import { useState } from "react";
import { Button } from "../components/ui/button";
import {
  PostFormFields,
  ExtendedPostFormData,
} from "../components/posts/post-form-fields";
import { PostFormData } from "@/lib/form-validation";
import { useMutation } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Id } from "@/web/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PostEditInlineProps {
  post: {
    _id: Id<"posts">;
    title: string;
    content: string;
    type?: "text" | "image" | "video" | "link" | "poll";
    linkUrl?: string;
    linkTitle?: string;
    linkDescription?: string;
    linkImage?: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    pollOptions?: Array<{ id: string; text: string }>;
    pollEndsAt?: number;
    category?: {
      _id?: Id<"categories">;
      name: string;
      displayName?: string;
    } | null;
  };
  onCancel: () => void;
  className?: string;
}

export function PostEditInline({
  post,
  onCancel,
  className,
}: PostEditInlineProps) {
  const router = useRouter();
  const editPost = useMutation(api.posts.editPost);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<keyof PostFormData>>(
    new Set(),
  );

  const [formData, setFormData] = useState<ExtendedPostFormData>({
    title: post.title,
    content: post.content,
    type: post.type || "text",
    linkUrl: post.linkUrl || "",
    linkTitle: post.linkTitle || "",
    linkDescription: post.linkDescription || "",
    linkImage: post.linkImage || "",
    mediaUrl: post.mediaUrl || "",
    thumbnailUrl: post.thumbnailUrl || "",
    categoryId: post.category?._id || ("uncategorized" as Id<"categories">),
  });

  const handleFormDataChange = (data: Partial<ExtendedPostFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleTouchedFieldsChange = (fields: Set<keyof PostFormData>) => {
    setTouchedFields(fields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await editPost({
        postId: post._id,
        title: formData.title.trim(),
        content: formData.content,
        type: formData.type === "poll" ? undefined : formData.type,
        linkUrl: formData.type === "link" ? formData.linkUrl : undefined,
        linkTitle: formData.type === "link" ? formData.linkTitle : undefined,
        linkDescription:
          formData.type === "link" ? formData.linkDescription : undefined,
        linkImage: formData.type === "link" ? formData.linkImage : undefined,
        mediaUrl:
          formData.type === "video" || formData.type === "image"
            ? formData.mediaUrl
            : undefined,
        thumbnailUrl:
          formData.type === "video" ? formData.thumbnailUrl : undefined,
        categoryId:
          formData.categoryId !== post.category?._id
            ? (formData.categoryId as Id<"categories">)
            : undefined,
      });

      // Check if we need to redirect to a new URL
      const currentCategory = post.category?.name || "general";
      const newCategory = result.categoryName || currentCategory;
      const slugChanged = result.slug !== post.title;
      const categoryChanged = newCategory !== currentCategory;

      if (slugChanged || categoryChanged) {
        router.push(`/${newCategory}/${result.slug}`);
        router.refresh();
      } else {
        toast.success("Post updated successfully");
        onCancel(); // Exit edit mode
        router.refresh();
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <PostFormFields
        formData={formData}
        touchedFields={touchedFields}
        onFormDataChange={handleFormDataChange}
        onTouchedFieldsChange={handleTouchedFieldsChange}
        isSubmitting={isSubmitting}
      />

      <div className="flex items-center gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update post"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
