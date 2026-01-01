"use client";

import { Suspense } from "react";
import CommentSection from "@/components/comments/comment-section-flat";
import { CommentsSkeleton } from "@/components/posts/post-skeletons";

interface CommentSectionAsyncProps {
  postId: string;
  targetCommentId?: string;
}

/**
 * Async comment section wrapper for streaming SSR
 *
 * Wraps the comment section in Suspense for progressive loading.
 * The skeleton shows immediately while comments load in the background.
 */
export function CommentSectionAsync({ postId, targetCommentId }: CommentSectionAsyncProps) {
  return (
    <Suspense fallback={<CommentsSkeleton />}>
      <CommentSection postId={postId} targetCommentId={targetCommentId} />
    </Suspense>
  );
}
