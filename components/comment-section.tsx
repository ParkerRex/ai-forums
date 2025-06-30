"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useMutationError } from "@/hooks/use-mutation-error";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { memberProfileUrl } from "@/lib/utils";

interface CommentSectionProps {
  postId: Id<"posts">;
  targetCommentId?: string;
}

type CommentWithReplies = {
  _id: Id<"comments">;
  content: string;
  createdAt: number;
  member: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    slug: string;
  } | null;
  // Legacy field for backward compatibility - will be removed in Phase 6
  author: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    slug: string;
  } | null;
  depth: number;
  replies: CommentWithReplies[];
};

interface CommentItemProps {
  comment: CommentWithReplies;
  onReply: (parentId: Id<"comments"> | null) => void;
  replyingTo: Id<"comments"> | null;
  newReply: string;
  setNewReply: (content: string) => void;
  onSubmitReply: (parentId: Id<"comments">) => void;
  isSubmittingReply: boolean;
}

function CommentItem({ 
  comment, 
  onReply, 
  replyingTo, 
  newReply, 
  setNewReply, 
  onSubmitReply,
  isSubmittingReply 
}: CommentItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasReplies = comment.replies && comment.replies.length > 0;
  
  // Calculate indentation based on depth (max 3 levels)
  const indentLevel = Math.min(comment.depth, 3);
  const marginLeft = indentLevel * 24; // 24px per level

  return (
    <div className="space-y-3" style={{ marginLeft: `${marginLeft}px` }}>
      <div id={`comment-${comment._id}`} className="border border-border rounded-lg p-4 bg-card transition-all duration-300">
        <div className="flex items-start space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-muted text-muted-foreground">
              {(comment.member || comment.author)?.firstName?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              {(comment.member || comment.author) ? (
                <Link 
                  href={memberProfileUrl({ slug: (comment.member || comment.author)!.slug, _id: (comment.member || comment.author)!._id })}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                  data-testid="member-link"
                >
                  {(comment.member || comment.author)!.firstName} {(comment.member || comment.author)!.lastName}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  Unknown User
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {comment.depth > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Reply
                </span>
              )}
            </div>
            <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
            <div className="flex items-center space-x-2">
              <Authenticated>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(comment._id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
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
                  {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Reply form */}
        {replyingTo === comment._id && (
          <div className="mt-4 ml-11 space-y-3">
            <Textarea
                              placeholder={`Reply to ${(comment.member || comment.author)?.firstName || 'this comment'}...`}
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => onSubmitReply(comment._id)}
                disabled={!newReply.trim() || isSubmittingReply}
              >
                {isSubmittingReply ? "Posting..." : "Post Reply"}
              </Button>
                             <Button
                 size="sm"
                 variant="outline"
                 onClick={() => onReply(null)}
               >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested replies */}
      {hasReplies && isExpanded && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              onReply={onReply}
              replyingTo={replyingTo}
              newReply={newReply}
              setNewReply={setNewReply}
              onSubmitReply={onSubmitReply}
              isSubmittingReply={isSubmittingReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ postId, targetCommentId }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Id<"comments"> | null>(null);
  const [newReply, setNewReply] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  const comments = useQuery(api.comments.getCommentsByPost, { postId });
  const createComment = useMutation(api.comments.createComment);
  const { handleMutationError, handleMutationSuccess } = useMutationError();

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

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);

    try {
      await createComment({
        postId,
        content: newComment.trim(),
      });
      setNewComment("");
      handleMutationSuccess("Comment posted successfully!");
    } catch (error) {
      handleMutationError(error, () => handleSubmitComment());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: Id<"comments">) => {
    if (!newReply.trim()) return;

    setIsSubmittingReply(true);

    try {
      await createComment({
        postId,
        content: newReply.trim(),
        parentCommentId: parentId,
      });
      setNewReply("");
      setReplyingTo(null);
      handleMutationSuccess("Reply posted successfully!");
    } catch (error) {
      handleMutationError(error, () => handleSubmitReply(parentId));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReply = (parentId: Id<"comments"> | null) => {
    setReplyingTo(parentId);
    setNewReply("");
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
          <div className="mb-6 space-y-4">
            <Textarea
              placeholder="Share your thoughts..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px]"
            />
            <Button 
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </Authenticated>

        <Unauthenticated>
          <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg text-center">
            <p className="text-muted-foreground mb-4">
              Join the conversation! Sign in to post comments.
            </p>
            <SignInButton mode="modal">
              <Button variant="outline">
                Sign In to Comment
              </Button>
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
                  newReply={newReply}
                  setNewReply={setNewReply}
                  onSubmitReply={handleSubmitReply}
                  isSubmittingReply={isSubmittingReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
