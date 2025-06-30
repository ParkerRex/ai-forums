"use client";

import { useState, useCallback, lazy, Suspense, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PostFormData,
  validatePostForm,
  getCharacterCountInfo
} from "@/lib/form-validation";
import { 
  // uploadMedia, 
  validateMediaFile, 
  getFilePreviewUrl, 
  revokeFilePreviewUrl 
} from "@/lib/upload-media";
import { FileText, Image, Link, Upload, X } from "lucide-react";
import { toast } from "sonner";

// Lazy load heavy components
const RichTextEditor = lazy(() => import("@/components/rich-text-editor"));
const PostPreview = lazy(() => import("@/components/post-preview"));

// Extended form data with media/link fields
export interface ExtendedPostFormData extends PostFormData {
  type: "text" | "image" | "video" | "link";
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
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted opacity-50 rounded w-3/4" />
          <div className="h-4 bg-muted opacity-50 rounded w-full" />
          <div className="h-4 bg-muted opacity-50 rounded w-5/6" />
          <div className="h-4 bg-muted opacity-50 rounded w-4/6" />
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

  // Queries and actions
  const categories = useQuery(api.categories.getCategories);
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
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFormDataChange({ title: e.target.value });
    onTouchedFieldsChange(new Set(touchedFields).add('title'));
  }, [onFormDataChange, onTouchedFieldsChange, touchedFields]);

  const handleContentChange = useCallback((content: string) => {
    onFormDataChange({ content });
    onTouchedFieldsChange(new Set(touchedFields).add('content'));
  }, [onFormDataChange, onTouchedFieldsChange, touchedFields]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    onFormDataChange({ categoryId });
    onTouchedFieldsChange(new Set(touchedFields).add('categoryId'));
  }, [onFormDataChange, onTouchedFieldsChange, touchedFields]);

  const handleTypeChange = useCallback((type: string) => {
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
  }, [onFormDataChange, mediaPreviewUrl]);

  const handleMediaFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [onFormDataChange, mediaPreviewUrl]);

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

  const handleLinkUrlChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    onFormDataChange({ linkUrl: url });
    
    // Fetch link preview if valid URL
    if (url && url.match(/^https?:\/\/.+/)) {
      try {
        const preview = await fetchLinkPreview({ url });
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
  }, [onFormDataChange, fetchLinkPreview]);

  // Loading state for categories
  if (categories === undefined) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted opacity-50 rounded w-1/4" />
          <div className="h-10 bg-muted opacity-50 rounded" />
          <div className="h-4 bg-muted opacity-50 rounded w-1/4" />
          <div className="h-10 bg-muted opacity-50 rounded" />
          <div className="h-32 bg-muted opacity-50 rounded" />
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
            <Image className="h-4 w-4" />
            Image/Video
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Link
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
              className={`${errors.title && touchedFields.has('title') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-green-700 focus:ring-green-700'}`}
              disabled={isSubmitting}
              data-testid="edit-post-title"
            />
            <div className="flex justify-between items-center text-sm">
              <div>
                {errors.title && touchedFields.has('title') && (
                  <span className="text-red-500">{errors.title}</span>
                )}
              </div>
              <div className={`${titleInfo.status === 'error' ? 'text-red-500' :
                titleInfo.status === 'warning' ? 'text-yellow-500' :
                  'text-muted-foreground'
                }`}>
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
              <SelectTrigger className={`${errors.categoryId && touchedFields.has('categoryId') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-green-700 focus:ring-green-700'}`}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    <div className="flex items-center space-x-2">
                      <span>{category.icon}</span>
                      <span>{category.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && touchedFields.has('categoryId') && (
              <span className="text-red-500 text-sm">{errors.categoryId}</span>
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
                        className={errors.content && touchedFields.has('content') ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500' : ''}
                      />
                    </Suspense>
                  </div>
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
                  className={errors.content && touchedFields.has('content') ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500' : ''}
                />
              </Suspense>
            )}
            <div className="flex justify-between items-center text-sm">
              <div>
                {errors.content && touchedFields.has('content') && (
                  <span className="text-red-500">{errors.content}</span>
                )}
              </div>
              <div className={`${contentInfo.status === 'error' ? 'text-red-500' :
                contentInfo.status === 'warning' ? 'text-yellow-500' :
                  'text-muted-foreground'
                }`}>
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
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                {formData.mediaFile || formData.mediaUrl ? (
                  <div className="space-y-4">
                    {/* Media Preview */}
                    {(mediaPreviewUrl || formData.mediaUrl) && (
                      <div className="relative">
                        {formData.type === "image" ? (
                          <img
                            src={mediaPreviewUrl || formData.mediaUrl}
                            alt="Preview"
                            className="max-w-full h-auto max-h-64 rounded-lg"
                          />
                        ) : (
                          <video
                            src={mediaPreviewUrl || formData.mediaUrl}
                            controls
                            className="max-w-full h-auto max-h-64 rounded-lg"
                          />
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveMedia}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="mt-4">
                      <Label htmlFor="media-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-foreground">
                          Upload an image or video
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
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
                  className={errors.content && touchedFields.has('content') ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500' : ''}
                />
              </Suspense>
              <div className="flex justify-between items-center text-sm">
                <div>
                  {errors.content && touchedFields.has('content') && (
                    <span className="text-red-500">{errors.content}</span>
                  )}
                </div>
                <div className={`${contentInfo.status === 'error' ? 'text-red-500' :
                  contentInfo.status === 'warning' ? 'text-yellow-500' :
                    'text-muted-foreground'
                  }`}>
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
                    <p className="text-sm text-muted-foreground mt-1">
                      {formData.linkDescription}
                    </p>
                  )}
                  {formData.linkImage && (
                    <img
                      src={formData.linkImage}
                      alt="Link preview"
                      className="mt-2 max-w-full h-auto max-h-32 rounded"
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
                  className={errors.content && touchedFields.has('content') ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500' : ''}
                />
              </Suspense>
              <div className="flex justify-between items-center text-sm">
                <div>
                  {errors.content && touchedFields.has('content') && (
                    <span className="text-red-500">{errors.content}</span>
                  )}
                </div>
                <div className={`${contentInfo.status === 'error' ? 'text-red-500' :
                  contentInfo.status === 'warning' ? 'text-yellow-500' :
                    'text-muted-foreground'
                  }`}>
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