"use client";

import { useMemo } from "react";
import { MediaItem } from "@/types";
import { PDFPreview } from "@/components/posts/pdf-preview";
import { YouTubePreview } from "@/components/posts/youtube-preview";
import { VideoPreview } from "@/components/posts/video-preview";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AttachmentGridProps {
  attachments: Array<{
    id: string;
    type: "image" | "video" | "pdf" | "youtube";
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
    order: number;
    // PDF specific
    pageCount?: number;
    fileSize?: number;
    // YouTube specific
    videoId?: string;
    title?: string;
    duration?: string;
    channelName?: string;
    // Video specific
    videoDuration?: string;
    format?: string;
    resolution?: string;
    codec?: string;
  }>;
  className?: string;
}

function AttachmentItem({ attachment }: { attachment: AttachmentGridProps["attachments"][0] }) {
  const renderPreview = () => {
    // Convert attachment to MediaItem format for preview components
    const mediaItem: MediaItem = {
      ...attachment,
      isUploading: false,
      uploadProgress: 0,
    };

    switch (attachment.type) {
      case "image":
        return (
          <Image
            src={attachment.url}
            alt="Attachment"
            fill
            className="object-cover"
            unoptimized
          />
        );
      case "video":
        return <VideoPreview media={mediaItem} />;
      case "pdf":
        return <PDFPreview media={mediaItem} />;
      case "youtube":
        return <YouTubePreview media={mediaItem} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "relative group rounded-lg overflow-hidden border bg-card",
        "transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
      )}
    >
      <div className="aspect-square relative">
        {renderPreview()}
        
        {/* Hover overlay with view action */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-primary-foreground text-sm font-medium">View</span>
          </div>
        </div>
      </div>

      {/* Type Badge */}
      <div className="absolute bottom-1 left-1">
        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
          {attachment.type.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}

export function AttachmentGrid({ attachments, className }: AttachmentGridProps) {
  const sortedAttachments = useMemo(
    () => [...attachments].sort((a, b) => a.order - b.order),
    [attachments]
  );

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-medium text-muted-foreground">
        Additional Media ({attachments.length})
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {sortedAttachments.map((attachment) => (
          <AttachmentItem key={attachment.id} attachment={attachment} />
        ))}
      </div>
    </div>
  );
}