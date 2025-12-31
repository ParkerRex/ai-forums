"use client";

import { FileText, Image as ImageIcon, Link, Upload, X } from "lucide-react";
import Image from "next/image";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/hooks/use-categories";
import { useLinkPreview } from "@/hooks/use-posts";
import { getCharacterCountInfo, type PostFormData, validatePostForm } from "@/lib/form-validation";
import {
  getFilePreviewUrl,
  revokeFilePreviewUrl,
  validateMediaFile,
} from "@/lib/upload-media";

// Lazy load heavy components
const RichTextEditor = lazy(() => import("@/components/posts/rich-text-editor"));
const PostPreview = lazy(() => import("@/components/posts/post-preview"));

// Extended form data with media/link fields
export interface ExtendedPostFormData extends PostFormData {
  type: "text" | "image" | "video" | "link" | "poll";
  mediaFile?: File;
  mediaUrl?: string;
  thumbnailUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
}

interface PostFormFieldsProps {
  formData: ExtendedPostFormData;
  touchedFields: Set<keyof PostFormData>;
  onFormDataChange: (data: Partial<ExtendedPostFormData>) => void;
  onTouchedFieldsChange: (fields: Set<keyof PostFormData>) => void;
  isSubmitting?: boolean;
  showPreview?: boolean;
}

// Loading skeleton for the rich text editor
function RichTextEditorSkeleton() {
  return (
    <div className="rounded-none border">
      <div className="bg-muted rounded-t-lg border-b p-2">
        <div className="flex flex-wrap gap-1">
          <div className="bg-muted h-8 w-8 animate-pulse rounded opacity-50" />
          <div className="bg-muted h-8 w-8 animate-pulse rounded opacity-50" />
          <div className="bg-muted h-8 w-8 animate-pulse rounded opacity-50" />
          <div className="bg-muted h-8 w-8 animate-pulse rounded opacity-50" />
          <div className="bg-muted h-8 w-8 animate-pulse rounded opacity-50" />
        </div>
      </div>
      <div className="min-h-[200px] p-4">
        <div className="animate-pulse space-y-2">
          <div className="bg-muted h-4 w-3/4 rounded opacity-50" />
          <div className="bg-muted h-4 w-1/2 rounded opacity-50" />
          <div className="bg-muted h-4 w-5/6 rounded opacity-50" />
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for the post preview
function PostPreviewSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-6 w-3/4 rounded opacity-50" />
          <div className="bg-muted h-4 w-full rounded opacity-50" />
          <div className="bg-muted h-4 w-5/6 rounded opacity-50" />
          <div className="bg-muted h-4 w-4/6 rounded opacity-50" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PostFormFields({
  formData,
  touchedFields,
  onFormDataChange,
  onTouchedFieldsChange,
  isSubmitting = false,
  showPreview = true,
}: PostFormFieldsProps) {
  // Media preview state
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);

  // Real-time validation (only for touched fields)
  const { errors } = validatePostForm(formData, touchedFields);

  // React Query hooks
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const categories = categoriesData?.items;
  const linkPreviewMutation = useLinkPreview();

  // Character count helpers
  const titleInfo = getCharacterCountInfo(formData.title, 5, 200);
  const contentInfo = getCharacterCountInfo(formData.content, 10, 10000);

  // Cleanup media preview on unmount
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) {
        revokeFilePreviewUrl(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  // Form handlers
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFormDataChange({ title: e.target.value });
      onTouchedFieldsChange(new Set(touchedFields).add("title"));
    },
    [onFormDataChange, onTouchedFieldsChange, touchedFields],
  );

  const handleContentChange = useCallback(
    (content: string) => {
      onFormDataChange({ content });
      onTouchedFieldsChange(new Set(touchedFields).add("content"));
    },
    [onFormDataChange, onTouchedFieldsChange, touchedFields],
  );

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      onFormDataChange({ categoryId });
      onTouchedFieldsChange(new Set(touchedFields).add("categoryId"));
    },
    [onFormDataChange, onTouchedFieldsChange, touchedFields],
  );

  const handleTypeChange = useCallback(
    (type: string) => {
      onFormDataChange({
        type: type as ExtendedPostFormData["type"],
        // Reset type-specific fields when switching
        mediaFile: undefined,
        mediaUrl: undefined,
        thumbnailUrl: undefined,
        linkUrl: undefined,
        linkTitle: undefined,
        linkDescription: undefined,
        linkImage: undefined,
      });
      // Clean up media preview
      if (mediaPreviewUrl) {
        revokeFilePreviewUrl(mediaPreviewUrl);
        setMediaPreviewUrl(null);
      }
    },
    [onFormDataChange, mediaPreviewUrl],
  );

  const handleMediaFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      // Set file and create preview
      onFormDataChange({ mediaFile: file });

      // Clean up old preview
      if (mediaPreviewUrl) {
        revokeFilePreviewUrl(mediaPreviewUrl);
      }

      // Create new preview
      const previewUrl = getFilePreviewUrl(file);
      setMediaPreviewUrl(previewUrl);

      // Detect media type from file
      if (file.type.startsWith("image/")) {
        onFormDataChange({ type: "image" });
      } else if (file.type.startsWith("video/")) {
        onFormDataChange({ type: "video" });
      }
    },
    [onFormDataChange, mediaPreviewUrl],
  );

  const handleRemoveMedia = useCallback(() => {
    onFormDataChange({
      mediaFile: undefined,
      mediaUrl: undefined,
      thumbnailUrl: undefined,
    });

    if (mediaPreviewUrl) {
      revokeFilePreviewUrl(mediaPreviewUrl);
      setMediaPreviewUrl(null);
    }
  }, [onFormDataChange, mediaPreviewUrl]);

  const handleLinkUrlChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      onFormDataChange({ linkUrl: url });

      // Fetch link preview if valid URL
      if (url?.match(/^https?:\/\/.+/)) {
        try {
          const preview = await linkPreviewMutation.mutateAsync(url);
          if (preview) {
            onFormDataChange({
              linkTitle: preview.title,
              linkDescription: preview.description,
              linkImage: preview.image,
            });
          }
        } catch (error) {
          console.error("Failed to fetch link preview:", error);
        }
      }
    },
    [onFormDataChange, linkPreviewMutation],
  );

  // Loading state for categories
  if (categoriesLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-4 w-1/4 rounded opacity-50" />
          <div className="bg-muted h-10 rounded opacity-50" />
          <div className="bg-muted h-4 w-1/4 rounded opacity-50" />
          <div className="bg-muted h-10 rounded opacity-50" />
          <div className="bg-muted h-32 rounded opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Post Type Tabs */}
      <Tabs value={formData.type} onValueChange={handleTypeChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Text
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Image/Video
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Link
          </TabsTrigger>
        </TabsList>

        {/* Common fields */}
        <div className="mt-6 space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="Enter your post title..."
              className={`${errors.title && touchedFields.has("title") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "focus:border-green-700 focus:ring-green-700"}`}
              disabled={isSubmitting}
              data-testid="edit-post-title"
            />
            <div className="flex items-center justify-between text-sm">
              <div>
                {errors.title && touchedFields.has("title") && (
                  <span className="text-red-500">{errors.title}</span>
                )}
              </div>
              <div
                className={`${
                  titleInfo.status === "error"
                    ? "text-red-500"
                    : titleInfo.status === "warning"
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                }`}
              >
                {titleInfo.length}/200 characters
              </div>
            </div>
          </div>

          {/* Category Field */}
          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.categoryId}
              onValueChange={handleCategoryChange}
              disabled={isSubmitting}
            >
              <SelectTrigger
                className={`${errors.categoryId && touchedFields.has("categoryId") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "focus:border-green-700 focus:ring-green-700"}`}
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center space-x-2">
                      <span>{category.icon}</span>
                      <span>{category.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && touchedFields.has("categoryId") && (
              <span className="text-sm text-red-500">{errors.categoryId}</span>
            )}
          </div>
        </div>

        {/* Type-specific content */}
        <TabsContent value="text" className="mt-6">
          <div className="space-y-2">
            <Label htmlFor="content">
              Content <span className="text-red-500">*</span>
            </Label>
            {showPreview ? (
              <Tabs defaultValue="edit" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="edit" className="mt-4">
                  <div data-testid="edit-post-content">
                    <Suspense fallback={<RichTextEditorSkeleton />}>
                      <RichTextEditor
                        content={formData.content}
                        onChange={handleContentChange}
                        placeholder="Write your post content here..."
                        className={
                          errors.content && touchedFields.has("content")
                            ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500"
                            : ""
                        }
                      />
                    </Suspense>
                  </div>
                </TabsContent>
                <TabsContent value="preview" className="mt-4">
                  <Suspense fallback={<PostPreviewSkeleton />}>
                    <PostPreview
                      post={{
                        id: "preview",
                        title: formData.title || "Untitled Post",
                        content: formData.content || "No content yet...",
                        createdAt: Date.now(),
                        upvotes: 0,
                        downvotes: 0,
                        commentCount: 0,
                        viewCount: 0,
                        type: "text",
                      }}
                    />
                  </Suspense>
                </TabsContent>
              </Tabs>
            ) : (
              <Suspense fallback={<RichTextEditorSkeleton />}>
                <RichTextEditor
                  content={formData.content}
                  onChange={handleContentChange}
                  placeholder="Write your post content here..."
                  className={
                    errors.content && touchedFields.has("content")
                      ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500"
                      : ""
                  }
                />
              </Suspense>
            )}
            <div className="flex items-center justify-between text-sm">
              <div>
                {errors.content && touchedFields.has("content") && (
                  <span className="text-red-500">{errors.content}</span>
                )}
              </div>
              <div
                className={`${
                  contentInfo.status === "error"
                    ? "text-red-500"
                    : contentInfo.status === "warning"
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                }`}
              >
                {contentInfo.length}/10,000 characters
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="image" className="mt-6">
          <div className="space-y-4">
            {/* Media Upload */}
            <div className="space-y-2">
              <Label>Media File</Label>
              <div className="border-muted-foreground/25 rounded-none border-2 border-dashed p-6">
                {formData.mediaFile || formData.mediaUrl ? (
                  <div className="space-y-4">
                    {/* Media Preview */}
                    {(mediaPreviewUrl || formData.mediaUrl) && (
                      <div className="relative">
                        {formData.type === "image" ? (
                          <Image
                            src={(mediaPreviewUrl || formData.mediaUrl) as string}
                            alt="Media preview"
                            width={400}
                            height={256}
                            className="h-auto max-h-64 max-w-full rounded-none object-contain"
                            unoptimized={true}
                          />
                        ) : (
                          <video
                            src={mediaPreviewUrl || formData.mediaUrl}
                            controls
                            className="h-auto max-h-64 max-w-full rounded-none"
                          />
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute right-2 top-2"
                          onClick={handleRemoveMedia}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="text-muted-foreground mx-auto h-12 w-12" />
                    <div className="mt-4">
                      <Label htmlFor="media-upload" className="cursor-pointer">
                        <span className="text-foreground mt-2 block text-sm font-medium">
                          Upload an image or video
                        </span>
                        <span className="text-muted-foreground mt-1 block text-xs">
                          PNG, JPG, GIF, MP4, MOV up to 10MB
                        </span>
                      </Label>
                      <input
                        id="media-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*,video/*"
                        onChange={handleMediaFileChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content for media posts */}
            <div className="space-y-2">
              <Label htmlFor="content">
                Description <span className="text-red-500">*</span>
              </Label>
              <Suspense fallback={<RichTextEditorSkeleton />}>
                <RichTextEditor
                  content={formData.content}
                  onChange={handleContentChange}
                  placeholder="Describe your image/video..."
                  className={
                    errors.content && touchedFields.has("content")
                      ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500"
                      : ""
                  }
                />
              </Suspense>
              <div className="flex items-center justify-between text-sm">
                <div>
                  {errors.content && touchedFields.has("content") && (
                    <span className="text-red-500">{errors.content}</span>
                  )}
                </div>
                <div
                  className={`${
                    contentInfo.status === "error"
                      ? "text-red-500"
                      : contentInfo.status === "warning"
                        ? "text-yellow-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {contentInfo.length}/10,000 characters
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="link" className="mt-6">
          <div className="space-y-4">
            {/* Link URL */}
            <div className="space-y-2">
              <Label htmlFor="linkUrl">
                Link URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="linkUrl"
                type="url"
                value={formData.linkUrl || ""}
                onChange={handleLinkUrlChange}
                placeholder="https://example.com"
                disabled={isSubmitting}
              />
            </div>

            {/* Link Preview */}
            {formData.linkTitle && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold">{formData.linkTitle}</h4>
                  {formData.linkDescription && (
                    <p className="text-muted-foreground mt-1 text-sm">{formData.linkDescription}</p>
                  )}
                  {formData.linkImage && (
                    <Image
                      src={formData.linkImage}
                      alt="Link preview image"
                      width={200}
                      height={128}
                      className="mt-2 h-auto max-h-32 max-w-full rounded object-cover"
                      unoptimized={true}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Content for link posts */}
            <div className="space-y-2">
              <Label htmlFor="content">
                Discussion <span className="text-red-500">*</span>
              </Label>
              <Suspense fallback={<RichTextEditorSkeleton />}>
                <RichTextEditor
                  content={formData.content}
                  onChange={handleContentChange}
                  placeholder="What do you think about this link? Start a discussion..."
                  className={
                    errors.content && touchedFields.has("content")
                      ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500"
                      : ""
                  }
                />
              </Suspense>
              <div className="flex items-center justify-between text-sm">
                <div>
                  {errors.content && touchedFields.has("content") && (
                    <span className="text-red-500">{errors.content}</span>
                  )}
                </div>
                <div
                  className={`${
                    contentInfo.status === "error"
                      ? "text-red-500"
                      : contentInfo.status === "warning"
                        ? "text-yellow-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {contentInfo.length}/10,000 characters
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
