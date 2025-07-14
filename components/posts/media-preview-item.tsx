"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MediaItem } from "@/types";
import { PDFPreview } from "@/components/posts/pdf-preview";
import { YouTubePreview } from "@/components/posts/youtube-preview";
import { VideoPreview } from "@/components/posts/video-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, GripVertical, AlertCircle } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
        return (
          <Image
            src={media.url}
            alt="Preview"
            fill
            className="object-cover"
            unoptimized
          />
        );
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
        "relative group rounded-lg overflow-hidden border bg-card",
        "transition-all duration-200",
        isSortableDragging || isDragging ? "opacity-50" : "",
        isDragOverlay ? "shadow-2xl" : "shadow-sm hover:shadow-md",
        media.error ? "border-red-500" : ""
      )}
    >
      <div className="aspect-square relative">
        {renderPreview()}

        {/* Upload Progress Overlay */}
        {media.isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-full max-w-[80%] space-y-1">
              <Progress value={media.uploadProgress || 0} className="h-1" />
              <p className="text-[10px] text-primary-foreground text-center">
                {media.uploadProgress || 0}%
              </p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {media.error && (
          <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
            <div className="text-center p-2">
              <AlertCircle className="h-4 w-4 text-red-500 mx-auto mb-1" />
              <p className="text-[10px] text-red-600">{media.error}</p>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        {!isDragOverlay && !media.isUploading && !media.error && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
            <div className="absolute top-1 left-1 right-1 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
              {!disabled && (
                <button
                  type="button"
                  className="p-1 bg-background/90 rounded cursor-grab active:cursor-grabbing"
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
        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
          {media.type.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}