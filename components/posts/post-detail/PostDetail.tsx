"use client";

import { ArrowLeft, MessageSquare, Upload } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { AttachmentGrid } from "@/components/comments/attachment-grid";
import { VoteButton } from "@/components/icons/vote-button";
import { PollDisplay } from "@/components/posts/poll-display";
import { PostBookmarkButton } from "@/components/posts/post-bookmark-button";
import { PostEditInline } from "@/components/posts/post-edit-inline";
import { RenderTipTapContent } from "@/components/posts/render-post-content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentMember } from "@/hooks/use-current-member";
import { useMutationError } from "@/hooks/use-mutation-error";
import { useUserVote, useVoteOnPost } from "@/hooks/use-posts";
import { PostHeader } from "./PostHeader";
import { PostMedia } from "./PostMedia";
import type { PostDetailProps } from "./types";

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
  // Voting state management
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticNetVotes, setOptimisticNetVotes] = useState(post.netVotes);
  const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(null);

  const postType = post.type || "text";

  // React Query hooks
  const { member: currentMember } = useCurrentMember();
  const voteOnPostMutation = useVoteOnPost();
  const { data: userVoteData } = useUserVote(post.id);
  const userVote = userVoteData?.voteType;
  const { handleMutationError } = useMutationError();

  // Determine current vote state (optimistic or actual)
  const currentUserVote = optimisticUserVote !== null ? optimisticUserVote : userVote;

  // Check if current user owns this post
  const isMemberPost = Boolean(
    currentMember && post.member && currentMember.id === post.member?.id,
  );

  // Check if current user is an admin
  const isAdmin = currentMember?.role === "admin";

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
      const result = await voteOnPostMutation.mutateAsync({
        postId: post.id,
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
    <div className="bg-gray-50 py-8 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4">
        {/* Back button and category link */}
        <div className="mb-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 h-9 w-9 rounded-full"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-muted-foreground text-sm">
            <Link
              href={`/${post.category?.name || "general"}`}
              className="text-foreground font-medium hover:underline"
            >
              r/{post.category?.displayName || post.category?.name || "general"}
            </Link>
          </div>
        </div>

        <Card className="w-full overflow-hidden shadow-xs">
          <div className="flex">
            {/* Desktop vote column */}
            <div className="bg-muted/50 hidden flex-col items-center p-2 sm:flex dark:bg-black">
              <VoteButton
                targetId={post.id}
                targetType="post"
                voteCount={optimisticNetVotes}
                isVoted={currentUserVote === "upvote"}
                isVoting={isVoting}
                onVote={handleUpvote}
                size="sm"
              />
            </div>

            {/* Main content area */}
            <div className="min-w-0 flex-grow p-4 sm:p-6">
              <PostHeader
                post={post}
                isAdmin={isAdmin}
                isMemberPost={isMemberPost}
                isEditing={isEditing}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
              />

              {isEditing && onCancelEdit ? (
                <div className="mt-4">
                  <PostEditInline post={post} onCancel={onCancelEdit} />
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* Media content */}
                  <PostMedia post={post} />

                  {/* Poll display */}
                  {postType === "poll" && post.pollOptions && (
                    <PollDisplay
                      pollId={post.id}
                      pollOptions={post.pollOptions}
                      pollEndsAt={
                        post.pollEndsAt
                          ? typeof post.pollEndsAt === "string"
                            ? new Date(post.pollEndsAt).getTime()
                            : post.pollEndsAt
                          : undefined
                      }
                      totalVotes={post.totalPollVotes || undefined}
                      currentUserId={currentMember?.id}
                    />
                  )}

                  {/* Text content */}
                  {post.content && (
                    <div
                      className="prose prose-gray dark:prose-invert text-foreground max-w-none"
                      data-testid="post-content"
                    >
                      <RenderTipTapContent content={post.content} />
                    </div>
                  )}

                  {/* Attachments */}
                  {post.attachments && post.attachments.length > 0 && (
                    <AttachmentGrid attachments={post.attachments} />
                  )}
                </div>
              )}

              {/* Action bar */}
              {!isEditing && (
                <div className="text-muted-foreground mt-6 flex items-center gap-1 text-sm sm:gap-2">
                  {/* Mobile vote button */}
                  <div className="sm:hidden">
                    <VoteButton
                      targetId={post.id}
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
                    className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-1.5 rounded-md px-3 py-2"
                  >
                    <MessageSquare size={18} />
                    <span className="font-medium">{post.commentCount} Comments</span>
                  </Button>
                  <PostBookmarkButton
                    targetId={post.id}
                    targetType="post"
                    size="sm"
                    className="h-auto px-2 py-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-1.5 rounded-md px-3 py-2"
                    onClick={handleShare}
                  >
                    <Upload size={18} />
                    <span className="hidden font-medium sm:inline">Share</span>
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
