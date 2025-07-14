"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import {
  getPostPreviewAsset,
  getContentExcerpt,
  formatPostStats,
  getPreviewClasses,
  hasMedia,
  isLinkPost,
  isPollPost,
  getPostTypeLabel,
  shouldAutoplay,
  getMediaPlaceholder,
  extractYouTubeVideoId,
  type PostData,
  type PreviewSize
} from "@/lib/post-preview-utils";
import { MessageSquare, Eye, ChevronUp, Play, ExternalLink, BarChart3, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemberHoverCardWrapper } from "@/components/members/member-hover-card";

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
  const previewClasses = getPreviewClasses(size, assetInfo, post);

  const stats = formatPostStats(post);
  const excerpt = getContentExcerpt(post.content, size === "small" ? 120 : 200, post.preview);

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
    <div
      className={cn(
        "overflow-hidden transition-all duration-200 group",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleClick}
    >
      <div className="flex flex-col space-y-1">
          {/* Content */}
          <div className={cn(
            "flex-1 min-w-0",
            (hasMedia(post) || isLinkPost(post) || isPollPost(post)) && "mb-3"
          )}>
            {/* Header - Reddit style */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                {showCategory && post.category && (
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-foreground/70">
                      /{post.category.displayName}
                    </span>
                    {post.type !== "text" && (
                      <span className="text-xs text-foreground/70">•</span>
                    )}
                    {post.type !== "text" && (
                      <span className="text-xs text-foreground/70">
                        {getPostTypeLabel(post)}
                      </span>
                    )}
                  </div>
                )}
                {post.isPinned && (
                  <div className="flex items-center gap-1 mb-1">
                    <Pin className="h-3 w-3 text-orange-600" />
                    <span className="text-xs font-medium text-orange-600">
                      Community Highlights
                    </span>
                  </div>
                )}
                <Link href={postUrl} className="text-foreground dark:text-foreground group-hover:text-black dark:group-hover:text-white transition-colors duration-200 ease-out">
                  <h3 className={cn(
                    "font-medium line-clamp-2",
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

            {/* Author and excerpt - Reddit style */}
            {shouldShowMember && post.member && (
              <div className="text-xs text-foreground/70 mb-1">
                by{" "}
                <MemberHoverCardWrapper member={post.member}>
                  <Link
                    href={`/members/${post.member?.slug || post.member?.username}`}
                    className="font-medium hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.member?.firstName} {post.member?.lastName}
                  </Link>
                </MemberHoverCardWrapper>
                {" • "}
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
            )}

            {/* Content excerpt - Reddit style */}
            {excerpt && (
              <p className={cn(
                "text-foreground line-clamp-3 leading-relaxed",
                size === "small" ? "text-xs" : "text-sm"
              )}>
                {excerpt}
              </p>
            )}

            {/* Stats footer */}
            {showStats && size !== "small" && (
              <div className="flex items-center gap-4 mt-3 text-xs text-foreground/60">
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

          {/* Media/Link/Poll Preview - Reddit style */}
          {(hasMedia(post) || isLinkPost(post) || isPollPost(post)) && (
            <div 
              className={cn(
                "relative overflow-hidden bg-muted rounded-md mt-2",
                previewClasses.wrapper,
                previewClasses.aspectRatio
              )}
              style={previewClasses.dynamicStyle}
            >
              {post.type === "image" && previewAsset.url && (
                <Image
                  src={previewAsset.thumbnailUrl || previewAsset.url}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className={cn("w-full h-full", previewClasses.media)}
                  placeholder="blur"
                  blurDataURL={getMediaPlaceholder()}
                  priority
                />
              )}

              {post.type === "video" && previewAsset.url && (
                <div className="relative w-full h-full">
                  {previewAsset.thumbnailUrl && !isVideoPlaying && (
                    <Image
                      src={previewAsset.thumbnailUrl}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 800px"
                      className={cn("w-full h-full", previewClasses.media)}
                      placeholder="blur"
                      blurDataURL={getMediaPlaceholder()}
                      priority
                    />
                  )}
                  {!previewAsset.thumbnailUrl && !isVideoPlaying && (
                    <div className="absolute inset-0 bg-muted flex items-center justify-center">
                      <div className="text-center">
                        <Play className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Video</p>
                      </div>
                    </div>
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
                    <div className="absolute inset-0 flex items-center justify-center bg-background/10 transition-colors group-hover:bg-background/20">
                      <div className="bg-background/90 backdrop-blur-sm rounded-full p-4 shadow-lg transform transition-transform group-hover:scale-110">
                        <Play className="h-8 w-8 text-foreground fill-foreground ml-0.5" />
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

              {post.type === "poll" && post.pollOptions && (
                <div className="p-4 h-full flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-sm font-medium">Poll</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {post.pollOptions.length} options
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {post.totalPollVotes || 0} votes
                    </p>
                    {post.pollEndsAt && (
                      <p className="text-xs text-muted-foreground">
                        {post.pollEndsAt < Date.now() ? 'Ended' : 'Active'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}                        