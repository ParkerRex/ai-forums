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
import { api } from "@/web/convex/_generated/api";
import { SortableCommentItem } from "./sortable-comment-item";
import { Id } from "@/web/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/web/components/ui/avatar";
import { Button } from "@/web/components/ui/button";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useMutationError } from "@/hooks/use-mutation-error";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { MessageSquareIcon } from "@/web/components/icons/message-square";
import { LinkIcon } from "@/web/components/icons/link";
import { VoteButton } from "@/web/components/icons/vote-button";
import {
  CommentThreadContainer,
  isLastChildComment,
} from "@/web/components/comments/comment-thread-line";
import Link from "next/link";
import Image from "next/image";
import { memberProfileUrl } from "@/lib/utils";
import { EnhancedCommentInput } from "./enhanced-comment-input";
import { motion } from "framer-motion";
import CommentActionsMenu from "./comment-actions-menu";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { UploadIcon } from "@/web/components/ui/upload";
import { MemberHoverCardWrapper } from "@/web/components/members/member-hover-card";
import { useUserVotes } from "@/hooks/use-user-votes";

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
    mentions?: Id<"members">[],
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
  isLastChild?: boolean;
  userVote?: "upvote" | null;
  userVotes?: Record<string, "upvote">;
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
  isLastChild = false,
  userVote,
  userVotes = {},
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
  const replyIconRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);

  const hasReplies = comment.replies && comment.replies.length > 0;

  const voteOnComment = useMutation(api.votes.voteOnComment);
  const editComment = useMutation(api.comments.editComment);
  const { handleMutationError, handleMutationSuccess } = useMutationError();

  const currentUserVote =
    optimisticUserVote !== null ? optimisticUserVote : userVote || null;

  // Threading is now handled by CommentThreadContainer

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
    <CommentThreadContainer
      depth={comment.depth}
      isLastChild={isLastChild}
      className="space-y-3"
    >
      <motion.div
        id={`comment-${comment._id}`}
        className="py-4 transition-all duration-300"
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
            <Avatar className="h-7 w-7 cursor-pointer">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {comment.member?.username?.[0]?.toUpperCase() ||
                  comment.member?.firstName?.[0]?.toUpperCase() ||
                  "U"}
              </AvatarFallback>
            </Avatar>
          </MemberHoverCardWrapper>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs">
                {comment.member ? (
                  <MemberHoverCardWrapper member={comment.member}>
                    <Link
                      href={memberProfileUrl({
                        slug: comment.member.slug,
                        _id: comment.member._id,
                      })}
                      className="text-foreground font-medium hover:underline"
                      data-testid="member-link"
                    >
                      {comment.member.username ||
                        `${comment.member.firstName} ${comment.member.lastName}`}
                    </Link>
                  </MemberHoverCardWrapper>
                ) : (
                  <span className="text-foreground font-medium">[deleted]</span>
                )}
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt))
                    .replace("about ", "")
                    .replace("less than a", "1")
                    .replace(" ago", "")}
                  {comment.editedAt && " (edited)"}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {comment.depth > 0 && dragHandleProps && (
                  <button
                    className="hover:bg-muted cursor-grab rounded p-1 opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
                    {...dragHandleProps}
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="text-muted-foreground h-3 w-3" />
                  </button>
                )}
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
              <p className="text-foreground whitespace-pre-wrap text-sm">
                {comment.content}
              </p>
            )}

            {comment.attachments && comment.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {comment.attachments!.map((attachment) => (
                  <div key={attachment.id} className="bg-muted/30 rounded p-2">
                    {attachment.type === "image" ||
                    attachment.type === "gif" ? (
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

            {comment.linkPreviews &&
              Object.entries(comment.linkPreviews!).map(([url, preview]) => (
                <div key={url} className="bg-muted/50 mt-3 rounded p-3">
                  <div className="text-sm font-medium">{preview.title}</div>
                  <div className="text-muted-foreground text-xs">
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

            {/* Comment Actions Bar - Reddit Style */}
            <div className="-ml-1 mt-1 flex items-center space-x-3">
              {/* Vote Button - First */}
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

              {/* Reply Button */}
              <Authenticated>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(comment._id)}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent/30 group h-auto cursor-pointer px-2 py-1 text-xs"
                  onMouseEnter={() => replyIconRef.current?.startAnimation()}
                  onMouseLeave={() => replyIconRef.current?.stopAnimation()}
                >
                  <MessageSquareIcon
                    ref={replyIconRef}
                    size={14}
                    className="group-hover:text-foreground mr-1.5 transition-colors"
                  />
                  Reply
                </Button>
              </Authenticated>

              {/* Share Button */}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent/30 group h-auto cursor-pointer px-2 py-1 text-xs"
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
                <UploadIcon
                  size={14}
                  className="group-hover:text-foreground mr-1.5 transition-colors"
                />
                Share
              </Button>

              {/* Show replies button if has replies */}
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent/30 group h-auto cursor-pointer px-2 py-1 text-xs"
                >
                  {isExpanded ? (
                    <ChevronDown className="group-hover:text-foreground mr-1 h-3.5 w-3.5 transition-colors" />
                  ) : (
                    <ChevronRight className="group-hover:text-foreground mr-1 h-3.5 w-3.5 transition-colors" />
                  )}
                  {comment.replies.length}{" "}
                  {comment.replies.length === 1 ? "reply" : "replies"}
                </Button>
              )}

              {/* More Options Menu */}
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

        {/* Reply form */}
        {replyingTo === comment._id && (
          <div className="ml-11 mt-4 space-y-3">
            <EnhancedCommentInput
              placeholder={`Reply to ${comment.member?.firstName || "this comment"}...`}
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
          userVotes={userVotes}
        />
      )}
    </CommentThreadContainer>
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
  userVotes: Record<string, "upvote">;
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
  userVotes,
}: ReplyDragContextProps) {
  const reorderReplies = useMutation(api.comments.reorderCommentReplies);
  const currentMember = useQuery(api.members.getCurrentMember);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
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

  const canReorder =
    currentMember &&
    (isAdmin || replies.some((r) => r.member?._id === currentMember._id));

  if (!canReorder) {
    return (
      <div className="space-y-3">
        {replies.map((reply, index) => (
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
            isLastChild={isLastChildComment(index, replies.length)}
            userVote={userVotes[reply._id] || null}
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
        items={replies.map((r) => r._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {replies.map((reply, index) => (
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
                isLastChild={isLastChildComment(index, replies.length)}
                userVote={userVotes[reply._id] || null}
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
  const { handleMutationError } = useMutationError();

  // Check if current user is admin
  const isAdmin = currentMember?.role === "admin";

  // Get post slug and category name from the post query or params
  const postSlug = (params.slug as string) || "";
  const categoryName = (params.category as string) || "";

  // Collect all comment IDs for batch vote fetching
  const collectCommentIds = (comments: CommentWithReplies[]): string[] => {
    const ids: string[] = [];
    const traverse = (commentList: CommentWithReplies[]) => {
      for (const comment of commentList) {
        ids.push(comment._id);
        if (comment.replies && comment.replies.length > 0) {
          traverse(comment.replies);
        }
      }
    };
    traverse(comments);
    return ids;
  };

  const allCommentIds = comments ? collectCommentIds(comments) : [];
  const { votes: userVotes } = useUserVotes(allCommentIds, "comment");

  useEffect(() => {
    if (!targetCommentId || !comments) return;

    const scrollToComment = () => {
      const element = document.getElementById(`comment-${targetCommentId}`);
      if (!element) return;

      const expandParentComments = () => {
        let currentElement = element;
        while (currentElement) {
          const parentComment = currentElement.closest(
            '[data-comment-collapsed="true"]',
          );
          if (parentComment) {
            const expandButton = parentComment.querySelector(
              "[data-expand-button]",
            );
            if (expandButton) {
              (expandButton as HTMLElement).click();
            }
          }
          currentElement = parentComment as HTMLElement;
        }
      };

      expandParentComments();

      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

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

  const deleteComment = useMutation(api.comments.deleteComment);

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

        // Remove the highlight after animation completes
        setTimeout(() => {
          setNewlyCreatedCommentIds((prev) => {
            const next = new Set(prev);
            next.delete(newComment);
            return next;
          });
        }, 1000);

        // Show success toast with undo button
        toast.success("New comment created", {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await deleteComment({ commentId: newComment });
                toast.success("Comment deleted");
              } catch (error) {
                console.error("Failed to delete comment:", error);
                toast.error("Failed to undo comment");
              }
            },
          },
          duration: 5000,
        });
      }
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

      // Show success toast with undo button
      toast.success("New comment created", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await deleteComment({ commentId: newReply });
              toast.success("Comment deleted");
            } catch (error) {
              console.error("Failed to delete comment:", error);
              toast.error("Failed to undo comment");
            }
          },
        },
        duration: 5000,
      });
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
      <div className="space-y-6">
        <h3 className="text-foreground text-lg font-semibold">
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

        <div className="space-y-4">
          {comments === undefined ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="py-4">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-muted h-8 w-8 rounded-full"></div>
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
            <div className="space-y-4">
              {comments?.map((comment: CommentWithReplies, index: number) => (
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
                  isLastChild={isLastChildComment(index, comments?.length || 0)}
                  userVote={userVotes[comment._id] || null}
                  userVotes={userVotes}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
