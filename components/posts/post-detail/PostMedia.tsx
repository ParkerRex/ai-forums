"use client";

import { ExternalLink, Play } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { YouTubeEmbed } from "@/components/posts/youtube-embed";
import { Card, CardContent } from "@/components/ui/card";
import { getMediaPlaceholder } from "@/lib/post-preview-utils";
import { getYouTubeVideoId, isYouTubeUrl } from "@/lib/youtube-utils";
import type { Post } from "./types";

interface PostMediaProps {
  post: Post;
}

export function PostMedia({ post }: PostMediaProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const postType = post.type || "text";

  // Extract YouTube video IDs safely from URLs
  const mediaYouTubeId =
    post.mediaUrl && isYouTubeUrl(post.mediaUrl) ? getYouTubeVideoId(post.mediaUrl) : null;
  const linkYouTubeId =
    post.linkUrl && isYouTubeUrl(post.linkUrl) ? getYouTubeVideoId(post.linkUrl) : null;

  const handleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  // Image post
  if (postType === "image" && post.mediaUrl) {
    return (
      <div className="overflow-hidden rounded-none border dark:border-gray-700">
        <Image
          src={post.mediaUrl}
          alt={post.title}
          width={800}
          height={600}
          className="h-auto max-h-[70vh] w-full bg-gray-100 object-contain dark:bg-black"
          placeholder="blur"
          blurDataURL={getMediaPlaceholder()}
        />
      </div>
    );
  }

  // Video post
  if (postType === "video" && post.mediaUrl) {
    if (mediaYouTubeId) {
      return <YouTubeEmbed videoId={mediaYouTubeId} title={post.title} />;
    }

    if (isYouTubeUrl(post.mediaUrl)) {
      return (
        <a
          href={post.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary block underline"
        >
          View on YouTube
        </a>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-none bg-black">
        <video
          ref={videoRef}
          src={post.mediaUrl}
          className="h-auto max-h-[70vh] w-full"
          controls
          poster={post.thumbnailUrl || undefined}
          onPlay={() => setIsVideoPlaying(true)}
          onPause={() => setIsVideoPlaying(false)}
        />
        {!isVideoPlaying && (
          <div
            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/30"
            onClick={handleVideoPlay}
          >
            <div className="rounded-full bg-white/80 p-3 backdrop-blur-sm transition-colors hover:bg-white">
              <Play className="h-10 w-10 fill-black text-black" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Link post
  if (postType === "link" && post.linkUrl) {
    if (linkYouTubeId) {
      return <YouTubeEmbed videoId={linkYouTubeId} title={post.linkTitle || post.title} />;
    }

    return (
      <a
        href={post.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:border-primary/50 block overflow-hidden rounded-none border transition-colors"
      >
        <Card className="rounded-none border-0 shadow-none">
          {post.linkImage && (
            <div className="bg-muted relative h-40 sm:h-48 dark:bg-black">
              <Image
                src={post.linkImage}
                alt={post.linkTitle || "Link preview"}
                fill
                className="object-cover"
              />
            </div>
          )}
          <CardContent className="p-4">
            <h3 className="mb-1 text-base font-semibold">
              {post.linkTitle || post.linkUrl}
            </h3>
            {post.linkDescription && (
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {post.linkDescription}
              </p>
            )}
            <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
              <ExternalLink className="h-3 w-3" />
              <span>{new URL(post.linkUrl).hostname}</span>
            </div>
          </CardContent>
        </Card>
      </a>
    );
  }

  return null;
}
