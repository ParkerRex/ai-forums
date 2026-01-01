"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

type Comment = {
  id: string;
  content: string;
  postId: string;
  parentCommentId: string | null;
  depth: number;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  createdAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    avatarUrl: string | null;
  };
};

type CommentsResponse = {
  items: Comment[];
};

type CreateCommentData = {
  content: string;
  parentCommentId?: string;
  replyToMemberId?: string;
  replyToCommentId?: string;
};

async function fetchComments(
  postId: string,
  options?: { sortBy?: string; flat?: boolean },
): Promise<CommentsResponse> {
  const searchParams = new URLSearchParams();
  if (options?.sortBy) searchParams.set("sortBy", options.sortBy);
  if (options?.flat) searchParams.set("flat", "true");

  const response = await fetch(`/api/posts/${postId}/comments?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to fetch comments");
  }
  return response.json();
}

async function createComment(postId: string, data: CreateCommentData): Promise<Comment> {
  const response = await fetch(`/api/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create comment");
  }
  return response.json();
}

async function voteOnComment(
  commentId: string,
  voteType: "upvote" | "downvote",
): Promise<{ upvotes: number; downvotes: number; netVotes: number }> {
  const response = await fetch(`/api/comments/${commentId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voteType }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to vote");
  }
  return response.json();
}

export function useComments(postId: string, options?: { sortBy?: string; flat?: boolean }) {
  return useQuery({
    queryKey: queryKeys.comments.byPost(postId, options),
    queryFn: () => fetchComments(postId, options),
    enabled: !!postId,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentData) => createComment(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });
}

export function useVoteOnComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      voteType,
    }: {
      commentId: string;
      voteType: "upvote" | "downvote" | "remove";
    }) => voteOnComment(commentId, voteType as "upvote" | "downvote"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}

// Edit comment
async function editComment(
  commentId: string,
  data: { content: string; attachments?: AttachmentType[] },
): Promise<Comment> {
  const response = await fetch(`/api/comments/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to edit comment");
  }
  return response.json();
}

export function useEditComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      content,
      attachments,
    }: {
      commentId: string;
      content: string;
      attachments?: AttachmentType[];
    }) => editComment(commentId, { content, attachments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}

// Delete comment
async function deleteComment(commentId: string): Promise<void> {
  const response = await fetch(`/api/comments/${commentId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete comment");
  }
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}

// Report comment
async function reportComment(
  commentId: string,
  data: { reason: string; reasonText?: string },
): Promise<void> {
  const response = await fetch(`/api/comments/${commentId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to report comment");
  }
}

export function useReportComment() {
  return useMutation({
    mutationFn: ({
      commentId,
      reason,
      reasonText,
    }: {
      commentId: string;
      reason: string;
      reasonText?: string;
    }) => reportComment(commentId, { reason, reasonText }),
  });
}

// Reorder comment replies
async function reorderCommentReplies(
  parentCommentId: string,
  commentId: string,
  newOrder: number,
): Promise<void> {
  const response = await fetch(`/api/comments/${parentCommentId}/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commentId, newOrder }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to reorder comments");
  }
}

export function useReorderCommentReplies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      parentCommentId,
      commentId,
      newOrder,
    }: {
      parentCommentId: string;
      commentId: string;
      newOrder: number;
    }) => reorderCommentReplies(parentCommentId, commentId, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}

// Type for attachments
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
