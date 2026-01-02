"use client";

import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Link as LinkLucide } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Authenticated, Unauthenticated } from "@/components/auth-wrappers";
import { LinkIcon } from "@/components/icons/link";
import { VoteButton } from "@/components/icons/vote-button";
import { MemberHoverCardWrapper } from "@/components/members/member-hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useComments,
  useCreateComment,
  useEditComment,
  useVoteOnComment,
} from "@/hooks/use-comments";
import { useCurrentMember } from "@/hooks/use-current-member";
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
  postId: string;
  targetCommentId?: string;
}

type FlatComment = {
  id: string;
  content: string;
  createdAt: number;
  upvotes: number;
  netVotes: number;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    slug: string;
    avatarUrl?: string;
  } | null;
  parentCommentId?: string | null;
  replyToMember?: {
    id: string;
    firstName: string;
    lastName: string;
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
  onReply: (commentId: string, replyToUsername: string) => void;
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

  const isHighlighted = targetCommentId === comment.id;

  const voteOnCommentMutation = useVoteOnComment();
  const editCommentMutation = useEditComment();
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
      await voteOnCommentMutation.mutateAsync({
        commentId: comment.id,
        voteType,
      });
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
      id={`comment-${comment.id}`}
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
                          id: comment.member.id,
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
                      id: comment.replyToMember.id,
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
                  commentId={comment.id}
                  authorId={comment.member.id}
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
                    await editCommentMutation.mutateAsync({
                      commentId: comment.id,
                      content: content.trim(),
                      attachments,
                    });
                    handleMutationSuccess("Comment updated successfully");
                    setIsEditing(false);
                  } catch (error) {
                    handleMutationError(error);
                  }
                }}
                isSubmitting={editCommentMutation.isPending}
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
                <div key={attachment.id} className="bg-muted/30 rounded-sm p-2">
                  {attachment.type === "image" || attachment.type === "gif" ? (
                    <div className="relative">
                      <Image
                        src={attachment.url}
                        alt={attachment.fileName}
                        width={400}
                        height={256}
                        className="h-auto max-h-64 max-w-full rounded-sm"
                      />
                      {attachment.type === "gif" && (
                        <div className="text-foreground absolute left-2 top-2 rounded-sm bg-black/50 px-2 py-1 text-xs">
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
              <div key={url} className="bg-muted/50 mt-3 rounded-sm p-3">
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
                targetId={comment.id}
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
                  onClick={() => onReply(comment.id, comment.member?.username || "someone")}
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
                const commentUrl = `${window.location.origin}${window.location.pathname}?commentId=${comment.id}`;
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
    commentId: string;
    username: string;
  } | null>(null);
  const [newlyCreatedCommentIds, setNewlyCreatedCommentIds] = useState<Set<string>>(new Set());

  const params = useParams();
  const router = useRouter();
  const { data: commentsData, isLoading: isLoadingComments } = useComments(postId, { flat: true });
  const createCommentMutation = useCreateComment(postId);
  const { member: currentMember } = useCurrentMember();
  const { handleMutationError, handleMutationSuccess } = useMutationError();

  // Transform the API response to the expected format
  const comments = commentsData?.items?.map((c: any) => ({
    id: c.id,
    content: c.content,
    createdAt: new Date(c.createdAt).getTime(),
    upvotes: c.upvotes || 0,
    netVotes: c.netVotes || 0,
    member: c.member
      ? {
          id: c.member.id,
          firstName: c.member.firstName,
          lastName: c.member.lastName,
          email: "",
          username: c.member.slug,
          slug: c.member.slug,
          avatarUrl: c.member.avatarUrl,
        }
      : null,
    parentCommentId: c.parentCommentId,
    replyToMember: c.replyToMember
      ? {
          id: c.replyToMember.id,
          firstName: c.replyToMember.firstName,
          lastName: c.replyToMember.lastName,
          username: c.replyToMember.slug,
          slug: c.replyToMember.slug,
        }
      : null,
    attachments: c.attachments,
    linkPreviews: c.linkPreviews,
  })) as FlatComment[] | undefined;

  const isAdmin = currentMember?.role === "admin";
  const postSlug = (params.slug as string) || "";
  const categoryName = (params.category as string) || "";

  // Batch fetch user votes for all comments
  const commentIds = comments?.map((c) => c.id) || [];
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
    mentions?: string[],
  ) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    setIsSubmitting(true);

    try {
      const parentCommentId = replyingTo?.commentId || undefined;
      const newComment = await createCommentMutation.mutateAsync({
        content: content.trim(),
        parentCommentId,
      });

      if (newComment) {
        const newId = (newComment as any).id || (newComment as any)._id;
        setNewlyCreatedCommentIds((prev) => new Set(prev).add(newId));

        setTimeout(() => {
          setNewlyCreatedCommentIds((prev) => {
            const next = new Set(prev);
            next.delete(newId);
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

  const handleReply = (commentId: string, username: string) => {
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
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push("/login")}
              >
                Sign In (Members Only)
              </Button>
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
          {isLoadingComments ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="py-4">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-muted h-10 w-10 rounded-full"></div>
                      <div className="bg-muted h-4 w-24 rounded-sm"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-muted h-4 rounded-sm"></div>
                      <div className="bg-muted h-4 w-3/4 rounded-sm"></div>
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
                  key={comment.id}
                  className={cn("relative", index === comments.length - 1 && "pb-0")}
                >
                  <CommentItemFlat
                    comment={comment}
                    onReply={handleReply}
                    isNewlyCreated={newlyCreatedCommentIds.has(comment.id)}
                    postSlug={postSlug}
                    categoryName={categoryName}
                    isAdmin={isAdmin}
                    targetCommentId={targetCommentId}
                    userVote={userVotes[comment.id] || null}
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
