"use client";

import { Play, Youtube } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { formatYouTubeDuration } from "@/lib/youtube-utils";
import type { MediaItem } from "@/types";

interface YouTubePreviewProps {
  media: MediaItem;
}

export function YouTubePreview({ media }: YouTubePreviewProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative w-full h-full bg-background">
      {media.thumbnailUrl && !imageError ? (
        <Image
          src={media.thumbnailUrl}
          alt={media.title || "YouTube video"}
          fill
          className="object-cover"
          unoptimized
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-red-600">
          <Youtube className="h-12 w-12 text-primary-foreground" />
        </div>
      )}

      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/30 rounded-full p-4 backdrop-blur-xs">
          <Play className="h-8 w-8 text-primary-foreground fill-primary-foreground" />
        </div>
      </div>

      {/* Video Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="text-primary-foreground text-xs space-y-1">
          {media.title && <p className="font-medium line-clamp-1">{media.title}</p>}
          <div className="flex items-center justify-between text-primary-foreground/80">
            {media.channelName && <span>{media.channelName}</span>}
            {media.duration && <span>{formatYouTubeDuration(media.duration)}</span>}
          </div>
        </div>
      </div>

      {/* YouTube Badge */}
      <div className="absolute top-2 right-2">
        <div className="bg-red-600 text-primary-foreground px-2 py-1 rounded-sm text-xs font-medium flex items-center gap-1">
          <Youtube className="h-3 w-3" />
          YouTube
        </div>
      </div>
    </div>
  );
}
