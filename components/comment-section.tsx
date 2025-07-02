"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { api } from "@/convex/_generated/api";
import { SortableCommentItem } from "./sortable-comment-item";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useMutationError } from "@/hooks/use-mutation-error";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, Paperclip, GripVertical } from "lucide-react";
import { ArrowBigUpIcon } from "@/components/ui/arrow-big-up";
import { MessageSquareIcon } from "@/components/ui/message-square";
import { MembershipCTAModal } from "@/components/membership-cta-modal";
import Link from "next/link";
import Image from "next/image";
import { memberProfileUrl } from "@/lib/utils";
import { EnhancedCommentInput } from "./enhanced-comment-input";
import { motion } from "framer-motion";
import { CommentActionsMenu } from "./comment-actions-menu";
import { useParams } from "next/navigation";

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

type CommentWithReplies = {
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
  depth: number;
  replies: CommentWithReplies[];
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
  editedAt?: number;
};

interface CommentItemProps {
  comment: CommentWithReplies;
  onReply: (parentId: Id<"comments"> | null) => void;
  replyingTo: Id<"comments"> | null;
  onSubmitReply: (
    parentId: Id<"comments">,
    content: string,
    attachments?: AttachmentType[],
    linkPreviews?: Record<string, LinkPreviewType>,
  ) => void;
  isSubmittingReply: boolean;
  isNewlyCreated?: boolean;
  newlyCreatedCommentIds?: Set<string>;
  postSlug: string;
  categoryName: string;
  isAdmin: boolean;
  dragHandleProps?: {
    [key: string]: unknown;
  };
  isDragging?: boolean;
}

function CommentItem({
  comment,
  onReply,
  replyingTo,
  onSubmitReply,
  isSubmittingReply,
  isNewlyCreated = false,
  newlyCreatedCommentIds,
  postSlug,
  categoryName,
  isAdmin,
  dragHandleProps,
}: CommentItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [optimisticNetVotes, setOptimisticNetVotes] = useState(
    comment.netVotes,
  );
  const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(
    null,
  );

  // Refs for animated icons
  const upvoteIconRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const replyIconRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);

  const hasReplies = comment.replies && comment.replies.length > 0;

  const voteOnComment = useMutation(api.votes.voteOnComment);
  const editComment = useMutation(api.comments.editComment);
  const userVote = useQuery(api.votes.getUserVote, {
    targetId: comment._id,
    targetType: "comment",
  });
  const { handleMutationError, handleMutationSuccess } = useMutationError();

  const currentUserVote =
    optimisticUserVote !== null ? optimisticUserVote : userVote;

  // Calculate indentation based on depth (max 3 levels)
  const indentLevel = Math.min(comment.depth, 3);
  const marginLeft = indentLevel * 24; // 24px per level

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
    <div className="space-y-3" style={{ marginLeft: `${marginLeft}px` }}>
      <motion.div
        id={`comment-${comment._id}`}
        className="border border-border rounded-lg p-4 bg-card transition-all duration-300"
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
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-muted text-muted-foreground">
              pr {comment.member?.firstName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {comment.member ? (
                  <Link
                    href={memberProfileUrl({
                      slug: comment.member.slug,
                      _id: comment.member._id,
                    })}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                    data-testid="member-link"
                  >
                    {comment.member.firstName} {comment.member.lastName}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">
                    Unknown User
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                  {comment.editedAt && " (edited)"}
                </span>
                {comment.depth > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Reply
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                {comment.depth > 0 && dragHandleProps && (
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing transition-opacity"
                    {...dragHandleProps}
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                {comment.member && (
                  <Authenticated>
                    <CommentActionsMenu
                      commentId={comment._id}
                      authorId={comment.member._id}
                      postSlug={postSlug}
                      categoryName={categoryName}
                      onEditClick={() => setIsEditing(true)}
                      isAdmin={isAdmin}
                    />
                  </Authenticated>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="mt-2">
                <EnhancedCommentInput
                  placeholder="Edit your comment..."
                  initialValue={comment.content}
                  onSubmit={async (content) => {
                    try {
                      await editComment({
                        commentId: comment._id,
                        content: content.trim(),
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
              <p className="text-foreground whitespace-pre-wrap">
                {comment.content}
              </p>
            )}

            {comment.attachments && comment.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {comment.attachments!.map((attachment) => (
                  <div key={attachment.id} className="border rounded p-2">
                    {attachment.type === "image" ||
                    attachment.type === "gif" ? (
                      <div className="relative">
                        <Image
                          src={attachment.url}
                          alt={attachment.fileName}
                          width={400}
                          height={256}
                          className="max-w-full h-auto max-h-64 rounded"
                        />
                        {attachment.type === "gif" && (
                          <div className="absolute top-2 left-2 bg-black/50 text-foreground text-xs px-2 py-1 rounded">
                            GIF
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
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

            {comment.linkPreviews &&
              Object.entries(comment.linkPreviews!).map(([url, preview]) => (
                <div key={url} className="mt-3 border rounded p-3 bg-muted/50">
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

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Authenticated>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReply(comment._id)}
                    className="text-muted-foreground hover:text-foreground"
                    onMouseEnter={() => replyIconRef.current?.startAnimation()}
                    onMouseLeave={() => replyIconRef.current?.stopAnimation()}
                  >
                    <MessageSquareIcon
                      ref={replyIconRef}
                      size={14}
                      className="mr-1"
                    />
                    Reply
                  </Button>
                </Authenticated>
                {hasReplies && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 mr-1" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-1" />
                    )}
                    {comment.replies.length}{" "}
                    {comment.replies.length === 1 ? "reply" : "replies"}
                  </Button>
                )}
              </div>

              {/* Voting moved to bottom right */}
              <div className="flex items-center space-x-2">
                <Authenticated>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto hover:bg-muted flex items-center space-x-1"
                    onClick={handleUpvote}
                    disabled={isVoting}
                    onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
                    onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
                  >
                    <ArrowBigUpIcon
                      ref={upvoteIconRef}
                      size={14}
                      className={`transition-colors ${
                        currentUserVote === "upvote"
                          ? "text-orange-500"
                          : "text-muted-foreground hover:text-orange-500"
                      }`}
                    />
                    <span className="text-xs font-medium text-foreground">
                      {optimisticNetVotes}
                    </span>
                  </Button>
                </Authenticated>
                <Unauthenticated>
                  <MembershipCTAModal
                    title="Upvote Great Comments"
                    description="Join VAI to upvote comments and help surface the best discussions in the community"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto hover:bg-muted flex items-center space-x-1"
                      onMouseEnter={() =>
                        upvoteIconRef.current?.startAnimation()
                      }
                      onMouseLeave={() =>
                        upvoteIconRef.current?.stopAnimation()
                      }
                    >
                      <ArrowBigUpIcon
                        ref={upvoteIconRef}
                        size={14}
                        className="text-muted-foreground hover:text-orange-500"
                      />
                      <span className="text-xs font-medium text-foreground">
                        {optimisticNetVotes}
                      </span>
                    </Button>
                  </MembershipCTAModal>
                </Unauthenticated>
              </div>
            </div>
          </div>
        </div>

        {/* Reply form */}
        {replyingTo === comment._id && (
          <div className="mt-4 ml-11 space-y-3">
            <EnhancedCommentInput
              placeholder={`Reply to ${comment.member?.firstName || "this comment"}...`}
              onSubmit={(content, attachments, linkPreviews) =>
                onSubmitReply(comment._id, content, attachments, linkPreviews)
              }
              isSubmitting={isSubmittingReply}
              className="mb-3"
            />
            <Button size="sm" variant="outline" onClick={() => onReply(null)}>
              Cancel
            </Button>
          </div>
        )}
      </motion.div>

      {/* Nested replies */}
      {hasReplies && isExpanded && (
        <ReplyDragContext 
          parentCommentId={comment._id}
          replies={comment.replies}
          onReply={onReply}
          replyingTo={replyingTo}
          onSubmitReply={onSubmitReply}
          isSubmittingReply={isSubmittingReply}
          newlyCreatedCommentIds={newlyCreatedCommentIds}
          postSlug={postSlug}
          categoryName={categoryName}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

interface ReplyDragContextProps {
  parentCommentId: Id<"comments">;
  replies: CommentWithReplies[];
  onReply: (parentId: Id<"comments"> | null) => void;
  replyingTo: Id<"comments"> | null;
  onSubmitReply: (
    parentId: Id<"comments">,
    content: string,
    attachments?: AttachmentType[],
    linkPreviews?: Record<string, LinkPreviewType>,
  ) => void;
  isSubmittingReply: boolean;
  newlyCreatedCommentIds?: Set<string>;
  postSlug: string;
  categoryName: string;
  isAdmin: boolean;
}

function ReplyDragContext({
  parentCommentId,
  replies,
  onReply,
  replyingTo,
  onSubmitReply,
  isSubmittingReply,
  newlyCreatedCommentIds,
  postSlug,
  categoryName,
  isAdmin,
}: ReplyDragContextProps) {
  const reorderReplies = useMutation(api.comments.reorderCommentReplies);
  const currentMember = useQuery(api.members.getCurrentMember);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const newIndex = replies.findIndex((reply) => reply._id === over?.id);

      try {
        await reorderReplies({
          parentCommentId,
          commentId: active.id as Id<"comments">,
          newOrder: newIndex,
        });
      } catch (error) {
        console.error("Failed to reorder replies:", error);
      }
    }
  };

  const canReorder = currentMember && (
    isAdmin || 
    replies.some(r => r.member?._id === currentMember._id)
  );

  if (!canReorder) {
    return (
      <div className="space-y-3">
        {replies.map((reply) => (
          <CommentItem
            key={reply._id}
            comment={reply}
            onReply={onReply}
            replyingTo={replyingTo}
            onSubmitReply={onSubmitReply}
            isSubmittingReply={isSubmittingReply}
            isNewlyCreated={newlyCreatedCommentIds?.has(reply._id) || false}
            newlyCreatedCommentIds={newlyCreatedCommentIds}
            postSlug={postSlug}
            categoryName={categoryName}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={replies.map(r => r._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {replies.map((reply) => (
            <SortableCommentItem
              key={reply._id}
              comment={reply}
              disabled={!canReorder}
            >
              <CommentItem
                comment={reply}
                onReply={onReply}
                replyingTo={replyingTo}
                onSubmitReply={onSubmitReply}
                isSubmittingReply={isSubmittingReply}
                isNewlyCreated={newlyCreatedCommentIds?.has(reply._id) || false}
                newlyCreatedCommentIds={newlyCreatedCommentIds}
                postSlug={postSlug}
                categoryName={categoryName}
                isAdmin={isAdmin}
              />
            </SortableCommentItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default function CommentSection({
  postId,
  targetCommentId,
}: CommentSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Id<"comments"> | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [newlyCreatedCommentIds, setNewlyCreatedCommentIds] = useState<
    Set<string>
  >(new Set());

  const params = useParams();

  const comments = useQuery(api.comments.getCommentsByPost, { postId });
  const createComment = useMutation(api.comments.createComment);
  const currentMember = useQuery(api.members.getCurrentMember);
  const { handleMutationError, handleMutationSuccess } = useMutationError();

  // Check if current user is admin
  const isAdmin = currentMember?.role === "admin";

  // Get post slug and category name from the post query or params
  const postSlug = (params.slug as string) || "";
  const categoryName = (params.category as string) || "";

  useEffect(() => {
    if (!targetCommentId || !comments) return;

    // allow React to paint comment elements first
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`comment-${targetCommentId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "ring-offset-2");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
        }, 3000);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [targetCommentId, comments]);

  const handleSubmitComment = async (
    content: string,
    attachments?: AttachmentType[],
    linkPreviews?: Record<string, LinkPreviewType>,
  ) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    setIsSubmitting(true);

    try {
      const newComment = await createComment({
        postId,
        content: content.trim(),
        attachments,
        linkPreviews,
      });

      if (newComment) {
        setNewlyCreatedCommentIds((prev) => new Set(prev).add(newComment));

        // Remove the highlight after animation completes
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
        handleSubmitComment(content, attachments, linkPreviews),
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
      });

      if (newReply) {
        setNewlyCreatedCommentIds((prev) => new Set(prev).add(newReply));

        // Remove the highlight after animation completes
        setTimeout(() => {
          setNewlyCreatedCommentIds((prev) => {
            const next = new Set(prev);
            next.delete(newReply);
            return next;
          });
        }, 1000);
      }

      setReplyingTo(null);
      handleMutationSuccess("Reply posted successfully!");
    } catch (error) {
      handleMutationError(error, () =>
        handleSubmitReply(parentId, content, attachments, linkPreviews),
      );
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReply = (parentId: Id<"comments"> | null) => {
    setReplyingTo(parentId);
  };

  // Count total comments including replies
  const countTotalComments = (comments: CommentWithReplies[]): number => {
    return comments.reduce((total, comment) => {
      return total + 1 + countTotalComments(comment.replies || []);
    }, 0);
  };

  const totalComments = comments ? countTotalComments(comments) : 0;

  return (
    <div className="mt-8">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
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
          <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg text-center">
            <p className="text-muted-foreground mb-4">
              Join the conversation! Sign in to post comments.
            </p>
            <SignInButton mode="modal">
              <Button variant="outline">Sign In to Comment</Button>
            </SignInButton>
          </div>
        </Unauthenticated>

        <div className="space-y-4">
          {comments === undefined ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-border rounded-lg p-4">
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
            <div className="space-y-4">
              {comments?.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  onReply={handleReply}
                  replyingTo={replyingTo}
                  onSubmitReply={handleSubmitReply}
                  isSubmittingReply={isSubmittingReply}
                  isNewlyCreated={newlyCreatedCommentIds.has(comment._id)}
                  newlyCreatedCommentIds={newlyCreatedCommentIds}
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
