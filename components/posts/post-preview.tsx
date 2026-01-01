"use client";

import { formatDistanceToNow } from "date-fns";
import { BarChart3, ChevronUp, ExternalLink, Eye, MessageSquare, Pin, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MemberHoverCardWrapper } from "@/components/members/member-hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { getInitials } from "@/lib/avatar-utils";
import {
  extractYouTubeVideoId,
  formatPostStats,
  getContentExcerpt,
  getMediaPlaceholder,
  getPostPreviewAsset,
  getPostTypeLabel,
  getPreviewClasses,
  hasMedia,
  isLinkPost,
  isPollPost,
  type PostData,
  type PreviewSize,
  shouldAutoplay,
} from "@/lib/post-preview-utils";
import { cn } from "@/lib/utils";

interface PostPreviewProps {
  post: PostData;
  size?: PreviewSize;
  showStats?: boolean;
  showCategory?: boolean;
  showMember?: boolean;
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
  isLoading,
}: PostPreviewProps) {
  // Support both new showMember and legacy showAuthor props
  const shouldShowMember = showMember || showAuthor;
  const [isHovering, setIsHovering] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const previewAsset = getPostPreviewAsset(post);
  const assetInfo = post.aspectRatio
    ? {
        width: post.mediaWidth,
        height: post.mediaHeight,
        naturalWidth: post.mediaWidth,
        naturalHeight: post.mediaHeight,
      }
    : undefined;
  const previewClasses = getPreviewClasses(size, assetInfo, post);

  const stats = formatPostStats(post);
  const excerpt = getContentExcerpt(post.content, size === "small" ? 80 : 140, post.preview);

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
        <CardContent className="p-3">
          <div className="animate-pulse space-y-2">
            <div className="bg-muted h-3 w-3/4 rounded-none opacity-50" />
            <div className="bg-muted h-16 rounded-none opacity-50" />
            <div className="flex space-x-3">
              <div className="bg-muted h-3 w-12 rounded-none opacity-50" />
              <div className="bg-muted h-3 w-12 rounded-none opacity-50" />
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

  const postUrl = `/post/${post.id}`;

  // For media-heavy posts, use expanded layout
  const hasLargeMedia =
    (hasMedia(post) || isLinkPost(post) || isPollPost(post)) &&
    (post.type === "video" ||
      (post.type === "link" &&
        post.linkUrl &&
        (post.linkUrl.includes("youtube.com") || post.linkUrl.includes("youtu.be"))) ||
      size !== "small");

  if (hasLargeMedia) {
    return (
      <div
        className={cn(
          "border-border/40 hover:bg-muted/30 group border-b py-3 transition-colors",
          className,
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleClick}
      >
        <div className="flex gap-3">
          {/* Vote score - left column */}
          {showStats && (
            <div className="flex w-12 flex-col items-center pt-1">
              <ChevronUp
                className={cn(
                  "h-4 w-4",
                  stats.score > 0 && "text-green-600",
                  stats.score < 0 && "text-red-600",
                )}
              />
              <span
                className={cn(
                  "font-mono text-xs font-medium leading-none",
                  stats.score > 0 && "text-green-600",
                  stats.score < 0 && "text-red-600",
                )}
              >
                {stats.votes}
              </span>
            </div>
          )}

          {/* Content - main column */}
          <div className="min-w-0 flex-1">
            {/* Category and type indicators */}
            <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
              {showCategory && post.category && (
                <span className="text-muted-foreground border-border border px-1 py-0.5">
                  {post.category.displayName}
                </span>
              )}
              {post.type !== "text" && (
                <span className="text-muted-foreground/60">{getPostTypeLabel(post)}</span>
              )}
              {post.isPinned && (
                <div className="flex items-center gap-1">
                  <Pin className="h-3 w-3 text-orange-600" />
                  <span className="font-medium text-orange-600">PINNED</span>
                </div>
              )}
            </div>

            {/* Title */}
            <Link href={postUrl} className="text-foreground block text-4xl transition-colors">
              <h3
                className={cn(
                  "line-clamp-2 text-[32px] leading-tight",
                  size === "small" ? "text-sm" : "text-base",
                )}
              >
                {post.title}
              </h3>
            </Link>

            {/* Content excerpt */}
            {excerpt && (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-[14px] leading-snug">
                {excerpt}
              </p>
            )}

            {/* Author and meta info */}
            <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
              {shouldShowMember && post.member && (
                <MemberHoverCardWrapper member={post.member}>
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={post.member.avatarUrl || ""} />
                      <AvatarFallback className="text-[8px]">
                        {getInitials(post.member.firstName || "", post.member.lastName || "")}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      href={`/members/${post.member?.slug || post.member?.username}`}
                      className="hover:text-foreground font-mono transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {post.member?.firstName} {post.member?.lastName}
                    </Link>
                  </div>
                </MemberHoverCardWrapper>
              )}
              <span className="font-mono">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {showStats && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <div className="flex items-center gap-3 font-mono">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{stats.comments}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{stats.views}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Full media preview for expanded layout */}
            <div
              className={cn(
                "bg-muted border-border relative mt-3 overflow-hidden border",
                previewClasses.wrapper,
                previewClasses.aspectRatio,
              )}
              style={previewClasses.dynamicStyle}
            >
              {post.type === "image" && previewAsset.url && (
                <Image
                  src={previewAsset.thumbnailUrl || previewAsset.url}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className={cn("h-full w-full", previewClasses.media)}
                  placeholder="blur"
                  blurDataURL={getMediaPlaceholder()}
                  priority
                />
              )}

              {post.type === "video" && previewAsset.url && (
                <div className="relative h-full w-full">
                  {previewAsset.thumbnailUrl && !isVideoPlaying && (
                    <Image
                      src={previewAsset.thumbnailUrl}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 800px"
                      className={cn("h-full w-full", previewClasses.media)}
                      placeholder="blur"
                      blurDataURL={getMediaPlaceholder()}
                      priority
                    />
                  )}
                  {!previewAsset.thumbnailUrl && !isVideoPlaying && (
                    <div className="bg-muted absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Play className="text-muted-foreground mx-auto mb-2 h-12 w-12" />
                        <p className="text-muted-foreground text-sm">Video</p>
                      </div>
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    src={previewAsset.url}
                    className={cn(
                      "absolute inset-0 h-full w-full",
                      previewClasses.media,
                      !isVideoPlaying && "opacity-0",
                    )}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                  />
                  {!isVideoPlaying && (
                    <div className="bg-background/10 group-hover:bg-background/20 absolute inset-0 flex items-center justify-center transition-colors">
                      <div className="bg-background/90 transform rounded-none p-4 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                        <Play className="text-foreground fill-foreground ml-0.5 h-8 w-8" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {post.type === "link" && (
                <div className="bg-muted flex h-full flex-col justify-between p-4">
                  {post.linkUrl &&
                  (post.linkUrl.includes("youtube.com") || post.linkUrl.includes("youtu.be")) ? (
                    <div className="w-full">
                      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${extractYouTubeVideoId(post.linkUrl)}`}
                          title={post.linkTitle || "YouTube video"}
                          className="absolute inset-0 h-full w-full rounded"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      {post.linkTitle && (
                        <h4 className="mt-2 line-clamp-2 text-sm font-medium">{post.linkTitle}</h4>
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
                          className="mb-2 h-24 w-full rounded-none object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="line-clamp-2 text-sm font-medium">
                          {previewAsset.title || post.linkUrl}
                        </h4>
                        {previewAsset.description && size !== "small" && (
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                            {previewAsset.description}
                          </p>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
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
                <div className="flex h-full flex-col justify-center p-4">
                  <div className="text-primary mb-2 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-sm font-medium">Poll</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">
                      {post.pollOptions.length} options
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {post.totalPollVotes || 0} votes
                    </p>
                    {post.pollEndsAt && (
                      <p className="text-muted-foreground text-xs">
                        {post.pollEndsAt < Date.now() ? "Ended" : "Active"}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact layout for text posts and small media
  return (
    <div
      className={cn("border-border/40 group border-b py-2 transition-colors", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Vote score - left column */}
        {showStats && (
          <div className="flex w-12 flex-col items-center pt-1">
            <ChevronUp
              className={cn(
                "h-4 w-4",
                stats.score > 0 && "text-green-600",
                stats.score < 0 && "text-red-600",
              )}
            />
            <span
              className={cn(
                "font-mono text-xs font-medium leading-none",
                stats.score > 0 && "text-green-600",
                stats.score < 0 && "text-red-600",
              )}
            >
              {stats.votes}
            </span>
          </div>
        )}

        {/* Content - main column */}
        <div className="min-w-0 flex-1">
          {/* Category and type indicators */}
          <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
            {showCategory && post.category && (
              <span className="text-muted-foreground border-border border px-1 py-0.5">
                {post.category.displayName}
              </span>
            )}
            {post.type !== "text" && (
              <span className="text-muted-foreground/60">{getPostTypeLabel(post)}</span>
            )}
            {post.isPinned && (
              <div className="flex items-center gap-1">
                <Pin className="h-3 w-3 text-orange-600" />
                <span className="font-medium text-orange-600">PINNED</span>
              </div>
            )}
          </div>

          {/* Title */}
          <Link
            href={postUrl}
            className="text-foreground hover:text-primary block transition-colors"
          >
            <h3
              className={cn(
                "line-clamp-2 font-medium leading-tight",
                size === "small" ? "text-sm" : "text-base",
              )}
            >
              {post.title}
            </h3>
          </Link>

          {/* Content excerpt */}
          {excerpt && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-snug">
              {excerpt}
            </p>
          )}

          {/* Author and meta info */}
          <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
            {shouldShowMember && post.member && (
              <MemberHoverCardWrapper member={post.member}>
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={post.member.avatarUrl || ""} />
                    <AvatarFallback className="text-[8px]">
                      {getInitials(post.member.firstName || "", post.member.lastName || "")}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    href={`/members/${post.member?.slug || post.member?.username}`}
                    className="hover:text-foreground font-mono transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.member?.firstName}
                  </Link>
                </div>
              </MemberHoverCardWrapper>
            )}
            <span className="font-mono">
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
              })}
            </span>
            {showStats && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-3 font-mono">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{stats.comments}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{stats.views}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Media thumbnail - right column for compact posts */}
        {(hasMedia(post) || isLinkPost(post) || isPollPost(post)) && (
          <div className="w-24 flex-shrink-0">
            <div
              className={cn(
                "bg-muted border-border relative h-16 w-24 overflow-hidden border",
                "hover:border-border/80 transition-colors",
              )}
            >
              {post.type === "image" && previewAsset.url && (
                <Image
                  src={previewAsset.thumbnailUrl || previewAsset.url}
                  alt={post.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={getMediaPlaceholder()}
                />
              )}

              {post.type === "video" && previewAsset.url && (
                <div className="relative h-full w-full">
                  {previewAsset.thumbnailUrl && (
                    <Image
                      src={previewAsset.thumbnailUrl}
                      alt={post.title}
                      fill
                      sizes="96px"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL={getMediaPlaceholder()}
                    />
                  )}
                  <div className="bg-background/80 absolute inset-0 flex items-center justify-center">
                    <Play className="text-foreground fill-foreground h-4 w-4" />
                  </div>
                </div>
              )}

              {post.type === "link" && (
                <div className="flex h-full flex-col justify-center p-2">
                  <ExternalLink className="text-muted-foreground mx-auto h-4 w-4" />
                  <span className="text-muted-foreground mt-1 text-center font-mono text-[8px] uppercase">
                    LINK
                  </span>
                </div>
              )}

              {post.type === "poll" && (
                <div className="flex h-full flex-col justify-center p-2">
                  <BarChart3 className="text-primary mx-auto h-4 w-4" />
                  <span className="text-muted-foreground mt-1 text-center font-mono text-[8px] uppercase">
                    POLL
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
