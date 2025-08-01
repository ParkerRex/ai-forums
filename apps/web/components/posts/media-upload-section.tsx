"use client";

import { useState, useCallback, useRef } from "react";
import { MediaItem } from "@/types";
import { MediaPreviewGrid } from "../components/posts/media-preview-grid";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Link, X, Plus } from "lucide-react";
import { MediaUploadIcon } from "../components/icons/media-upload";
import { toast } from "sonner";
import { validateMediaFile } from "@/lib/upload-media";
import { extractYouTubeId, getYouTubeThumbnail } from "@/lib/youtube-utils";

interface MediaUploadSectionProps {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  onUpload?: (file: File, mediaItem: MediaItem) => Promise<void>;
  maxItems?: number;
  disabled?: boolean;
}

export function MediaUploadSection({
  media,
  onMediaChange,
  onUpload,
  maxItems = 10,
  disabled = false,
}: MediaUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = maxItems - media.length;
      if (remainingSlots <= 0) {
        toast.error(`Maximum ${maxItems} media items allowed`);
        return;
      }

      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      const newMediaItems: MediaItem[] = [];

      for (const file of filesToProcess) {
        const validation = validateMediaFile(file);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        const mediaItem: MediaItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : file.type === "application/pdf"
                ? "pdf"
                : "image",
          url: URL.createObjectURL(file),
          order: media.length + newMediaItems.length,
          isUploading: true,
          uploadProgress: 0,
        };

        newMediaItems.push(mediaItem);

        // If onUpload is provided, start uploading immediately
        if (onUpload) {
          onUpload(file, mediaItem).catch((error) => {
            console.error("Upload failed:", error);
            const updatedMedia = [...media, ...newMediaItems].map((item) =>
              item.id === mediaItem.id
                ? { ...item, isUploading: false, error: "Upload failed" }
                : item,
            );
            onMediaChange(updatedMedia);
          });
        }
      }

      onMediaChange([...media, ...newMediaItems]);
    },
    [media, maxItems, onMediaChange, onUpload],
  );

  const handleYouTubeAdd = useCallback(() => {
    if (!youtubeUrl.trim()) return;

    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    if (media.length >= maxItems) {
      toast.error(`Maximum ${maxItems} media items allowed`);
      return;
    }

    // Check if this YouTube video is already added
    if (
      media.some((item) => item.type === "youtube" && item.videoId === videoId)
    ) {
      toast.error("This YouTube video is already added");
      return;
    }

    const mediaItem: MediaItem = {
      id: `youtube-${videoId}-${Date.now()}`,
      type: "youtube",
      url: youtubeUrl,
      videoId,
      thumbnailUrl: getYouTubeThumbnail(videoId),
      order: media.length,
    };

    onMediaChange([...media, mediaItem]);
    setYoutubeUrl("");
    toast.success("YouTube video added");
  }, [youtubeUrl, media, maxItems, onMediaChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleRemoveMedia = useCallback(
    (mediaId: string) => {
      const updatedMedia = media.filter((item) => item.id !== mediaId);
      // Reorder remaining items
      const reorderedMedia = updatedMedia.map((item, index) => ({
        ...item,
        order: index,
      }));
      onMediaChange(reorderedMedia);
    },
    [media, onMediaChange],
  );

  const handleReorderMedia = useCallback(
    (reorderedMedia: MediaItem[]) => {
      onMediaChange(reorderedMedia);
    },
    [onMediaChange],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>
          Media ({media.length}/{maxItems})
        </Label>
        {media.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onMediaChange([])}
            disabled={disabled}
          >
            <X className="mr-1 h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {media.length > 0 ? (
        <MediaPreviewGrid
          media={media}
          onReorder={handleReorderMedia}
          onRemove={handleRemoveMedia}
          disabled={disabled}
        />
      ) : (
        <div
          className={`rounded-none border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? "border-green-700 bg-green-50 dark:bg-green-950"
              : "border-border"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <MediaUploadIcon className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-muted-foreground mb-4 text-sm">
            Drag and drop files here, or click to browse
          </p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <MediaUploadIcon className="mr-2 h-4 w-4" />
              Choose Files
            </Button>
          </div>
          <p className="text-muted-foreground mt-4 text-xs">
            Supports: Images (JPG, PNG, GIF, WebP), Videos (MP4, WebM), PDFs
            <br />
            Max file size: Images 10MB, Videos 100MB, PDFs 20MB
          </p>
        </div>
      )}

      {media.length < maxItems && media.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-1"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add More Files
          </Button>
        </div>
      )}

      {/* YouTube URL Input */}
      {media.length < maxItems && (
        <div className="space-y-2">
          <Label htmlFor="youtube-url">Add YouTube Video</Label>
          <div className="flex gap-2">
            <Input
              id="youtube-url"
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleYouTubeAdd();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleYouTubeAdd}
              disabled={disabled || !youtubeUrl.trim()}
            >
              <Link className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
