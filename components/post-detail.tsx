import Link from "next/link";
import Image from "next/image";
import {
  Flag,
  MoreHorizontal,
  Play,
  ExternalLink,
  Edit,
  Trash2,
  History,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageSquareIcon } from "@/components/ui/message-square";
import { UploadIcon } from "@/components/ui/upload";
import { Card, CardContent } from "@/components/ui/card";
import { VoteButton } from "@/components/ui/vote-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Id } from "@/convex/_generated/dataModel";
import { useRef, useState } from "react";
import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getMediaPlaceholder } from "@/lib/post-preview-utils";
import { RenderTipTapContent } from "@/lib/render-post-content";
import { memberProfileUrl } from "@/lib/utils";
import { useMutationError } from "@/hooks/use-mutation-error";
import { BookmarkButton } from "@/components/bookmark-button";
import { isYouTubeUrl, getYouTubeVideoId } from "@/lib/youtube-utils";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { PollDisplay } from "@/components/poll-display";
import { AttachmentGrid } from "@/components/attachment-grid";
import { toast } from "sonner";
import { Paywall } from "@/components/paywall";
import { MemberHoverCardWrapper } from "@/components/member-hover-card";

interface Post {
  _id: Id<"posts">;
  title: string;
  content: string;
  slug: string;
  createdAt: number;
  editedAt?: number;
  netVotes: number;
  commentCount: number;
  type?: "text" | "image" | "video" | "link" | "poll";
  mediaUrl?: string;
  thumbnailUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  linkPreviews?: Record<
    string,
    {
      title?: string;
      description?: string;
      image?: string;
      siteName?: string;
      url: string;
    }
  >;
  pollOptions?: Array<{
    id: string;
    text: string;
    voteCount: number;
  }>;
  pollEndsAt?: number;
  totalPollVotes?: number;
  isPaywalled?: boolean;
  fullContentRequiresTier?: string;
  member?: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    username: string;
    slug?: string;
  } | null;
  category?: {
    name: string;
  } | null;
  attachments?: Array<{
    id: string;
    type: "image" | "video" | "pdf" | "youtube";
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
    order: number;
    pageCount?: number;
    fileSize?: number;
    videoId?: string;
    title?: string;
    duration?: string;
    channelName?: string;
    videoDuration?: string;
    format?: string;
    resolution?: string;
    codec?: string;
  }>;
}

interface PostDetailProps {
  post: Post;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
}

/**
 * Computes a human-readable time-ago string from a timestamp
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string (e.g., "5m", "2h", "3d")
 */
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

/**
 * PostDetail component displays a full post with voting, media content, and actions
 *
 * Features:
 * - Voting system with optimistic updates
 * - Media display (images, videos, YouTube embeds)
 * - Link previews with metadata
 * - Poll display and interaction
 * - Rich text content rendering
 * - Post actions (share, bookmark, report, edit/delete)
 * - Authentication-aware UI
 */
export default function PostDetail({
  post,
  onEdit,
  onDelete,
  onViewHistory,
}: PostDetailProps) {
  // Video playback state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Voting state management
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticNetVotes, setOptimisticNetVotes] = useState(post.netVotes);
  const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(
    null,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const postType = post.type || "text";

  // Extract YouTube video IDs safely from URLs
  const mediaYouTubeId =
    post.mediaUrl && isYouTubeUrl(post.mediaUrl)
      ? getYouTubeVideoId(post.mediaUrl)
      : null;
  const linkYouTubeId =
    post.linkUrl && isYouTubeUrl(post.linkUrl)
      ? getYouTubeVideoId(post.linkUrl)
      : null;

  // Animation refs for interactive icons
  const commentIconRef = React.useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const shareIconRef = React.useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);

  // Convex queries and mutations
  const currentMember = useQuery(api.members.getCurrentMember);
  const voteOnPost = useMutation(api.votes.voteOnPost);
  const userVote = useQuery(api.votes.getUserVote, {
    targetId: post._id,
    targetType: "post",
  });
  const { handleMutationError } = useMutationError();

  // Determine current vote state (optimistic or actual)
  const currentUserVote =
    optimisticUserVote !== null ? optimisticUserVote : userVote;

  // Check if current user owns this post
  const isMemberPost =
    currentMember && post.member && currentMember._id === post.member?._id;

  console.log("Debug member check:", {
    currentMember: currentMember
      ? { _id: currentMember._id, email: currentMember.email }
      : null,
    postMember: post.member
      ? { _id: post.member?._id, username: post.member?.username }
      : null,
    isMemberPost,
  });

  /**
   * Handles upvote/downvote actions with optimistic updates
   * Manages vote state transitions and error recovery
   */
  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVoting) return;
    setIsVoting(true);

    const voteType = currentUserVote === "upvote" ? "remove" : "upvote";

    // Calculate optimistic vote changes
    let newNetVotes = optimisticNetVotes;
    let newUserVote: string | null = null;

    if (voteType === "upvote") {
      newNetVotes = optimisticNetVotes + (currentUserVote === null ? 1 : 1);
      newUserVote = "upvote";
    } else {
      newNetVotes = optimisticNetVotes - 1;
      newUserVote = null;
    }

    // Apply optimistic updates
    setOptimisticNetVotes(newNetVotes);
    setOptimisticUserVote(newUserVote);

    try {
      const result = await voteOnPost({
        postId: post._id,
        voteType,
      });

      // Update with server response
      setOptimisticNetVotes(result.netVotes);
      setOptimisticUserVote(result.newVoteType);
    } catch (error) {
      // Revert optimistic changes on error
      setOptimisticNetVotes(post.netVotes);
      setOptimisticUserVote(userVote || null);
      handleMutationError(error, () => handleUpvote(e), {
        context: "voting on post",
      });
    } finally {
      setIsVoting(false);
    }
  };

  /**
   * Toggles video playback state
   */
  const handleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  /**
   * Copies post URL to clipboard and shows feedback
   */
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}/${post.category?.name || "general"}/${post.slug}`;

    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Post */}
      <div className="space-y-6">
        {/* Header with back button and category */}
        <div className="flex items-center py-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/30 mr-2 bg-muted/50"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Link
            href={`/${post.category?.name || "general"}`}
            className="text-primary hover:underline font-medium"
          >
            r/{post.category?.name || "general"}
          </Link>
          <span className="mx-2 text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">
            {getTimeAgo(post.createdAt)} ago
          </span>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Post metadata */}
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <span>posted by</span>
            <MemberHoverCardWrapper member={post.member ?? null}>
              <Link
                href={
                  post.member
                    ? memberProfileUrl({
                        slug: post.member!.slug!,
                        _id: post.member!._id,
                      })
                    : "#"
                }
                className="ml-1 text-primary hover:underline"
                data-testid="member-link"
              >
                /u/{post.member?.username || "unknown"}
              </Link>
            </MemberHoverCardWrapper>
          </div>

          <h1 className="text-2xl font-bold mb-6">{post.title}</h1>

          {/* Media Content Rendering */}
          {postType === "image" && post.mediaUrl && (
            <div className="mb-6 rounded-lg overflow-hidden">
              <Image
                src={post.mediaUrl}
                alt={post.title}
                width={800}
                height={600}
                className="w-full h-auto object-contain max-h-[600px]"
                placeholder="blur"
                blurDataURL={getMediaPlaceholder()}
              />
            </div>
          )}

          {postType === "video" && post.mediaUrl && (
            <>
              {mediaYouTubeId ? (
                <YouTubeEmbed videoId={mediaYouTubeId} title={post.title} />
              ) : isYouTubeUrl(post.mediaUrl) ? (
                <a
                  href={post.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-6 block text-primary underline"
                >
                  View on YouTube
                </a>
              ) : (
                <div className="mb-6 rounded-lg overflow-hidden relative bg-background">
                  <video
                    ref={videoRef}
                    src={post.mediaUrl}
                    className="w-full h-auto max-h-[600px]"
                    controls
                    poster={post.thumbnailUrl}
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                  />
                  {!isVideoPlaying && post.thumbnailUrl && (
                    <div
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={handleVideoPlay}
                    >
                      <div className="bg-background/80 rounded-full p-4 hover:bg-background/90 transition-colors">
                        <Play className="h-12 w-12 text-primary-foreground fill-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {postType === "link" && post.linkUrl && (
            <>
              {linkYouTubeId ? (
                <YouTubeEmbed
                  videoId={linkYouTubeId}
                  title={post.linkTitle || post.title}
                />
              ) : (
                <Card className="mb-6 overflow-hidden hover:shadow-md transition-shadow">
                  <a
                    href={post.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {post.linkImage && (
                      <div className="relative h-48 bg-muted">
                        <Image
                          src={post.linkImage}
                          alt={post.linkTitle || "Link preview"}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">
                        {post.linkTitle || post.linkUrl}
                      </h3>
                      {post.linkDescription && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                          {post.linkDescription}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        <span>{new URL(post.linkUrl).hostname}</span>
                      </div>
                    </CardContent>
                  </a>
                </Card>
              )}
            </>
          )}

          {postType === "poll" && post.pollOptions && (
            <div className="mb-6">
              <PollDisplay
                pollId={post._id}
                pollOptions={post.pollOptions}
                pollEndsAt={post.pollEndsAt}
                totalVotes={post.totalPollVotes}
                currentUserId={currentMember?._id}
              />
            </div>
          )}

          {/* Rich Text Content or Paywall */}
          <div className="mb-6" data-testid="post-content">
            {post.isPaywalled ? (
              <Paywall
                previewContent={post.content}
                tier={post.fullContentRequiresTier}
              />
            ) : (
              <RenderTipTapContent content={post.content} />
            )}
          </div>

          {/* Additional Attachments Grid */}
          {post.attachments && post.attachments.length > 1 && (
            <div className="mb-6">
              <AttachmentGrid attachments={post.attachments.slice(1)} />
            </div>
          )}

          {/* Post Actions Bar - Reddit style */}
          <div className="flex items-center space-x-3 text-sm text-muted-foreground pt-4 mt-6">
            {/* Upvote section */}
            <VoteButton
              targetId={post._id}
              targetType="post"
              voteCount={optimisticNetVotes}
              isVoted={currentUserVote === "upvote"}
              isVoting={isVoting}
              onVote={handleUpvote}
              size="sm"
              showHoverCard={true}
            />

            {/* Comments */}
            <Button
              variant="ghost"
              size="sm"
              className="group h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent/30 cursor-pointer"
              onMouseEnter={() => commentIconRef.current?.startAnimation()}
              onMouseLeave={() => commentIconRef.current?.stopAnimation()}
            >
              <MessageSquareIcon
                ref={commentIconRef}
                size={14}
                className="mr-1.5 group-hover:text-foreground transition-colors"
              />
              <span className="font-medium">{post.commentCount} Comments</span>
            </Button>

            {/* Bookmark/Save */}
            <BookmarkButton
              targetId={post._id}
              targetType="post"
              size="sm"
              className="h-auto px-2 py-1"
            />

            {/* Share */}
            <Button
              variant="ghost"
              size="sm"
              className="group h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent/30 cursor-pointer"
              onClick={handleShare}
              onMouseEnter={() => shareIconRef.current?.startAnimation()}
              onMouseLeave={() => shareIconRef.current?.stopAnimation()}
            >
              <UploadIcon
                ref={shareIconRef}
                size={14}
                className="mr-1.5 group-hover:text-foreground transition-colors"
              />
              Share
            </Button>

            {/* More options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="group h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent/30 cursor-pointer"
                  data-testid="post-more-menu"
                >
                  <MoreHorizontal className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewHistory}>
                  <History className="w-4 h-4 mr-2" />
                  View History
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </DropdownMenuItem>
                {isMemberPost && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Post
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
