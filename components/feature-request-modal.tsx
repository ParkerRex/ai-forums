"use client";

import React, { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { useAction } from "convex/react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, X, Loader2, FileText, FileIcon } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  validateMediaFile,
  getFilePreviewUrl,
  revokeFilePreviewUrl,
  uploadMedia,
} from "@/lib/upload-media";

interface FeatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeatureRequestFormData {
  title: string;
  description: string;
}

export function FeatureRequestModal({ isOpen, onClose }: FeatureRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const createFeatureRequest = useAction(api.github.createFeatureRequest);
  const convex = useConvex();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeatureRequestFormData>();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      if (files.length === 0) return;

      const maxAttachments = 5;
      let currentCount = attachments.length;

      const validFiles: File[] = [];
      const previewUrls: string[] = [];

      for (const file of files) {
        if (currentCount >= maxAttachments) {
          toast.error("Maximum 5 screenshots allowed per feature request");
          break;
        }

        const validation = validateMediaFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }

        validFiles.push(file);
        previewUrls.push(getFilePreviewUrl(file));
        currentCount += 1;
      }

      if (validFiles.length > 0) {
        setAttachments((prev) => [...prev, ...validFiles]);
        setAttachmentPreviews((prev) => [...prev, ...previewUrls]);
      }
    },
    [attachments],
  );

  const handleRemoveAttachment = useCallback(
    (index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
      const previewUrl = attachmentPreviews[index];
      if (previewUrl) {
        revokeFilePreviewUrl(previewUrl);
      }
      setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
    },
    [attachmentPreviews],
  );

  const onSubmit = async (data: FeatureRequestFormData) => {
    if (isSubmitting) return;

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload attachments to R2 first if any exist
      const screenshotUrls: string[] = [];
      if (attachments.length > 0) {
        toast.info("Uploading screenshots...");

        for (let i = 0; i < attachments.length; i++) {
          const file = attachments[i];
          const fileKey = `${file.name}-${i}`;

          try {
            const uploadResult = await uploadMedia(convex, file, {
              onProgress: (progress) => {
                if (progress.percentage < 100) {
                  toast.loading(
                    `Uploading ${file.name}: ${progress.percentage}%`,
                    {
                      id: fileKey,
                    },
                  );
                } else {
                  toast.success(`${file.name} uploaded successfully`, {
                    id: fileKey,
                  });
                }
              },
            });
            screenshotUrls.push(uploadResult.url);
          } catch (uploadError) {
            console.error("Failed to upload screenshot:", uploadError);
            toast.error(
              `Failed to upload ${file.name}. Continuing without this screenshot.`,
              { id: fileKey },
            );
          }
        }
      }

      const result = await createFeatureRequest({
        title: data.title,
        description,
        screenshotUrls: screenshotUrls.length > 0 ? screenshotUrls : undefined,
      });

      toast.success(
        <div>
          Feature request submitted successfully!{" "}
          <a
            href={result.issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View issue #{result.issueNumber}
          </a>
        </div>,
      );

      reset();
      setDescription("");
      setAttachments([]);
      attachmentPreviews.forEach((url) => revokeFilePreviewUrl(url));
      setAttachmentPreviews([]);
      onClose();
    } catch (error) {
      console.error("Failed to submit feature request:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to submit feature request. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setDescription("");
      setAttachments([]);
      attachmentPreviews.forEach((url) => revokeFilePreviewUrl(url));
      setAttachmentPreviews([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a Feature</DialogTitle>
          <DialogDescription>
            Share your ideas to help us improve the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of your feature idea"
              {...register("title", {
                required: "Title is required",
                maxLength: {
                  value: 100,
                  message: "Title must be less than 100 characters",
                },
              })}
            />
            {errors.title && (
              <span className="text-sm text-red-600">
                {errors.title.message}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Describe your feature request in detail..."
              className="min-h-[200px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Screenshots (Optional)</Label>
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= 5}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Add Screenshots ({attachments.length}/5)
              </Button>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={`file-${index}`} className="relative">
                      {file.type.startsWith("image/") ? (
                        <Image
                          src={attachmentPreviews[index]}
                          alt={file.name}
                          width={80}
                          height={80}
                          className="w-20 h-20 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded border flex flex-col items-center justify-center p-2">
                          {file.type === "application/pdf" ? (
                            <FileText className="w-8 h-8 text-muted-foreground mb-1" />
                          ) : (
                            <FileIcon className="w-8 h-8 text-muted-foreground mb-1" />
                          )}
                          <span
                            className="text-xs text-center truncate w-full"
                            title={file.name}
                          >
                            {file.name.length > 10
                              ? file.name.substring(0, 7) + "..."
                              : file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(0)}KB
                          </span>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0"
                        onClick={() => handleRemoveAttachment(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feature Request"
              )}
            </Button>
          </div>
        </form>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileSelect}
        />
      </DialogContent>
    </Dialog>
  );
}