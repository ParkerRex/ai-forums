"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, GripVertical, X } from "lucide-react";
import Image from "next/image";
import { PDFPreview } from "@/components/posts/pdf-preview";
import { VideoPreview } from "@/components/posts/video-preview";
import { YouTubePreview } from "@/components/posts/youtube-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/types";

interface MediaPreviewItemProps {
  media: MediaItem;
  onRemove: () => void;
  disabled?: boolean;
  isDragging?: boolean;
  isDragOverlay?: boolean;
}

export function MediaPreviewItem({
  media,
  onRemove,
  disabled = false,
  isDragging = false,
  isDragOverlay = false,
}: MediaPreviewItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: media.id, disabled: disabled || isDragOverlay });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderPreview = () => {
    switch (media.type) {
      case "image":
        return <Image src={media.url} alt="Preview" fill className="object-cover" unoptimized />;
      case "video":
        return <VideoPreview media={media} />;
      case "pdf":
        return <PDFPreview media={media} />;
      case "youtube":
        return <YouTubePreview media={media} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card group relative overflow-hidden rounded-none border",
        "transition-all duration-200",
        isSortableDragging || isDragging ? "opacity-50" : "",
        isDragOverlay ? "shadow-2xl" : "shadow-xs hover:shadow-md",
        media.error ? "border-red-500" : "",
      )}
    >
      <div className="relative aspect-square">
        {renderPreview()}

        {/* Upload Progress Overlay */}
        {media.isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-[80%] space-y-1">
              <Progress value={media.uploadProgress || 0} className="h-1" />
              <p className="text-primary-foreground text-center text-[10px]">
                {media.uploadProgress || 0}%
              </p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {media.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
            <div className="p-2 text-center">
              <AlertCircle className="mx-auto mb-1 h-4 w-4 text-red-500" />
              <p className="text-[10px] text-red-600">{media.error}</p>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        {!isDragOverlay && !media.isUploading && !media.error && (
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40">
            <div className="absolute left-1 right-1 top-1 flex items-start justify-between opacity-0 transition-opacity group-hover:opacity-100">
              {!disabled && (
                <button
                  type="button"
                  className="bg-background/90 cursor-grab rounded-sm p-1 active:cursor-grabbing"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-3 w-3" />
                </button>
              )}
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-6 w-6"
                onClick={onRemove}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Type Badge */}
      <div className="absolute bottom-1 left-1">
        <Badge variant="secondary" className="h-4 px-1 py-0 text-[10px]">
          {media.type.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}
