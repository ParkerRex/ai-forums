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
  Pin,
  PinOff,
  MessageSquare,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VoteButton } from "@/components/ui/vote-button";
import { Badge } from "@/components/ui/badge";
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
import { PostEditInline } from "@/components/post-edit-inline";

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
    displayName?: string;
  } | null;
  isPinned?: boolean;
  pinScope?: "category" | "global" | "both";
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
  isEditing?: boolean;
  onCancelEdit?: () => void;
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
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days}d ago`;
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
  isEditing = false,
  onCancelEdit,
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


  // Convex queries and mutations
  const currentMember = useQuery(api.members.getCurrentMember);
  const voteOnPost = useMutation(api.votes.voteOnPost);
  const userVote = useQuery(api.votes.getUserVote, {
    targetId: post._id,
    targetType: "post",
  });
  const { handleMutationError } = useMutationError();

  // Highlight mutations for admins
  const highlightPost = useMutation(api.posts.pinPost);
  const unhighlightPost = useMutation(api.posts.unpinPost);

  // Determine current vote state (optimistic or actual)
  const currentUserVote =
    optimisticUserVote !== null ? optimisticUserVote : userVote;

  // Check if current user owns this post
  const isMemberPost =
    currentMember && post.member && currentMember._id === post.member?._id;

  // Check if current user is an admin
  const isAdmin = currentMember?.role === "admin";

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

  const handleHighlight = async (scope: "category" | "global" | "both") => {
    try {
      await highlightPost({ postId: post._id, scope });
      const scopeText =
        scope === "both"
          ? "in both category and globally"
          : scope === "global"
            ? "globally"
            : `in ${post.category?.displayName || "category"}`;
      toast.success(`Post highlighted ${scopeText}`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleUnhighlight = async () => {
    try {
      await unhighlightPost({ postId: post._id });
      toast.success("Post unhighlighted");
    } catch {
      toast.error("Failed to unhighlight post");
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full mr-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-sm text-muted-foreground">
            <Link href={`/${post.category?.name || "general"}`} className="font-medium text-foreground hover:underline">
              r/{post.category?.displayName || post.category?.name || "general"}
            </Link>
          </div>
        </div>

        <Card className="w-full overflow-hidden shadow-sm">
          <div className="flex">
            <div className="hidden sm:flex flex-col items-center p-2 bg-muted/50 dark:bg-muted/20">
              <VoteButton
                targetId={post._id}
                targetType="post"
                voteCount={optimisticNetVotes}
                isVoted={currentUserVote === "upvote"}
                isVoting={isVoting}
                onVote={handleUpvote}
                size="sm"
              />
            </div>

            <div className="p-4 sm:p-6 flex-grow min-w-0">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-grow">
                  <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-x-2">
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
                        className="font-semibold text-foreground hover:underline"
                        data-testid="member-link"
                      >
                        u/{post.member?.username || "unknown"}
                      </Link>
                    </MemberHoverCardWrapper>
                    <span className="text-gray-400 dark:text-gray-600">•</span>
                    <span>{getTimeAgo(post.createdAt)} ago</span>
                    {post.editedAt && <span className="italic">(edited)</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{post.title}</h1>
                    {isMemberPost && !isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onEdit}
                        className="ml-2"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" data-testid="post-more-menu">
                        <MoreHorizontal className="w-4 h-4" />
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
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        {post.isPinned ? (
                          <DropdownMenuItem onClick={handleUnhighlight}>
                            <PinOff className="w-4 h-4 mr-2" />
                            Remove Highlight
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleHighlight("category")}
                            >
                              <Pin className="w-4 h-4 mr-2" />
                              Highlight in Category
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleHighlight("global")}
                            >
                              <Pin className="w-4 h-4 mr-2" />
                              Highlight Globally
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleHighlight("both")}
                            >
                              <Pin className="w-4 h-4 mr-2" />
                              Highlight in Both
                            </DropdownMenuItem>
                          </>
                        )}
                      </>
                    )}
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
                )}
              </div>

              {post.isPinned && (
                <Badge variant="secondary" className="mt-3">
                  Pinned
                </Badge>
              )}

              {isEditing && onCancelEdit ? (
                <div className="mt-4">
                  <PostEditInline
                    post={post}
                    onCancel={onCancelEdit}
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-4">

                  {postType === "image" && post.mediaUrl && (
                  <div className="rounded-lg overflow-hidden border dark:border-gray-700">
                    <Image
                      src={post.mediaUrl}
                      alt={post.title}
                      width={800}
                      height={600}
                      className="w-full h-auto object-contain max-h-[70vh] bg-gray-100 dark:bg-gray-800"
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
                        className="block text-primary underline"
                      >
                        View on YouTube
                      </a>
                    ) : (
                      <div className="rounded-lg overflow-hidden relative bg-black">
                        <video
                          ref={videoRef}
                          src={post.mediaUrl}
                          className="w-full h-auto max-h-[70vh]"
                          controls
                          poster={post.thumbnailUrl}
                          onPlay={() => setIsVideoPlaying(true)}
                          onPause={() => setIsVideoPlaying(false)}
                        />
                        {!isVideoPlaying && (
                          <div
                            className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30"
                            onClick={handleVideoPlay}
                          >
                            <div className="bg-white/80 backdrop-blur-sm rounded-full p-3 hover:bg-white transition-colors">
                              <Play className="h-10 w-10 text-black fill-black" />
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
                      <a
                        href={post.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                      >
                        <Card className="shadow-none border-0 rounded-none">
                          {post.linkImage && (
                            <div className="relative h-40 sm:h-48 bg-muted">
                              <Image
                                src={post.linkImage}
                                alt={post.linkTitle || "Link preview"}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-base mb-1">
                              {post.linkTitle || post.linkUrl}
                            </h3>
                            {post.linkDescription && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {post.linkDescription}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                              <ExternalLink className="h-3 w-3" />
                              <span>{new URL(post.linkUrl).hostname}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </a>
                    )}
                  </>
                )}

                {postType === "poll" && post.pollOptions && (
                  <PollDisplay
                    pollId={post._id}
                    pollOptions={post.pollOptions}
                    pollEndsAt={post.pollEndsAt}
                    totalVotes={post.totalPollVotes}
                    currentUserId={currentMember?._id}
                  />
                )}

                {post.content && (
                  <div className="prose prose-gray dark:prose-invert max-w-none text-foreground" data-testid="post-content">
                    {post.isPaywalled ? (
                      <Paywall
                        previewContent={post.content}
                        tier={post.fullContentRequiresTier}
                      />
                    ) : (
                      <RenderTipTapContent content={post.content} />
                    )}
                  </div>
                )}

                  {post.attachments && post.attachments.length > 0 && (
                    <AttachmentGrid attachments={post.attachments} />
                  )}
                </div>
              )}

              {!isEditing && (
                <div className="mt-6 flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                <div className="sm:hidden">
                  <VoteButton
                    targetId={post._id}
                    targetType="post"
                    voteCount={optimisticNetVotes}
                    isVoted={currentUserVote === "upvote"}
                    isVoting={isVoting}
                    onVote={handleUpvote}
                    size="sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <MessageSquare size={18} />
                  <span className="font-medium">{post.commentCount} Comments</span>
                </Button>
                <BookmarkButton targetId={post._id} targetType="post" size="sm" className="h-auto px-2 py-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={handleShare}
                >
                  <Upload size={18} />
                  <span className="font-medium hidden sm:inline">Share</span>
                </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
