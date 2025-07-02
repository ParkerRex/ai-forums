"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getPostPreviewAsset,
  getContentExcerpt,
  formatPostStats,
  getPreviewClasses,
  hasMedia,
  isLinkPost,
  getPostTypeLabel,
  shouldAutoplay,
  getMediaPlaceholder,
  extractYouTubeVideoId,
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
  showMember?: boolean;
  // Legacy prop for backward compatibility - will be removed in Phase 6
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
  showMember = true,
  showAuthor, // Legacy prop for backward compatibility
  className,
  onClick,
  isLoading
}: PostPreviewProps) {
  // Support both new showMember and legacy showAuthor props
  const shouldShowMember = showMember || showAuthor;
  const [isHovering, setIsHovering] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const previewAsset = getPostPreviewAsset(post);
  const assetInfo = post.aspectRatio ? {
    width: post.mediaWidth,
    height: post.mediaHeight,
    naturalWidth: post.mediaWidth,
    naturalHeight: post.mediaHeight,
  } : undefined;
  const previewClasses = getPreviewClasses(size, assetInfo);
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
        <div className={cn("flex", size === "large" ? "flex-col" : "gap-3 p-3")}>
          {/* Media/Link Preview */}
          {(hasMedia(post) || isLinkPost(post)) && (
            <div className={cn(
              "relative overflow-hidden bg-muted",
              previewClasses.wrapper,
              previewClasses.aspectRatio,
              size !== "large" && "flex-shrink-0 rounded"
            )}>
              {post.type === "image" && previewAsset.url && (
                <Image
                  src={previewAsset.thumbnailUrl || previewAsset.url}
                  alt={post.title}
                  fill
                  sizes={size === "large" ? "100vw" : "(max-width: 768px) 100px, 200px"}
                  className={cn("w-full h-full", previewClasses.media)}
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
                      fill
                      sizes={size === "large" ? "100vw" : "(max-width: 768px) 100px, 200px"}
                      className={cn("w-full h-full", previewClasses.media)}
                      placeholder="blur"
                      blurDataURL={getMediaPlaceholder()}
                    />
                  )}
                  <video
                    ref={videoRef}
                    src={previewAsset.url}
                    className={cn(
                      "absolute inset-0 w-full h-full",
                      previewClasses.media,
                      !isVideoPlaying && "opacity-0"
                    )}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                  />
                  {!isVideoPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-3">
                        <Play className="h-6 w-6 text-primary-foreground fill-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {post.type === "link" && (
                <div className="p-4 bg-muted h-full flex flex-col justify-between">
                  {post.linkUrl && (post.linkUrl.includes('youtube.com') || post.linkUrl.includes('youtu.be')) ? (
                    <div className="w-full">
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${extractYouTubeVideoId(post.linkUrl)}`}
                          title={post.linkTitle || 'YouTube video'}
                          className="absolute inset-0 w-full h-full rounded"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      {post.linkTitle && (
                        <h4 className="font-medium text-sm mt-2 line-clamp-2">
                          {post.linkTitle}
                        </h4>
                      )}
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
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
            {shouldShowMember && post.member && (
              <div className="text-xs text-muted-foreground mb-2">
                by{" "}
                <Link
                  href={`/members/${post.member?.slug || post.member?.username}`}
                  className="hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.member?.firstName} {post.member?.lastName}
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