"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Paperclip, X, Loader2, FileText, FileIcon } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { getBrowserInfo } from "@/lib/browser-detection";
import {
  validateMediaFile,
  getFilePreviewUrl,
  revokeFilePreviewUrl,
  uploadMedia,
} from "@/lib/upload-media";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BugReportFormData {
  title: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  additionalContext?: string;
}

export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [browserInfo, setBrowserInfo] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const createBugReport = useAction(api.github.createBugReport);
  const convex = useConvex();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<BugReportFormData>({
    defaultValues: {
      severity: "Medium",
    },
  });

  const severity = watch("severity");

  useEffect(() => {
    if (isOpen) {
      const info = getBrowserInfo();
      setBrowserInfo(`${info.browser} ${info.version} on ${info.os}`);
    }
  }, [isOpen]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      if (files.length === 0) return;

      const maxAttachments = 5;
      let currentCount = attachments.length;

      // Accumulate new attachments first so we can batch update state once
      const validFiles: File[] = [];
      const previewUrls: string[] = [];

      for (const file of files) {
        if (currentCount >= maxAttachments) {
          toast.error("Maximum 5 attachments allowed per bug report");
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

  const onSubmit = async (data: BugReportFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Upload attachments to R2 first if any exist
      const attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        toast.info("Uploading attachments...");

        for (let i = 0; i < attachments.length; i++) {
          const file = attachments[i];
          const fileKey = `${file.name}-${i}`;

          try {
            const uploadResult = await uploadMedia(convex, file, {
              onProgress: (progress) => {
                // Show progress toast for the current file
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
            attachmentUrls.push(uploadResult.url);
          } catch (uploadError) {
            console.error("Failed to upload attachment:", uploadError);
            toast.error(
              `Failed to upload ${file.name}. Continuing without this attachment.`,
              { id: fileKey },
            );
          }
        }
      }

      const result = await createBugReport({
        title: data.title,
        stepsToReproduce: data.stepsToReproduce,
        expectedBehavior: data.expectedBehavior,
        actualBehavior: data.actualBehavior,
        severity: data.severity,
        browserInfo,
        additionalContext: data.additionalContext,
        attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
      });

      toast.success(
        <div>
          Bug report submitted successfully!{" "}
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
      setAttachments([]);
      attachmentPreviews.forEach((url) => revokeFilePreviewUrl(url));
      setAttachmentPreviews([]);
      onClose();
    } catch (error) {
      console.error("Failed to submit bug report:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to submit bug report. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
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
          <DialogTitle>Submit Bug Report</DialogTitle>
          <DialogDescription>
            Help us improve the platform by reporting bugs you encounter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of the bug"
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
            <Label htmlFor="stepsToReproduce">Steps to Reproduce *</Label>
            <Textarea
              id="stepsToReproduce"
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              className="min-h-[100px]"
              {...register("stepsToReproduce", {
                required: "Steps to reproduce are required",
                maxLength: {
                  value: 1000,
                  message: "Steps must be less than 1000 characters",
                },
              })}
            />
            {errors.stepsToReproduce && (
              <span className="text-sm text-red-600">
                {errors.stepsToReproduce.message}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedBehavior">Expected Behavior *</Label>
            <Textarea
              id="expectedBehavior"
              placeholder="What should have happened?"
              className="min-h-[80px]"
              {...register("expectedBehavior", {
                required: "Expected behavior is required",
                maxLength: {
                  value: 500,
                  message: "Expected behavior must be less than 500 characters",
                },
              })}
            />
            {errors.expectedBehavior && (
              <span className="text-sm text-red-600">
                {errors.expectedBehavior.message}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actualBehavior">Actual Behavior *</Label>
            <Textarea
              id="actualBehavior"
              placeholder="What actually happened?"
              className="min-h-[80px]"
              {...register("actualBehavior", {
                required: "Actual behavior is required",
                maxLength: {
                  value: 500,
                  message: "Actual behavior must be less than 500 characters",
                },
              })}
            />
            {errors.actualBehavior && (
              <span className="text-sm text-red-600">
                {errors.actualBehavior.message}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select
              value={severity}
              onValueChange={(value) =>
                setValue(
                  "severity",
                  value as "Low" | "Medium" | "High" | "Critical",
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Environment Information</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              <div>
                <strong>Browser:</strong> {browserInfo}
              </div>
              <div>
                <strong>Platform:</strong> VAI-VEX
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Screenshots/Recordings (Optional)</Label>
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= 5}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Add Files ({attachments.length}/5)
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
                          ) : file.type === "application/msword" ||
                            file.type ===
                              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? (
                            <FileText className="w-8 h-8 text-blue-600 mb-1" />
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

          <div className="space-y-2">
            <Label htmlFor="additionalContext">
              Additional Context (Optional)
            </Label>
            <Textarea
              id="additionalContext"
              placeholder="Any additional information that might be helpful..."
              className="min-h-[80px]"
              {...register("additionalContext", {
                maxLength: {
                  value: 500,
                  message:
                    "Additional context must be less than 500 characters",
                },
              })}
            />
            {errors.additionalContext && (
              <span className="text-sm text-red-600">
                {errors.additionalContext.message}
              </span>
            )}
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
                "Submit Bug Report"
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
