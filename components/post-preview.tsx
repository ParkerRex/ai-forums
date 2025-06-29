"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getPostPreviewAsset,
  getContentExcerpt,
  formatPostStats,
  getPreviewDimensions,
  hasMedia,
  isLinkPost,
  getPostTypeLabel,
  shouldAutoplay,
  getMediaPlaceholder,
  type PostData,
  type PreviewSize
} from "@/lib/post-preview-utils";
import { MessageSquare, Eye, ChevronUp, Play, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostPreviewProps {
  post: PostData;
  size?: PreviewSize;
  showStats?: boolean;
  showCategory?: boolean;
  showAuthor?: boolean;
  className?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

export default function PostPreview({
  post,
  size = "medium",
  showStats = true,
  showCategory = true,
  showAuthor = true,
  className,
  onClick,
  isLoading
}: PostPreviewProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const dimensions = getPreviewDimensions(size);
  const previewAsset = getPostPreviewAsset(post);
  const stats = formatPostStats(post);
  const excerpt = getContentExcerpt(post.content, size === "small" ? 80 : 150);

  // Handle video autoplay on hover
  useEffect(() => {
    if (videoRef.current && post.type === "video") {
      if (isHovering && shouldAutoplay(post)) {
        videoRef.current.play().catch(() => {
          // Autoplay failed, likely due to browser policy
          setIsVideoPlaying(false);
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovering, post]);

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted opacity-50 rounded w-3/4" />
            <div className="h-20 bg-muted opacity-50 rounded" />
            <div className="flex space-x-4">
              <div className="h-4 bg-muted opacity-50 rounded w-16" />
              <div className="h-4 bg-muted opacity-50 rounded w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const postUrl = `/post/${post._id}`;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all hover:shadow-md cursor-pointer",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <div className={cn("flex", size === "large" ? "flex-col" : "gap-4 p-4")}>
          {/* Media/Link Preview */}
          {(hasMedia(post) || isLinkPost(post)) && (
            <div className={cn(
              "relative overflow-hidden bg-muted",
              size === "large" ? "w-full" : dimensions.thumbnailSize,
              size !== "large" && "flex-shrink-0 rounded"
            )}>
              {post.type === "image" && previewAsset.url && (
                <Image
                  src={previewAsset.thumbnailUrl || previewAsset.url}
                  alt={post.title}
                  width={size === "large" ? 800 : 200}
                  height={size === "large" ? 400 : 150}
                  className="object-cover w-full h-full"
                  placeholder="blur"
                  blurDataURL={getMediaPlaceholder()}
                />
              )}

              {post.type === "video" && previewAsset.url && (
                <div className="relative w-full h-full">
                  {previewAsset.thumbnailUrl && !isVideoPlaying && (
                    <Image
                      src={previewAsset.thumbnailUrl}
                      alt={post.title}
                      width={size === "large" ? 800 : 200}
                      height={size === "large" ? 400 : 150}
                      className="object-cover w-full h-full"
                      placeholder="blur"
                      blurDataURL={getMediaPlaceholder()}
                    />
                  )}
                  <video
                    ref={videoRef}
                    src={previewAsset.url}
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover",
                      !isVideoPlaying && "opacity-0"
                    )}
                    muted
                    loop
                    playsInline
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                  />
                  {!isVideoPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-3">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {post.type === "link" && (
                <div className="p-4 bg-muted h-full flex flex-col justify-between">
                  {previewAsset.thumbnailUrl && size !== "small" && (
                    <Image
                      src={previewAsset.thumbnailUrl}
                      alt={previewAsset.title || ""}
                      width={200}
                      height={100}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {previewAsset.title || post.linkUrl}
                    </h4>
                    {previewAsset.description && size !== "small" && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {previewAsset.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">
                      {previewAsset.url && new URL(previewAsset.url).hostname}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className={cn(
            "flex-1 min-w-0",
            size === "large" && "p-4"
          )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                {showCategory && post.category && (
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {post.category.icon} {post.category.displayName}
                    </Badge>
                    {post.type !== "text" && (
                      <Badge variant="outline" className="text-xs">
                        {getPostTypeLabel(post)}
                      </Badge>
                    )}
                  </div>
                )}
                <Link href={postUrl} className="group">
                  <h3 className={cn(
                    "font-semibold line-clamp-2 group-hover:text-primary transition-colors",
                    size === "small" ? "text-sm" : "text-base"
                  )}>
                    {post.title}
                  </h3>
                </Link>
              </div>
              {showStats && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <ChevronUp className={cn(
                    "h-4 w-4",
                    stats.score > 0 && "text-green-600",
                    stats.score < 0 && "text-red-600"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    stats.score > 0 && "text-green-600",
                    stats.score < 0 && "text-red-600"
                  )}>
                    {stats.votes}
                  </span>
                </div>
              )}
            </div>

            {/* Author and excerpt */}
            {showAuthor && post.author && (
              <div className="text-xs text-muted-foreground mb-2">
                by{" "}
                <Link
                  href={`/members/${post.author.slug || post.author.username}`}
                  className="hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.author.firstName} {post.author.lastName}
                </Link>
                {" • "}
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
            )}

            {/* Content excerpt */}
            {(!hasMedia(post) || size !== "small") && excerpt && (
              <p className={cn(
                "text-muted-foreground line-clamp-2",
                size === "small" ? "text-xs" : "text-sm"
              )}>
                {excerpt}
              </p>
            )}

            {/* Stats footer */}
            {showStats && size !== "small" && (
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{stats.comments} comments</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{stats.views} views</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 