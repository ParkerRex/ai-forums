"use client";

import { useState, useCallback, lazy, Suspense, useEffect } from "react";
import { useMutation, useQuery, useConvex, useAction } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Id } from "@/web/convex/_generated/dataModel";
import { Button } from "@/web/components/ui/button";
import { Input } from "@/web/components/ui/input";
import { Label } from "@/web/components/ui/label";
import { PreviewGenerationDialog } from "@/web/components/posts/preview-generation-dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/web/components/ui/alert";
import { DraftsModal } from "@/web/components/posts/drafts-modal";
import {
  PollCreationInline,
  PollData,
} from "@/web/components/posts/poll-creation-inline";
import { MediaUploadSection } from "@/web/components/posts/media-upload-section";
import { CategoryToggleGroup } from "@/web/components/posts/category-toggle-group";
import { PostPreviewToggle } from "@/web/components/posts/post-preview-toggle";
import { MediaItem } from "@/types";
import {
  PostFormData,
  validatePostForm,
  getCharacterCountInfo,
} from "@/lib/form-validation";
import { uploadMedia, revokeFilePreviewUrl } from "@/lib/upload-media";
import {
  AlertCircle,
  Loader2,
  Send,
  FileText,
  Link,
  BarChart3,
  Image as ImageIcon,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Lazy load heavy components
const RichTextEditor = lazy(
  () => import("@/web/components/posts/rich-text-editor"),
);
const PostPreview = lazy(() => import("@/web/components/posts/post-preview"));

interface PostCreationFormProps {
  onSuccess?: (postId: Id<"posts">) => void;
  onCancel?: () => void;
}

// Extended form data with media/link fields
interface ExtendedPostFormData extends PostFormData {
  type: "text" | "media" | "link" | "poll";
  mediaType?: "image" | "video"; // Sub-type for media posts
  mediaFile?: File;
  mediaUrl?: string;
  thumbnailUrl?: string;
  aspectRatio?: number;
  mediaWidth?: number;
  mediaHeight?: number;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  pollData?: PollData;
  mediaItems?: MediaItem[];
  preview?: string;
}

// Loading skeleton for the rich text editor
function RichTextEditorSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="bg-muted h-4 w-3/4 rounded" />
      <div className="bg-muted h-4 w-1/2 rounded" />
      <div className="bg-muted h-4 w-5/6 rounded" />
    </div>
  );
}

// Loading skeleton for the post preview
function PostPreviewSkeleton() {
  return (
    <div className="rounded-none border p-6">
      <div className="animate-pulse space-y-4">
        <div className="bg-muted h-8 w-3/4 rounded" />
        <div className="space-y-3">
          <div className="bg-muted h-4 w-full rounded" />
          <div className="bg-muted h-4 w-5/6 rounded" />
          <div className="bg-muted h-4 w-4/6 rounded" />
        </div>
      </div>
    </div>
  );
}

// Publish button component
function PublishButton({
  isFormComplete,
  isSubmitting,
  uploadProgress,
}: {
  isFormComplete: boolean;
  isSubmitting: boolean;
  uploadProgress: number | null;
}) {
  return (
    <div className="flex justify-end pt-3">
      <Button
        type="submit"
        disabled={!isFormComplete || isSubmitting}
        size="sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploadProgress !== null
              ? `Uploading... ${uploadProgress}%`
              : "Publishing..."}
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Publish
          </>
        )}
      </Button>
    </div>
  );
}

export function PostCreationForm({
  onSuccess,
  onCancel,
}: PostCreationFormProps) {
  const router = useRouter();
  const convex = useConvex();

  // Form state
  const [formData, setFormData] = useState<ExtendedPostFormData>({
    title: "",
    content: "",
    categoryId: "",
    type: "text",
    mediaItems: [],
  });

  // Media preview state
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Preview generation state
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Content tab state (for edit/preview toggle)
  const [contentTab, setContentTab] = useState<"edit" | "preview">("edit");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Real-time validation (only for touched fields)
  const { errors } = validatePostForm(formData, new Set()); // Don't show errors until submit

  // Check overall form validity for submit button (regardless of touched state)
  const { isValid: formIsValid } = validatePostForm(formData);

  // Additional validation for media/link posts
  const isPostTypeValid = useCallback(() => {
    if (formData.type === "media") {
      return (
        (formData.mediaItems && formData.mediaItems.length > 0) ||
        formData.mediaFile !== undefined ||
        formData.mediaUrl !== undefined
      );
    }
    if (formData.type === "link") {
      return formData.linkUrl !== undefined && formData.linkUrl.trim() !== "";
    }
    if (formData.type === "poll") {
      return (
        formData.pollData !== undefined && formData.pollData.options.length >= 2
      );
    }
    return true;
  }, [
    formData.type,
    formData.mediaItems,
    formData.mediaFile,
    formData.mediaUrl,
    formData.linkUrl,
    formData.pollData,
  ]);

  const isFormComplete = formIsValid && isPostTypeValid();

  // Queries and mutations
  const categories = useQuery(api.categories.getCategories) as
    | Array<{
        _id: Id<"categories">;
        name: string;
        displayName: string;
        description: string;
        icon?: string;
        postCount: number;
      }>
    | undefined;
  const createPost = useMutation(api.posts.createPost);
  const createPollPost = useMutation(api.polls.createPollPost);
  const deletePost = useMutation(api.posts.deletePost);
  const fetchLinkPreview = useAction(api.linkPreview.fetchLinkPreview);
  const generatePostPreview = useAction(
    api.previewGeneration.generatePostPreview,
  );

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
      setFormData((prev) => ({ ...prev, title: e.target.value }));
      setSubmitError(null);
    },
    [],
  );

  const handleContentChange = useCallback((content: string) => {
    setFormData((prev) => ({ ...prev, content }));
    setSubmitError(null);
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setFormData((prev) => ({ ...prev, categoryId }));
    setSubmitError(null);
  }, []);

  const handleTypeChange = useCallback(
    (type: string) => {
      setFormData((prev) => ({
        ...prev,
        type: type as ExtendedPostFormData["type"],
        // Reset type-specific fields when switching
        mediaFile: undefined,
        mediaUrl: undefined,
        mediaType: undefined,
        thumbnailUrl: undefined,
        linkUrl: undefined,
        linkTitle: undefined,
        linkDescription: undefined,
        linkImage: undefined,
        pollData: undefined,
        mediaItems: undefined,
      }));
      // Clean up media preview
      if (mediaPreviewUrl) {
        revokeFilePreviewUrl(mediaPreviewUrl);
        setMediaPreviewUrl(null);
      }
      setUploadProgress(null);
    },
    [mediaPreviewUrl],
  );

  // Old media handling functions removed - now handled by MediaUploadSection

  const handleLinkUrlChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setFormData((prev) => ({ ...prev, linkUrl: url }));

      // Fetch link preview if valid URL
      if (url && url.match(/^https?:\/\/.+/)) {
        try {
          const preview = await fetchLinkPreview({ url });
          if (preview) {
            setFormData((prev) => ({
              ...prev,
              linkTitle: preview.title,
              linkDescription: preview.description,
              linkImage: preview.image,
            }));
          }
        } catch (error) {
          console.error("Failed to fetch link preview:", error);
        }
      }
    },
    [fetchLinkPreview],
  );

  const handlePollChange = useCallback((pollData: PollData) => {
    setFormData((prev) => ({ ...prev, pollData }));
  }, []);

  const handleGeneratePreview = useCallback(async () => {
    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      const preview = await generatePostPreview({
        title: formData.title,
        content: formData.content,
      });

      setFormData((prev) => ({ ...prev, preview }));
      setIsGeneratingPreview(false);
    } catch (error) {
      console.error("Failed to generate preview:", error);
      setPreviewError("Failed to generate preview. Please try again.");
      setIsGeneratingPreview(false);
    }
  }, [formData.title, formData.content, generatePostPreview]);

  // Define handleActualSubmit first before using it in handlePreviewConfirm
  const handleActualSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let mediaUrl = formData.mediaUrl;
      let thumbnailUrl = formData.thumbnailUrl;
      // Determine the correct post type. Default to the current formData.type.
      let resolvedType: "text" | "image" | "video" | "link" | "poll" =
        formData.type === "media" ? "image" : formData.type;

      // Handle new media items system
      if (
        formData.type === "media" &&
        formData.mediaItems &&
        formData.mediaItems.length > 0
      ) {
        // For now, use the first media item as the primary media
        // In the future, you could support multiple media in a single post
        const primaryMedia = formData.mediaItems[0];

        // Set the actual media type (image or video) for API
        if (primaryMedia.type === "image" || primaryMedia.type === "video") {
          resolvedType = primaryMedia.type;
        }

        // Check if media needs uploading (local file)
        if (primaryMedia.url.startsWith("blob:") && !primaryMedia.isUploading) {
          // Media should already be uploaded via onUpload callback
          // If not, this is an error state
          throw new Error(
            "Media upload incomplete. Please wait for upload to finish.",
          );
        }

        mediaUrl = primaryMedia.url;
        thumbnailUrl = primaryMedia.thumbnailUrl;

        // Use dimensions from the first media item
        if (primaryMedia.width && primaryMedia.height) {
          formData.aspectRatio = primaryMedia.aspectRatio;
          formData.mediaWidth = primaryMedia.width;
          formData.mediaHeight = primaryMedia.height;
        }
      }
      // Fallback to old media upload system
      else if (formData.mediaFile && formData.type === "media") {
        try {
          const uploadResult = await uploadMedia(convex, formData.mediaFile, {
            onProgress: (progress) => {
              setUploadProgress(progress.percentage);
            },
          });
          mediaUrl = uploadResult.url;
          thumbnailUrl = uploadResult.thumbnailUrl;
          // Determine if uploaded file is image or video
          const fileType = formData.mediaFile.type.startsWith("video/")
            ? "video"
            : "image";
          resolvedType = fileType;
        } catch (uploadError) {
          console.error("Failed to upload media:", uploadError);
          throw new Error("Failed to upload media. Please try again.");
        }
      }

      let postId;
      let postSlug;

      if (resolvedType === "poll" && formData.pollData) {
        const result = await createPollPost({
          title: formData.title.trim(),
          content: formData.content.trim(),
          categoryId: formData.categoryId as Id<"categories">,
          pollOptions: formData.pollData.options,
          pollDuration: formData.pollData.duration,
          preview: formData.preview || "",
        });
        postId = result.postId;
        postSlug = result.slug;
      } else {
        const result = await createPost({
          title: formData.title.trim(),
          content: formData.content.trim(),
          categoryId: formData.categoryId as Id<"categories">,
          type: resolvedType as "text" | "image" | "video" | "link",
          mediaUrl,
          thumbnailUrl,
          aspectRatio: formData.aspectRatio,
          mediaWidth: formData.mediaWidth,
          mediaHeight: formData.mediaHeight,
          linkUrl: formData.linkUrl,
          linkTitle: formData.linkTitle,
          linkDescription: formData.linkDescription,
          linkImage: formData.linkImage,
          preview: formData.preview || "",
          // Pass all media items as attachments
          attachments: formData.mediaItems?.map((item, index) => ({
            id: item.id,
            type: item.type,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl,
            width: item.width,
            height: item.height,
            aspectRatio: item.aspectRatio,
            order: index,
            // PDF specific
            pageCount: item.pageCount,
            fileSize: item.fileSize,
            // YouTube specific
            videoId: item.videoId,
            title: item.title,
            duration: item.duration,
            channelName: item.channelName,
            // Video specific
            videoDuration: item.videoDuration,
            format: item.format,
            resolution: item.resolution,
            codec: item.codec,
          })),
        });
        postId = result.postId;
        postSlug = result.slug;
      }

      // Show success toast with undo button
      toast.success("New post created", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await deletePost({ postId });
              toast.success("Post deleted");
              // Navigate back to the previous page or home
              router.back();
            } catch (error) {
              console.error("Failed to delete post:", error);
              toast.error("Failed to undo post");
            }
          },
        },
        duration: 5000,
      });

      if (onSuccess) {
        onSuccess(postId);
      } else {
        // Find the category name for the redirect
        const category = categories?.find((c) => c._id === formData.categoryId);
        const categoryName = category?.name || "general";

        // Now both post types return slug, so we can always use it
        router.push(`/${categoryName}/${postSlug}`);
      }
    } catch (error) {
      console.error("Failed to create post:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create post. Please try again.";
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  }, [
    formData,
    categories,
    createPost,
    createPollPost,
    deletePost,
    convex,
    onSuccess,
    router,
  ]);

  const handlePreviewConfirm = useCallback(
    (preview: string) => {
      setFormData((prev) => ({ ...prev, preview }));
      setShowPreviewDialog(false);
      // Proceed with actual submission
      handleActualSubmit();
    },
    [handleActualSubmit],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isFormComplete || isSubmitting) {
        // Show validation errors only on submit attempt

        // Show a toast with the validation error
        const validationErrors = [];
        if (errors.title) validationErrors.push(errors.title);
        if (errors.categoryId) validationErrors.push(errors.categoryId);
        if (errors.content) validationErrors.push(errors.content);
        if (!isPostTypeValid()) {
          if (formData.type === "media")
            validationErrors.push("Please add at least one media item");
          if (formData.type === "link")
            validationErrors.push("Please enter a valid URL");
          if (formData.type === "poll")
            validationErrors.push("Please add at least 2 poll options");
        }

        if (validationErrors.length > 0) {
          toast.error(validationErrors[0]);
        }
        return;
      }

      // Show preview dialog and generate preview
      setShowPreviewDialog(true);
      handleGeneratePreview();
    },
    [
      isFormComplete,
      isSubmitting,
      errors,
      isPostTypeValid,
      formData.type,
      setShowPreviewDialog,
      handleGeneratePreview,
    ],
  );

  // Handle keyboard shortcuts for form submission
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      const isMac = navigator.userAgent.includes("Mac");
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === "Enter") {
        e.preventDefault();
        if (isFormComplete && !isSubmitting) {
          handleSubmit({
            preventDefault: () => {},
            currentTarget: document.createElement("form"),
            target: document.createElement("form"),
          } as unknown as React.FormEvent);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFormComplete, isSubmitting, handleSubmit]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  // Loading state for categories
  if (categories === undefined) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-8 w-1/4 rounded" />
          <div className="bg-muted h-96 rounded" />
        </div>
      </div>
    );
  }

  // Type buttons configuration - simplified
  const typeButtons = [
    { value: "text", icon: FileText, label: "Text" },
    { value: "media", icon: ImageIcon, label: "Media" },
    { value: "link", icon: Link, label: "Link" },
    { value: "poll", icon: BarChart3, label: "Poll" },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">Create post</h1>
          </div>
          <div className="flex items-center gap-3">
            <DraftsModal>
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                size="sm"
              >
                <FileText className="mr-2 h-4 w-4" />
                Drafts
              </Button>
            </DraftsModal>
          </div>
        </div>

        {/* Submit Error */}
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Post Type Selection */}
        <div className="bg-muted flex w-fit items-center gap-2 rounded-none p-1">
          {typeButtons.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTypeChange(value)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                formData.type === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="Post title"
              className="h-auto py-3 text-2xl font-medium"
              disabled={isSubmitting}
              autoFocus
            />
            <div className="flex items-center justify-end">
              <div
                className={cn("text-xs tabular-nums", "text-muted-foreground")}
              >
                {titleInfo.length}
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label className="pr-4 text-sm font-medium">Category</Label>
            <CategoryToggleGroup
              categories={
                categories?.map((cat) => ({
                  id: cat._id,
                  name: cat.name,
                  displayName: cat.displayName,
                  description: cat.description,
                  icon: cat.icon,
                  postCount: cat.postCount,
                  isTrending: false,
                })) || []
              }
              value={formData.categoryId}
              onChange={handleCategoryChange}
              disabled={isSubmitting}
            />
          </div>

          {/* Type-specific content */}
          {formData.type === "text" && (
            <div className="space-y-4">
              {/* Consistent toggle placement at the top */}
              <div className="flex items-center justify-between">
                <PostPreviewToggle
                  value={contentTab}
                  onValueChange={setContentTab}
                />
                <div
                  className={cn(
                    "text-xs tabular-nums",
                    "text-muted-foreground",
                  )}
                >
                  {contentInfo.length}
                </div>
              </div>

              {contentTab === "edit" ? (
                <div className="space-y-2">
                  <Suspense fallback={<RichTextEditorSkeleton />}>
                    <RichTextEditor
                      content={formData.content}
                      onChange={handleContentChange}
                      placeholder="Write your post..."
                      className="min-h-[300px]"
                    />
                  </Suspense>
                  <PublishButton
                    isFormComplete={isFormComplete}
                    isSubmitting={isSubmitting}
                    uploadProgress={uploadProgress}
                  />
                </div>
              ) : (
                <Suspense fallback={<PostPreviewSkeleton />}>
                  <PostPreview
                    post={{
                      _id: "preview" as unknown as Id<"posts">,
                      title: formData.title || "Untitled Post",
                      content: formData.content || "No content yet...",
                      createdAt: Date.now(),
                      upvotes: 0,
                      downvotes: 0,
                      commentCount: 0,
                      viewCount: 0,
                      type: "text",
                      member: {
                        _id: "preview" as unknown as Id<"members">,
                        firstName: "You",
                        lastName: "",
                        username: "you",
                        slug: "you",
                      },
                    }}
                    showMember={false}
                  />
                </Suspense>
              )}
            </div>
          )}

          {formData.type === "media" && (
            <div className="space-y-6">
              <MediaUploadSection
                media={formData.mediaItems || []}
                onMediaChange={(mediaItems) => {
                  setFormData((prev) => ({ ...prev, mediaItems }));
                  // Preserve the currently selected tab ("image") even when the first media
                  // item is a video. We still determine the final post type during submission
                  // based on the media item's type, so no need to update `formData.type` here.
                }}
                onUpload={async (file, mediaItem) => {
                  // Handle upload with progress tracking
                  const result = await uploadMedia(convex, file, {
                    onProgress: (progress) => {
                      // Update the specific media item's progress
                      setFormData((prev) => ({
                        ...prev,
                        mediaItems:
                          prev.mediaItems?.map((item) =>
                            item.id === mediaItem.id
                              ? { ...item, uploadProgress: progress.percentage }
                              : item,
                          ) || [],
                      }));
                    },
                  });

                  // Update media item with uploaded URL
                  setFormData((prev) => ({
                    ...prev,
                    mediaItems:
                      prev.mediaItems?.map((item) =>
                        item.id === mediaItem.id
                          ? {
                              ...item,
                              url: result.url,
                              thumbnailUrl: result.thumbnailUrl,
                              isUploading: false,
                              uploadProgress: 100,
                            }
                          : item,
                      ) || [],
                  }));
                }}
                disabled={isSubmitting}
              />

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Description (optional)
                </Label>
                <Suspense fallback={<RichTextEditorSkeleton />}>
                  <RichTextEditor
                    content={formData.content}
                    onChange={handleContentChange}
                    placeholder="Add a description..."
                    className="min-h-[150px]"
                  />
                </Suspense>
                <div className="text-muted-foreground text-right text-xs">
                  {contentInfo.length}/10,000
                </div>
                <PublishButton
                  isFormComplete={isFormComplete}
                  isSubmitting={isSubmitting}
                  uploadProgress={uploadProgress}
                />
              </div>
            </div>
          )}

          {formData.type === "link" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">URL</Label>
                <Input
                  id="link-url"
                  type="url"
                  value={formData.linkUrl || ""}
                  onChange={handleLinkUrlChange}
                  placeholder="https://example.com"
                  disabled={isSubmitting}
                />
                {formData.linkUrl && formData.linkTitle && (
                  <div className="mt-4 rounded-none border p-4">
                    <div className="flex gap-4">
                      {formData.linkImage && (
                        <Image
                          src={formData.linkImage}
                          alt="Link preview"
                          width={96}
                          height={96}
                          className="h-24 w-24 rounded object-cover"
                          unoptimized={true}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-medium">
                          {formData.linkTitle}
                        </h4>
                        {formData.linkDescription && (
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                            {formData.linkDescription}
                          </p>
                        )}
                        <p className="text-muted-foreground mt-2 text-xs">
                          {new URL(formData.linkUrl).hostname}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Description</Label>
                <Suspense fallback={<RichTextEditorSkeleton />}>
                  <RichTextEditor
                    content={formData.content}
                    onChange={handleContentChange}
                    placeholder="Share your thoughts about this link..."
                    className="min-h-[150px]"
                  />
                </Suspense>
                <div className="flex items-center justify-end">
                  <div
                    className={cn(
                      "text-xs tabular-nums",
                      "text-muted-foreground",
                    )}
                  >
                    {contentInfo.length}/10,000
                  </div>
                </div>
                <PublishButton
                  isFormComplete={isFormComplete}
                  isSubmitting={isSubmitting}
                  uploadProgress={uploadProgress}
                />
              </div>
            </div>
          )}

          {formData.type === "poll" && (
            <div className="space-y-6">
              <PollCreationInline
                pollData={formData.pollData}
                onChange={handlePollChange}
                disabled={isSubmitting}
              />

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Description (optional)
                </Label>
                <Suspense fallback={<RichTextEditorSkeleton />}>
                  <RichTextEditor
                    content={formData.content}
                    onChange={handleContentChange}
                    placeholder="Add context about your poll..."
                    className="min-h-[150px]"
                  />
                </Suspense>
                <div className="text-muted-foreground text-right text-xs">
                  {contentInfo.length}/10,000
                </div>
                <PublishButton
                  isFormComplete={isFormComplete}
                  isSubmitting={isSubmitting}
                  uploadProgress={uploadProgress}
                />
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Preview Generation Dialog */}
      <PreviewGenerationDialog
        isOpen={showPreviewDialog}
        onClose={() => {
          setShowPreviewDialog(false);
          setIsGeneratingPreview(false);
          setPreviewError(null);
        }}
        onConfirm={handlePreviewConfirm}
        title={formData.title}
        isGenerating={isGeneratingPreview}
        generatedPreview={formData.preview || null}
        error={previewError}
      />
    </div>
  );
}

export default PostCreationForm;
