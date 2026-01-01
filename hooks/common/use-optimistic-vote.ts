"use client";

import { useCallback, useState } from "react";
import { useVoteOnComment } from "@/hooks/use-comments";
import { useVoteOnPost } from "@/hooks/use-posts";

type VoteType = "upvote" | "downvote" | "remove";
type TargetType = "post" | "comment" | "resource";

interface UseOptimisticVoteOptions {
  targetId: string;
  targetType: TargetType;
  initialNetVotes: number;
  initialUserVote: string | null | undefined;
  onError?: (error: Error) => void;
}

interface UseOptimisticVoteReturn {
  netVotes: number;
  userVote: string | null;
  isVoting: boolean;
  upvote: (e?: React.MouseEvent) => Promise<void>;
  downvote: (e?: React.MouseEvent) => Promise<void>;
  vote: (voteType: VoteType, e?: React.MouseEvent) => Promise<void>;
}

/**
 * A reusable hook for handling optimistic voting with rollback on error.
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Support for posts, comments, and resources
 * - Type-safe vote state management
 *
 * @example
 * ```tsx
 * const { netVotes, userVote, isVoting, upvote, downvote } = useOptimisticVote({
 *   targetId: post.id,
 *   targetType: "post",
 *   initialNetVotes: post.netVotes,
 *   initialUserVote: userVote,
 *   onError: (error) => toast.error(error.message),
 * });
 * ```
 */
export function useOptimisticVote({
  targetId,
  targetType,
  initialNetVotes,
  initialUserVote,
  onError,
}: UseOptimisticVoteOptions): UseOptimisticVoteReturn {
  const [netVotes, setNetVotes] = useState(initialNetVotes);
  const [userVote, setUserVote] = useState<string | null>(initialUserVote ?? null);
  const [isVoting, setIsVoting] = useState(false);

  // Use appropriate mutation based on target type
  const postVoteMutation = useVoteOnPost();
  const commentVoteMutation = useVoteOnComment();

  const vote = useCallback(
    async (voteType: VoteType, e?: React.MouseEvent) => {
      e?.stopPropagation();

      if (isVoting) return;
      setIsVoting(true);

      // Store previous state for rollback
      const prevNetVotes = netVotes;
      const prevUserVote = userVote;

      // Calculate optimistic vote changes
      let newNetVotes = netVotes;
      let newUserVote: string | null = null;

      if (voteType === "remove") {
        // Removing vote - decrement if was upvote, increment if was downvote
        if (userVote === "upvote") {
          newNetVotes = netVotes - 1;
        } else if (userVote === "downvote") {
          newNetVotes = netVotes + 1;
        }
        newUserVote = null;
      } else if (voteType === "upvote") {
        // Adding upvote
        if (userVote === "downvote") {
          // Switching from downvote to upvote (+2)
          newNetVotes = netVotes + 2;
        } else if (userVote === null) {
          // New upvote (+1)
          newNetVotes = netVotes + 1;
        }
        newUserVote = "upvote";
      } else if (voteType === "downvote") {
        // Adding downvote
        if (userVote === "upvote") {
          // Switching from upvote to downvote (-2)
          newNetVotes = netVotes - 2;
        } else if (userVote === null) {
          // New downvote (-1)
          newNetVotes = netVotes - 1;
        }
        newUserVote = "downvote";
      }

      // Apply optimistic updates
      setNetVotes(newNetVotes);
      setUserVote(newUserVote);

      try {
        if (targetType === "post") {
          const result = await postVoteMutation.mutateAsync({
            postId: targetId,
            voteType,
          });
          // Update with server response for accuracy
          setNetVotes(result.netVotes);
          setUserVote(result.newVoteType);
        } else if (targetType === "comment") {
          const result = await commentVoteMutation.mutateAsync({
            commentId: targetId,
            voteType,
          });
          // Update with server response
          setNetVotes(result.netVotes);
        }
        // Resource voting can be added here when needed
      } catch (error) {
        // Rollback on error
        setNetVotes(prevNetVotes);
        setUserVote(prevUserVote);
        onError?.(error as Error);
      } finally {
        setIsVoting(false);
      }
    },
    [
      targetId,
      targetType,
      netVotes,
      userVote,
      isVoting,
      postVoteMutation,
      commentVoteMutation,
      onError,
    ],
  );

  const upvote = useCallback(
    (e?: React.MouseEvent) => {
      const voteType = userVote === "upvote" ? "remove" : "upvote";
      return vote(voteType, e);
    },
    [vote, userVote],
  );

  const downvote = useCallback(
    (e?: React.MouseEvent) => {
      const voteType = userVote === "downvote" ? "remove" : "downvote";
      return vote(voteType, e);
    },
    [vote, userVote],
  );

  return {
    netVotes,
    userVote,
    isVoting,
    upvote,
    downvote,
    vote,
  };
}
