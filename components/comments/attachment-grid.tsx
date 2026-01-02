"use client";

import Image from "next/image";
import { useMemo } from "react";
import { PDFPreview } from "@/components/posts/pdf-preview";
import { VideoPreview } from "@/components/posts/video-preview";
import { YouTubePreview } from "@/components/posts/youtube-preview";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/types";

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
          <Image src={attachment.url} alt="Attachment" fill className="object-cover" unoptimized />
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
        "bg-card group relative overflow-hidden rounded-none border",
        "cursor-pointer shadow-xs transition-all duration-200 hover:shadow-md",
      )}
    >
      <div className="relative aspect-square">
        {renderPreview()}

        {/* Hover overlay with view action */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
          <div className="opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-primary-foreground text-sm font-medium">View</span>
          </div>
        </div>
      </div>

      {/* Type Badge */}
      <div className="absolute bottom-1 left-1">
        <Badge variant="secondary" className="h-4 px-1 py-0 text-[10px]">
          {attachment.type.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}

export function AttachmentGrid({ attachments, className }: AttachmentGridProps) {
  const sortedAttachments = useMemo(
    () => [...attachments].sort((a, b) => a.order - b.order),
    [attachments],
  );

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-muted-foreground text-sm font-medium">
        Additional Media ({attachments.length})
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {sortedAttachments.map((attachment) => (
          <AttachmentItem key={attachment.id} attachment={attachment} />
        ))}
      </div>
    </div>
  );
}
