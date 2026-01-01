// Vote-related type definitions

export type VoteType = "upvote" | "downvote" | "remove";
export type VoteTargetType = "post" | "comment" | "resource";

export interface Vote {
  id: string;
  userId: string;
  targetId: string;
  targetType: VoteTargetType;
  voteType: VoteType;
  createdAt: string;
  updatedAt?: string;
}

export interface VoteInput {
  voteType: VoteType;
}

export interface UserVoteResult {
  voteType: string | null;
}

export interface BatchVotesResult {
  [targetId: string]: string;
}
