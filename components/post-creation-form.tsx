"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostPreview } from "@/components/post-preview";
import { DraftsModal } from "@/components/drafts-modal";
import {
  PostFormData,
  validatePostForm,
  getCharacterCountInfo
} from "@/lib/form-validation";
import { AlertCircle, Loader2, Send, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PostCreationFormProps {
  onSuccess?: (postId: Id<"posts">) => void;
  onCancel?: () => void;
}

export function PostCreationForm({ onSuccess, onCancel }: PostCreationFormProps) {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<PostFormData>({
    title: "",
    content: "",
    categoryId: "",
  });

  // Track which fields have been touched by the user
  const [touchedFields, setTouchedFields] = useState<Set<keyof PostFormData>>(new Set());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Real-time validation (only for touched fields)
  const { errors, isValid } = validatePostForm(formData, touchedFields);

  // Queries and mutations
  const categories = useQuery(api.categories.getCategories);
  const createPost = useMutation(api.posts.createPost);

  // Character count helpers
  const titleInfo = getCharacterCountInfo(formData.title, 5, 200);
  const contentInfo = getCharacterCountInfo(formData.content, 10, 10000);

  // Form handlers
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
    setTouchedFields(prev => new Set(prev).add('title'));
    setSubmitError(null);
  }, []);

  const handleContentChange = useCallback((content: string) => {
    setFormData(prev => ({ ...prev, content }));
    setTouchedFields(prev => new Set(prev).add('content'));
    setSubmitError(null);
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setFormData(prev => ({ ...prev, categoryId }));
    setTouchedFields(prev => new Set(prev).add('categoryId'));
    setSubmitError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields for submission (ignore touched state)
    const { isValid: allFieldsValid } = validatePostForm(formData);

    if (!allFieldsValid || isSubmitting) {
      // Mark all fields as touched to show validation errors
      setTouchedFields(new Set(['title', 'content', 'categoryId']));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const postId = await createPost({
        title: formData.title.trim(),
        content: formData.content.trim(),
        categoryId: formData.categoryId as Id<"categories">,
      });

      toast.success("Post created successfully!");

      if (onSuccess) {
        onSuccess(postId);
      } else {
        router.push(`/post/${postId}`);
      }
    } catch (error) {
      console.error("Failed to create post:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to create post. Please try again.";
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
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
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-200 rounded" />
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
              className={`${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-green-700 focus:ring-green-700'}`}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center text-sm">
              <div>
                {errors.title && (
                  <span className="text-red-500">{errors.title}</span>
                )}
              </div>
              <div className={`${titleInfo.status === 'error' ? 'text-red-500' :
                titleInfo.status === 'warning' ? 'text-yellow-500' :
                  'text-gray-500'
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
              <SelectTrigger className={`${errors.categoryId ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-green-700 focus:ring-green-700'}`}>
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
            {errors.categoryId && (
              <span className="text-red-500 text-sm">{errors.categoryId}</span>
            )}
          </div>

          {/* Content Field with Preview */}
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
                <RichTextEditor
                  content={formData.content}
                  onChange={handleContentChange}
                  placeholder="Write your post content here..."
                  className={errors.content ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500' : ''}
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <PostPreview
                  title={formData.title}
                  content={formData.content}
                  categoryName={categories?.find(c => c._id === formData.categoryId)?.displayName}
                  categoryIcon={categories?.find(c => c._id === formData.categoryId)?.icon}
                />
              </TabsContent>
            </Tabs>
            <div className="flex justify-between items-center text-sm">
              <div>
                {errors.content && (
                  <span className="text-red-500">{errors.content}</span>
                )}
              </div>
              <div className={`${contentInfo.status === 'error' ? 'text-red-500' :
                contentInfo.status === 'warning' ? 'text-yellow-500' :
                  'text-gray-500'
                }`}>
                {contentInfo.length}/10,000 characters
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-4 border-t space-y-4 sm:space-y-0">
            <DraftsModal>
              <Button type="button" variant="ghost" disabled={isSubmitting} className="w-full sm:w-auto">
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
                disabled={!isValid || isSubmitting}
                className="bg-green-700 hover:bg-green-800 w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
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
    </Card>
  );
}

export default PostCreationForm; 