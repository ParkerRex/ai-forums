"use client";

import { SignInButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Link as LinkLucide } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LinkIcon } from "@/components/icons/link";
import { VoteButton } from "@/components/icons/vote-button";
import { MemberHoverCardWrapper } from "@/components/members/member-hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutationError } from "@/hooks/use-mutation-error";
import { useUserVotes } from "@/hooks/use-user-votes";
import { cn, memberProfileUrl } from "@/lib/utils";
import { MarkdownRenderer } from "../posts/markdown-renderer";
import CommentActionsMenu from "./comment-actions-menu";
import { GitHubCommentInput } from "./github-comment-input";

type AttachmentType = {
  id: string;
  type: "image" | "document" | "gif";
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
};

type LinkPreviewType = {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
};

interface CommentSectionFlatProps {
  postId: Id<"posts">;
  targetCommentId?: string;
}

type FlatComment = {
  _id: Id<"comments">;
  content: string;
  createdAt: number;
  upvotes: number;
  netVotes: number;
  member: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    slug: string;
  } | null;
  parentCommentId?: Id<"comments"> | null;
  replyToMember?: {
    _id: Id<"members">;
    username: string;
    slug: string;
  } | null;
  attachments?: Array<{
    id: string;
    type: "image" | "document" | "gif";
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    width?: number;
    height?: number;
  }>;
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
};

interface CommentItemFlatProps {
  comment: FlatComment;
  onReply: (commentId: Id<"comments">, replyToUsername: string) => void;
  isNewlyCreated?: boolean;
  postSlug: string;
  categoryName: string;
  isAdmin: boolean;
  targetCommentId?: string;
  userVote?: "upvote" | null;
}

function CommentItemFlat({
  comment,
  onReply,
  isNewlyCreated = false,
  postSlug,
  categoryName,
  isAdmin,
  targetCommentId,
  userVote,
}: CommentItemFlatProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticNetVotes, setOptimisticNetVotes] = useState(comment.netVotes);
  const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const isHighlighted = targetCommentId === comment._id;

  const voteOnComment = useMutation(api.votes.voteOnComment);
  const editComment = useMutation(api.comments.editComment);
  const { handleMutationError, handleMutationSuccess } = useMutationError();

  const currentUserVote = optimisticUserVote !== null ? optimisticUserVote : userVote;

  const handleUpvote = async () => {
    if (isVoting) return;
    setIsVoting(true);

    const voteType = currentUserVote === "upvote" ? "remove" : "upvote";
    let newNetVotes = optimisticNetVotes;
    let newUserVote: string | null = null;

    if (voteType === "upvote") {
      newNetVotes = optimisticNetVotes + (currentUserVote === null ? 1 : 1);
      newUserVote = "upvote";
    } else {
      newNetVotes = optimisticNetVotes - 1;
      newUserVote = null;
    }

    setOptimisticNetVotes(newNetVotes);
    setOptimisticUserVote(newUserVote);

    try {
      const result = await voteOnComment({
        commentId: comment._id,
        voteType,
      });
      setOptimisticNetVotes(result.netVotes);
      setOptimisticUserVote(result.newVoteType);
    } catch (error) {
      setOptimisticNetVotes(comment.netVotes);
      setOptimisticUserVote(userVote || null);
      handleMutationError(error, handleUpvote);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <motion.div
      id={`comment-${comment._id}`}
      initial={isNewlyCreated ? { opacity: 0, y: 20 } : false}
      animate={isNewlyCreated ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative",
        isHighlighted && "ring-primary ring-2 ring-offset-2",
        isNewlyCreated && "bg-accent/20",
      )}
    >
      <div className="flex gap-3 py-4">
        {/* Timeline line */}
        <div className="relative">
          {/* Avatar */}
          <Avatar className="relative z-10 h-10 w-10">
            <AvatarImage
              src={comment.member?.avatarUrl || ""}
              alt={comment.member?.firstName || "User"}
            />
            <AvatarFallback className="text-sm">
              {comment.member?.firstName?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Content */}
        <div className="bg-background min-w-0 flex-1 rounded-none border p-4">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 text-sm">
              <MemberHoverCardWrapper member={comment.member ?? null}>
                <Link
                  href={
                    comment.member
                      ? memberProfileUrl({
                          slug: comment.member.slug,
                          _id: comment.member._id,
                        })
                      : "#"
                  }
                  className="text-foreground font-semibold hover:underline"
                >
                  {comment.member
                    ? `${comment.member.firstName} ${comment.member.lastName}`
                    : "Unknown"}
                </Link>
              </MemberHoverCardWrapper>

              {comment.replyToMember && (
                <>
                  <span className="text-muted-foreground">replied to</span>
                  <Link
                    href={memberProfileUrl({
                      slug: comment.replyToMember.slug,
                      _id: comment.replyToMember._id,
                    })}
                    className="text-primary font-medium hover:underline"
                  >
                    @{comment.replyToMember.firstName} {comment.replyToMember.lastName}
                  </Link>
                </>
              )}

              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(comment.createdAt)} ago
              </span>
            </div>

            {comment.member && (
              <Authenticated>
                <CommentActionsMenu
                  commentId={comment._id}
                  authorId={comment.member._id}
                  postSlug={postSlug}
                  categoryName={categoryName}
                  onEditClick={() => setIsEditing(true)}
                  isAdmin={isAdmin}
                  commentCreatedAt={comment.createdAt}
                />
              </Authenticated>
            )}
          </div>

          {/* Comment content */}
          {isEditing ? (
            <div className="mt-2">
              <GitHubCommentInput
                placeholder="Edit your comment..."
                initialValue={comment.content}
                initialAttachments={comment.attachments}
                onSubmit={async (content, attachments) => {
                  try {
                    await editComment({
                      commentId: comment._id,
                      content: content.trim(),
                      attachments,
                    });
                    handleMutationSuccess("Comment updated successfully");
                    setIsEditing(false);
                  } catch (error) {
                    handleMutationError(error);
                  }
                }}
                isSubmitting={false}
                className="mb-2"
              />
            </div>
          ) : (
            <div className="mt-1">
              <MarkdownRenderer content={comment.content} className="text-sm" />
            </div>
          )}

          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {comment.attachments.map((attachment) => (
                <div key={attachment.id} className="bg-muted/30 rounded p-2">
                  {attachment.type === "image" || attachment.type === "gif" ? (
                    <div className="relative">
                      <Image
                        src={attachment.url}
                        alt={attachment.fileName}
                        width={400}
                        height={256}
                        className="h-auto max-h-64 max-w-full rounded"
                      />
                      {attachment.type === "gif" && (
                        <div className="text-foreground absolute left-2 top-2 rounded bg-black/50 px-2 py-1 text-xs">
                          GIF
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <LinkIcon size={16} />
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {attachment.fileName}
                      </a>
                      <span className="text-muted-foreground text-xs">
                        ({Math.round(attachment.fileSize / 1024)}KB)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Link previews */}
          {comment.linkPreviews &&
            Object.entries(comment.linkPreviews).map(([url, preview]) => (
              <div key={url} className="bg-muted/50 mt-3 rounded p-3">
                <div className="text-sm font-medium">{preview.title}</div>
                <div className="text-muted-foreground text-xs">{preview.description}</div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  {url}
                </a>
              </div>
            ))}

          {/* Actions - GitHub style */}
          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-4">
              <VoteButton
                targetId={comment._id}
                targetType="comment"
                voteCount={optimisticNetVotes}
                isVoted={currentUserVote === "upvote"}
                isVoting={isVoting}
                onVote={handleUpvote}
                size="sm"
                showHoverCard={false}
              />

              <Authenticated>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(comment._id, comment.member?.username || "someone")}
                  className="h-auto px-3 py-1 text-sm"
                >
                  Reply
                </Button>
              </Authenticated>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1"
              onClick={async () => {
                const commentUrl = `${window.location.origin}${window.location.pathname}?commentId=${comment._id}`;
                try {
                  await navigator.clipboard.writeText(commentUrl);
                  toast.success("Comment link copied!");
                } catch {
                  toast.error("Failed to copy link");
                }
              }}
              title="Copy link"
            >
              <LinkLucide className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CommentSectionFlat({ postId, targetCommentId }: CommentSectionFlatProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: Id<"comments">;
    username: string;
  } | null>(null);
  const [newlyCreatedCommentIds, setNewlyCreatedCommentIds] = useState<Set<string>>(new Set());

  const params = useParams();
  const comments = useQuery(api.comments.getCommentsByPostFlat, { postId });
  const createComment = useMutation(api.comments.createComment);
  const currentMember = useQuery(api.members.getCurrentMember);
  const { handleMutationError, handleMutationSuccess } = useMutationError();

  const isAdmin = currentMember?.role === "admin";
  const postSlug = (params.slug as string) || "";
  const categoryName = (params.category as string) || "";

  // Batch fetch user votes for all comments
  const commentIds = comments?.map((c) => c._id) || [];
  const { votes: userVotes } = useUserVotes(commentIds, "comment");

  useEffect(() => {
    if (!targetCommentId || !comments) return;

    const scrollToComment = () => {
      const element = document.getElementById(`comment-${targetCommentId}`);
      if (!element) return;

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-primary", "ring-offset-2");

      setTimeout(() => {
        element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
      }, 3000);
    };

    const timer = setTimeout(scrollToComment, 100);
    return () => clearTimeout(timer);
  }, [targetCommentId, comments]);

  const handleSubmitComment = async (
    content: string,
    attachments?: AttachmentType[],
    linkPreviews?: Record<string, LinkPreviewType>,
    mentions?: Id<"members">[],
  ) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    setIsSubmitting(true);

    try {
      const parentCommentId = replyingTo?.commentId || undefined;
      const newComment = await createComment({
        postId,
        content: content.trim(),
        parentCommentId,
        attachments,
        linkPreviews,
        mentions,
      });

      if (newComment) {
        setNewlyCreatedCommentIds((prev) => new Set(prev).add(newComment));

        setTimeout(() => {
          setNewlyCreatedCommentIds((prev) => {
            const next = new Set(prev);
            next.delete(newComment);
            return next;
          });
        }, 1000);
      }

      setReplyingTo(null);
      handleMutationSuccess("Comment posted successfully!");
    } catch (error) {
      handleMutationError(error, () =>
        handleSubmitComment(content, attachments, linkPreviews, mentions),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (commentId: Id<"comments">, username: string) => {
    setReplyingTo({ commentId, username });
  };

  return (
    <div className="mt-8">
      <div className="space-y-4">
        <Authenticated>
          <div className="mb-6">
            <GitHubCommentInput
              placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : undefined}
              onSubmit={handleSubmitComment}
              isSubmitting={isSubmitting}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </div>
        </Authenticated>

        <Unauthenticated>
          <div className="bg-muted/50 mb-6 rounded-none p-4 text-center">
            <p className="text-muted-foreground mb-4">
              Members-only discussion. Join VAI Community to participate.
            </p>
            <div className="space-y-2">
              <SignInButton mode="modal">
                <Button variant="outline" className="w-full sm:w-auto">
                  Sign In (Members Only)
                </Button>
              </SignInButton>
              <Button
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => (window.location.href = "/pricing")}
              >
                Become a Member
              </Button>
            </div>
          </div>
        </Unauthenticated>

        <div className="space-y-1">
          {comments === undefined ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="py-4">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-muted h-10 w-10 rounded-full"></div>
                      <div className="bg-muted h-4 w-24 rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-muted h-4 rounded"></div>
                      <div className="bg-muted h-4 w-3/4 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments?.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                No comments yet. Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* GitHub-style timeline line */}
              <div className="bg-border absolute bottom-0 left-5 top-0 w-px" />

              {comments?.map((comment: FlatComment, index) => (
                <div
                  key={comment._id}
                  className={cn("relative", index === comments.length - 1 && "pb-0")}
                >
                  <CommentItemFlat
                    comment={comment}
                    onReply={handleReply}
                    isNewlyCreated={newlyCreatedCommentIds.has(comment._id)}
                    postSlug={postSlug}
                    categoryName={categoryName}
                    isAdmin={isAdmin}
                    targetCommentId={targetCommentId}
                    userVote={userVotes[comment._id] || null}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
