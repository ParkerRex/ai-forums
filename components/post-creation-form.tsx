"use client";

import { useState, useCallback, lazy, Suspense, useEffect } from "react";
import { useMutation, useQuery, useConvex, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DraftsModal } from "@/components/drafts-modal";
import { PollCreationModal, PollData } from "@/components/poll-creation-modal";
import { MediaUploadSection } from "@/components/media-upload-section";
import { CategoryToggleGroup } from "@/components/category-toggle-group";
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
  Image as ImageIcon,
  Link,
  BarChart3,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Lazy load heavy components
const RichTextEditor = lazy(() => import("@/components/rich-text-editor"));
const PostPreview = lazy(() => import("@/components/post-preview"));

interface PostCreationFormProps {
  onSuccess?: (postId: Id<"posts">) => void;
  onCancel?: () => void;
}

// Extended form data with media/link fields
interface ExtendedPostFormData extends PostFormData {
  type: "text" | "image" | "video" | "link" | "poll";
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
}

// Loading skeleton for the rich text editor
function RichTextEditorSkeleton() {
  return (
    <div className="border rounded-lg">
      <div className="border-b p-2 bg-muted rounded-t-lg">
        <div className="flex flex-wrap gap-1">
          <div className="h-8 w-8 bg-muted opacity-50 rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted opacity-50 rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted opacity-50 rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted opacity-50 rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted opacity-50 rounded animate-pulse" />
        </div>
      </div>
      <div className="min-h-[200px] p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted opacity-50 rounded w-3/4" />
          <div className="h-4 bg-muted opacity-50 rounded w-1/2" />
          <div className="h-4 bg-muted opacity-50 rounded w-5/6" />
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for the post preview
function PostPreviewSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted opacity-50 rounded w-32" />
            <div className="h-4 bg-muted opacity-50 rounded w-24" />
          </div>
          <div className="h-8 bg-muted opacity-50 rounded w-3/4" />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-muted opacity-50 rounded-full" />
              <div className="space-y-1">
                <div className="h-4 bg-muted opacity-50 rounded w-16" />
                <div className="h-3 bg-muted opacity-50 rounded w-12" />
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="h-4 bg-muted opacity-50 rounded w-8" />
              <div className="h-4 bg-muted opacity-50 rounded w-8" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted opacity-50 rounded w-full" />
          <div className="h-4 bg-muted opacity-50 rounded w-5/6" />
          <div className="h-4 bg-muted opacity-50 rounded w-4/6" />
        </div>
      </CardContent>
    </Card>
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

  // Poll modal state
  const [showPollModal, setShowPollModal] = useState(false);

  // Track which fields have been touched by the user
  const [touchedFields, setTouchedFields] = useState<Set<keyof PostFormData>>(
    new Set(),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Real-time validation (only for touched fields)
  const { errors } = validatePostForm(formData, touchedFields);

  // Check overall form validity for submit button (regardless of touched state)
  const { isValid: formIsValid } = validatePostForm(formData);

  // Additional validation for media/link posts
  const isPostTypeValid = () => {
    if (formData.type === "image" || formData.type === "video") {
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
  };

  const isFormComplete = formIsValid && isPostTypeValid();

  // Queries and mutations
  const categories = useQuery(api.categories.getCategories);
  const createPost = useMutation(api.posts.createPost);
  const createPollPost = useMutation(api.polls.createPollPost);
  const fetchLinkPreview = useAction(api.linkPreview.fetchLinkPreview);

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
      setTouchedFields((prev) => new Set(prev).add("title"));
      setSubmitError(null);
    },
    [],
  );

  const handleContentChange = useCallback((content: string) => {
    setFormData((prev) => ({ ...prev, content }));
    setTouchedFields((prev) => new Set(prev).add("content"));
    setSubmitError(null);
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setFormData((prev) => ({ ...prev, categoryId }));
    setTouchedFields((prev) => new Set(prev).add("categoryId"));
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
        thumbnailUrl: undefined,
        linkUrl: undefined,
        linkTitle: undefined,
        linkDescription: undefined,
        linkImage: undefined,
        pollData: undefined,
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

  const handlePollConfirm = useCallback((pollData: PollData) => {
    setFormData((prev) => ({ ...prev, pollData }));
    setShowPollModal(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormComplete || isSubmitting) {
      // Mark all fields as touched to show validation errors
      setTouchedFields(new Set(["title", "content", "categoryId"]));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let mediaUrl = formData.mediaUrl;
      let thumbnailUrl = formData.thumbnailUrl;
      // Determine the correct post type. Default to the current formData.type.
      let resolvedType: ExtendedPostFormData["type"] = formData.type;

      // Handle new media items system
      if (formData.mediaItems && formData.mediaItems.length > 0) {
        // For now, use the first media item as the primary media
        // In the future, you could support multiple media in a single post
        const primaryMedia = formData.mediaItems[0];

        // Ensure the post type matches the primary media type (image | video)
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
      else if (
        formData.mediaFile &&
        (formData.type === "image" || formData.type === "video")
      ) {
        try {
          const uploadResult = await uploadMedia(convex, formData.mediaFile, {
            onProgress: (progress) => {
              setUploadProgress(progress.percentage);
            },
          });
          mediaUrl = uploadResult.url;
          thumbnailUrl = uploadResult.thumbnailUrl;
          // Ensure type matches the uploaded file
          resolvedType = formData.type;
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
        });
        postId = result.postId;
        postSlug = result.slug;
      } else {
        const result = await createPost({
          title: formData.title.trim(),
          content: formData.content.trim(),
          categoryId: formData.categoryId as Id<"categories">,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: resolvedType as any,
          mediaUrl,
          thumbnailUrl,
          aspectRatio: formData.aspectRatio,
          mediaWidth: formData.mediaWidth,
          mediaHeight: formData.mediaHeight,
          linkUrl: formData.linkUrl,
          linkTitle: formData.linkTitle,
          linkDescription: formData.linkDescription,
          linkImage: formData.linkImage,
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

      toast.success("Post created successfully!");

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
  };

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
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted opacity-50 rounded w-1/4" />
              <div className="h-10 bg-muted opacity-50 rounded" />
              <div className="h-4 bg-muted opacity-50 rounded w-1/4" />
              <div className="h-10 bg-muted opacity-50 rounded" />
              <div className="h-32 bg-muted opacity-50 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submit Error */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Post Type Tabs */}
          <Tabs
            value={formData.type}
            onValueChange={handleTypeChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
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
              <TabsTrigger value="poll" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Poll
              </TabsTrigger>
            </TabsList>

            {/* Common fields */}
            <div className="space-y-6 mt-6">
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
                />
                <div className="flex justify-between items-center text-sm">
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
                <Label>
                  Category <span className="text-red-500">*</span>
                </Label>
                <CategoryToggleGroup
                  categories={
                    categories?.map((cat) => ({
                      id: cat._id,
                      name: cat.name,
                      displayName: cat.displayName,
                      description: cat.description,
                      icon: cat.icon,
                      postCount: cat.postCount,
                      isTrending: false, // You can add trending logic here
                    })) || []
                  }
                  value={formData.categoryId}
                  onChange={handleCategoryChange}
                  disabled={isSubmitting}
                />
                {errors.categoryId && touchedFields.has("categoryId") && (
                  <span className="text-red-500 text-sm">
                    {errors.categoryId}
                  </span>
                )}
              </div>
            </div>

            {/* Type-specific content */}
            <TabsContent value="text" className="mt-6">
              <div className="space-y-2">
                <Label htmlFor="content">
                  Content <span className="text-red-500">*</span>
                </Label>
                <Tabs defaultValue="edit" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit" className="mt-4">
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
                  </TabsContent>
                  <TabsContent value="preview" className="mt-4">
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
                            firstName: "You",
                            lastName: "",
                            username: "you",
                            slug: "you",
                          },
                        }}
                      />
                    </Suspense>
                  </TabsContent>
                </Tabs>
                <div className="flex justify-between items-center text-sm">
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

            <TabsContent value="image" className="mt-6 space-y-6">
              {/* Media Upload */}
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

              {/* Description for media posts */}
              <div className="space-y-2">
                <Label htmlFor="media-content">
                  Description{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Suspense fallback={<RichTextEditorSkeleton />}>
                  <RichTextEditor
                    content={formData.content}
                    onChange={handleContentChange}
                    placeholder="Add a description for your media..."
                    className=""
                  />
                </Suspense>
                <div className="text-sm text-muted-foreground text-right">
                  {contentInfo.length}/10,000 characters
                </div>
              </div>
            </TabsContent>

            <TabsContent value="link" className="mt-6 space-y-6">
              {/* Link URL */}
              <div className="space-y-2">
                <Label htmlFor="link-url">
                  Link URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="link-url"
                  type="url"
                  value={formData.linkUrl || ""}
                  onChange={handleLinkUrlChange}
                  placeholder="https://example.com"
                  className="focus:border-green-700 focus:ring-green-700"
                  disabled={isSubmitting}
                />
                {formData.linkUrl && formData.linkTitle && (
                  <Card className="mt-4">
                    <CardContent className="p-4">
                      <div className="flex space-x-4">
                        {formData.linkImage && (
                          <Image
                            src={formData.linkImage}
                            alt="Link preview image"
                            width={96}
                            height={96}
                            className="w-24 h-24 object-cover rounded"
                            unoptimized={true}
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{formData.linkTitle}</h4>
                          {formData.linkDescription && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {formData.linkDescription}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new URL(formData.linkUrl).hostname}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Description for link posts */}
              <div className="space-y-2">
                <Label htmlFor="link-content">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Suspense fallback={<RichTextEditorSkeleton />}>
                  <RichTextEditor
                    content={formData.content}
                    onChange={handleContentChange}
                    placeholder="Share your thoughts about this link..."
                    className={
                      errors.content && touchedFields.has("content")
                        ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500"
                        : ""
                    }
                  />
                </Suspense>
                <div className="flex justify-between items-center text-sm">
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

            <TabsContent value="poll" className="mt-6 space-y-6">
              {/* Poll Options */}
              <div className="space-y-2">
                <Label>
                  Poll Options <span className="text-red-500">*</span>
                </Label>
                {formData.pollData ? (
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground mb-3">
                          {formData.pollData.options.length} options • Ends in{" "}
                          {formData.pollData.duration === "unlimited"
                            ? "never"
                            : formData.pollData.duration}
                        </p>
                        {formData.pollData.options.map((option, index) => (
                          <div
                            key={option.id}
                            className="flex items-center space-x-2"
                          >
                            <span className="text-sm text-muted-foreground w-6">
                              {index + 1}.
                            </span>
                            <span className="flex-1">{option.text}</span>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPollModal(true)}
                          className="w-full mt-3"
                        >
                          Edit Poll Options
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPollModal(true)}
                    className="w-full"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Create Poll Options
                  </Button>
                )}
              </div>

              {/* Description for poll posts */}
              <div className="space-y-2">
                <Label htmlFor="poll-content">
                  Description{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Suspense fallback={<RichTextEditorSkeleton />}>
                  <RichTextEditor
                    content={formData.content}
                    onChange={handleContentChange}
                    placeholder="Add context or details about your poll..."
                    className=""
                  />
                </Suspense>
                <div className="text-sm text-muted-foreground text-right">
                  {contentInfo.length}/10,000 characters
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-4 border-t space-y-4 sm:space-y-0">
            <DraftsModal>
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <FileText className="w-4 h-4 mr-2" />
                Drafts
              </Button>
            </DraftsModal>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormComplete || isSubmitting}
                className="bg-green-700 hover:bg-green-800 w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadProgress !== null
                      ? `Uploading... ${uploadProgress}%`
                      : "Publishing..."}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>

      {/* Poll Creation Modal */}
      <PollCreationModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onConfirm={handlePollConfirm}
      />
    </Card>
  );
}

export default PostCreationForm;
