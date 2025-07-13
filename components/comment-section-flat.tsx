"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useMutationError } from "@/hooks/use-mutation-error";
import { formatDistanceToNow } from "date-fns";
import { MessageSquareIcon } from "@/components/ui/message-square";
import { VoteButton } from "@/components/ui/vote-button";
import Link from "next/link";
import Image from "next/image";
import { memberProfileUrl } from "@/lib/utils";
import { EnhancedCommentInput } from "./enhanced-comment-input";
import { motion } from "framer-motion";
import CommentActionsMenu from "./comment-actions-menu";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { UploadIcon } from "@/components/ui/upload";
import { MemberHoverCardWrapper } from "@/components/member-hover-card";
import { LinkIcon } from "@/components/ui/link";

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

interface CommentSectionProps {
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
    avatarUrl?: string;
  } | null;
  replyToMember: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    slug: string;
  } | null;
  replyToCommentId?: Id<"comments">;
  attachments?: AttachmentType[];
  linkPreviews?: Record<string, LinkPreviewType>;
  editedAt?: number;
  replies: any[]; // Kept for compatibility but always empty
};

interface CommentItemProps {
  comment: FlatComment;
  onReply: (commentId: Id<"comments">, authorMemberId: Id<"members">) => void;
  replyingToCommentId: Id<"comments"> | null;
  onSubmitReply: (
    parentId: Id<"comments">,
    content: string,
    attachments?: AttachmentType[],
    linkPreviews?: Record<string, LinkPreviewType>,
    mentions?: Id<"members">[],
  ) => void;
  isSubmittingReply: boolean;
  isNewlyCreated?: boolean;
  postSlug: string;
  categoryName: string;
  isAdmin: boolean;
}

function CommentItem({
  comment,
  onReply,
  replyingToCommentId,
  onSubmitReply,
  isSubmittingReply,
  isNewlyCreated = false,
  postSlug,
  categoryName,
  isAdmin,
}: CommentItemProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [optimisticNetVotes, setOptimisticNetVotes] = useState(comment.netVotes);
  const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(null);

  const voteOnComment = useMutation(api.votes.voteOnComment);
  const editComment = useMutation(api.comments.editComment);
  const userVote = useQuery(api.votes.getUserVote, {
    targetId: comment._id,
    targetType: "comment",
  });
  const { handleMutationError, handleMutationSuccess } = useMutationError();

  const currentUserVote = optimisticUserVote !== null ? optimisticUserVote : userVote;

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      handleMutationError(error, () => handleUpvote(e), {
        context: "voting on comment",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const shouldReduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const highlightVariants = {
    initial: {
      backgroundColor: shouldReduceMotion
        ? "var(--comment-highlight)"
        : "var(--comment-highlight)",
    },
    animate: {
      backgroundColor: shouldReduceMotion
        ? "var(--comment-highlight)"
        : "transparent",
    },
    exit: { backgroundColor: "transparent" },
  };

  return (
    <motion.div
      id={`comment-${comment._id}`}
      className="py-4 border-b border-border/50 last:border-b-0"
      variants={highlightVariants}
      initial={isNewlyCreated ? "initial" : false}
      animate={isNewlyCreated ? "animate" : false}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 1, ease: "easeOut" }
      }
    >
      <div className="flex items-start space-x-3">
        <MemberHoverCardWrapper member={comment.member}>
          <Avatar className="w-8 h-8 cursor-pointer">
            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
              {comment.member?.username?.[0]?.toUpperCase() || comment.member?.firstName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </MemberHoverCardWrapper>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              {comment.member ? (
                <MemberHoverCardWrapper member={comment.member}>
                  <Link
                    href={memberProfileUrl({
                      slug: comment.member.slug,
                      _id: comment.member._id,
                    })}
                    className="font-medium text-foreground hover:underline"
                  >
                    {comment.member.username || `${comment.member.firstName} ${comment.member.lastName}`}
                  </Link>
                </MemberHoverCardWrapper>
              ) : (
                <span className="font-medium text-foreground">[deleted]</span>
              )}
              
              {/* Show reply indicator if this is a reply */}
              {comment.replyToMember && (
                <>
                  <span className="text-muted-foreground">replied to</span>
                  <MemberHoverCardWrapper member={comment.replyToMember}>
                    <Link
                      href={memberProfileUrl({
                        slug: comment.replyToMember.slug,
                        _id: comment.replyToMember._id,
                      })}
                      className="font-medium text-primary hover:underline"
                    >
                      @{comment.replyToMember.username || `${comment.replyToMember.firstName} ${comment.replyToMember.lastName}`}
                    </Link>
                  </MemberHoverCardWrapper>
                </>
              )}
              
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt))
                  .replace('about ', '')
                  .replace('less than a', '1')
                  .replace(' ago', '')}
                {comment.editedAt && " (edited)"}
              </span>
            </div>
          </div>
          
          {isEditing ? (
            <div className="mt-2">
              <EnhancedCommentInput
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {comment.content}
            </p>
          )}

          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {comment.attachments.map((attachment) => (
                <div key={attachment.id} className="rounded p-2 bg-muted/30">
                  {attachment.type === "image" || attachment.type === "gif" ? (
                    <div className="relative">
                      <Image
                        src={attachment.url}
                        alt={attachment.fileName}
                        width={400}
                        height={256}
                        className="max-w-full h-auto max-h-64 rounded"
                      />
                      {attachment.type === "gif" && (
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
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
                      <span className="text-xs text-muted-foreground">
                        ({Math.round(attachment.fileSize / 1024)}KB)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Link Previews */}
          {comment.linkPreviews &&
            Object.entries(comment.linkPreviews).map(([url, preview]) => (
              <div key={url} className="mt-3 rounded p-3 bg-muted/50">
                <div className="text-sm font-medium">{preview.title}</div>
                <div className="text-xs text-muted-foreground">
                  {preview.description}
                </div>
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

          {/* Comment Actions Bar */}
          <div className="flex items-center space-x-3 -ml-1 mt-2">
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
                onClick={() => comment.member && onReply(comment._id, comment.member._id)}
                className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <MessageSquareIcon size={14} className="mr-1.5" />
                Reply
              </Button>
            </Authenticated>

            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={async () => {
                const commentUrl = `${window.location.origin}${window.location.pathname}?commentId=${comment._id}`;
                try {
                  await navigator.clipboard.writeText(commentUrl);
                  toast.success("Comment link copied!");
                } catch {
                  toast.error("Failed to copy link");
                }
              }}
            >
              <UploadIcon size={14} className="mr-1.5" />
              Share
            </Button>

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
        </div>
      </div>

      {/* Reply form inline */}
      {replyingToCommentId === comment._id && (
        <div className="mt-4 ml-11 space-y-3">
          <EnhancedCommentInput
            placeholder={`Reply to @${comment.member?.username || comment.member?.firstName || "this comment"}...`}
            onSubmit={(content, attachments, linkPreviews, mentions) =>
              onSubmitReply(
                comment._id,
                content,
                attachments,
                linkPreviews,
                mentions,
              )
            }
            isSubmitting={isSubmittingReply}
            className="mb-3"
          />
          <Button size="sm" variant="outline" onClick={() => onReply("" as Id<"comments">, "" as Id<"members">)}>
            Cancel
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default function CommentSection({
  postId,
  targetCommentId,
}: CommentSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState<Id<"comments"> | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [newlyCreatedCommentIds, setNewlyCreatedCommentIds] = useState<Set<string>>(new Set());

  const params = useParams();

  const comments = useQuery(api.comments.getCommentsByPost, { postId });
  const createComment = useMutation(api.comments.createComment);
  const currentMember = useQuery(api.members.getCurrentMember);
  const { handleMutationError, handleMutationSuccess } = useMutationError();

  const isAdmin = currentMember?.role === "admin";
  const postSlug = (params.slug as string) || "";
  const categoryName = (params.category as string) || "";

  useEffect(() => {
    if (!targetCommentId || !comments) return;

    const scrollToComment = () => {
      const element = document.getElementById(`comment-${targetCommentId}`);
      if (!element) return;

      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      element.classList.add("comment-highlight");
      setTimeout(() => {
        element.classList.remove("comment-highlight");
      }, 3000);
    };

    const timeoutId = setTimeout(scrollToComment, 200);
    return () => clearTimeout(timeoutId);
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
      const newComment = await createComment({
        postId,
        content: content.trim(),
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

      handleMutationSuccess("Comment posted successfully!");
    } catch (error) {
      handleMutationError(error, () =>
        handleSubmitComment(content, attachments, linkPreviews, mentions),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (
    parentId: Id<"comments">,
    content: string,
    attachments?: AttachmentType[],
    linkPreviews?: Record<string, LinkPreviewType>,
    mentions?: Id<"members">[],
  ) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    setIsSubmittingReply(true);

    try {
      const newReply = await createComment({
        postId,
        content: content.trim(),
        parentCommentId: parentId,
        attachments,
        linkPreviews,
        mentions,
      });

      if (newReply) {
        setNewlyCreatedCommentIds((prev) => new Set(prev).add(newReply));

        setTimeout(() => {
          setNewlyCreatedCommentIds((prev) => {
            const next = new Set(prev);
            next.delete(newReply);
            return next;
          });
        }, 1000);
      }

      setReplyingToCommentId(null);
      handleMutationSuccess("Reply posted successfully!");
    } catch (error) {
      handleMutationError(error, () =>
        handleSubmitReply(
          parentId,
          content,
          attachments,
          linkPreviews,
          mentions,
        ),
      );
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReply = (commentId: Id<"comments">, authorMemberId: Id<"members">) => {
    if (commentId && authorMemberId) {
      setReplyingToCommentId(commentId);
    } else {
      setReplyingToCommentId(null);
    }
  };

  const totalComments = comments?.length || 0;

  return (
    <div className="mt-8">
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground">
          Comments ({totalComments})
        </h3>

        <Authenticated>
          <div className="mb-6">
            <EnhancedCommentInput
              placeholder="Share your thoughts..."
              onSubmit={handleSubmitComment}
              isSubmitting={isSubmitting}
            />
          </div>
        </Authenticated>

        <Unauthenticated>
          <div className="mb-6 p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-muted-foreground mb-4">
              Members-only discussion. Join VAI Community to participate.
            </p>
            <div className="space-y-2">
              <SignInButton mode="modal">
                <Button variant="outline" className="w-full sm:w-auto">Sign In (Members Only)</Button>
              </SignInButton>
              <Button 
                variant="ghost" 
                className="w-full sm:w-auto"
                onClick={() => window.location.href = '/pricing'}
              >
                Become a Member
              </Button>
            </div>
          </div>
        </Unauthenticated>

        <div className="space-y-0">
          {comments === undefined ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="py-4 border-b border-border/50 last:border-b-0">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-muted rounded-full"></div>
                      <div className="h-4 bg-muted rounded w-24"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No comments yet. Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {comments?.map((comment: FlatComment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  onReply={handleReply}
                  replyingToCommentId={replyingToCommentId}
                  onSubmitReply={handleSubmitReply}
                  isSubmittingReply={isSubmittingReply}
                  isNewlyCreated={newlyCreatedCommentIds.has(comment._id)}
                  postSlug={postSlug}
                  categoryName={categoryName}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}