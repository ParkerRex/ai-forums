"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { PollVotersModal } from "@/components/posts/poll-voters-modal";

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

interface PollDisplayProps {
  pollId: Id<"posts">;
  pollOptions: PollOption[];
  pollEndsAt?: number;
  totalVotes?: number;
  currentUserId?: Id<"members">;
}

export function PollDisplay({
  pollId,
  pollOptions,
  pollEndsAt,
  totalVotes = 0,
  currentUserId,
}: PollDisplayProps) {
  const { user } = useUser();
  const [isVoting, setIsVoting] = useState(false);
  const [showVotersModal, setShowVotersModal] = useState(false);
  
  // Get poll results with current user's vote
  const pollResults = useQuery(
    api.polls.getPollResults,
    currentUserId ? { pollId, userId: currentUserId } : { pollId }
  ) as {
    pollOptions: PollOption[];
    totalVotes: number;
    userVotedOptionId: string | null;
    hasEnded: boolean;
    endsAt?: number;
  } | undefined;

  const voteOnPoll = useMutation(api.polls.voteOnPoll);

  // Use real-time data if available, fallback to props
  const options = pollResults?.pollOptions || pollOptions;
  const total = pollResults?.totalVotes || totalVotes;
  const userVotedOptionId = pollResults?.userVotedOptionId || null;
  const hasEnded = pollResults?.hasEnded || (pollEndsAt ? pollEndsAt < Date.now() : false);

  const handleVote = async (optionId: string) => {
    if (!user) {
      toast.error("Please sign in to vote");
      return;
    }

    if (!currentUserId) {
      toast.error("Unable to identify user");
      return;
    }

    if (hasEnded) {
      toast.error("This poll has ended");
      return;
    }

    setIsVoting(true);
    try {
      const result = await voteOnPoll({ pollId, optionId });
      if (result.changed) {
        toast.success("Vote changed successfully");
      } else {
        toast.success("Vote recorded successfully");
      }
    } catch (error) {
      console.error("Failed to vote:", error);
      toast.error("Failed to record vote");
    } finally {
      setIsVoting(false);
    }
  };

  const getPercentage = (voteCount: number) => {
    if (total === 0) return 0;
    return Math.round((voteCount / total) * 100);
  };

  const getTimeRemaining = () => {
    if (!pollEndsAt || pollEndsAt === 0) return "No end date";
    if (hasEnded) return "Ended";
    return `Ends ${formatDistanceToNow(new Date(pollEndsAt), { addSuffix: true })}`;
  };

  return (
    <div className="space-y-4">
      {/* Poll status bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {total} {total === 1 ? "vote" : "votes"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {getTimeRemaining()}
          </span>
        </div>
      </div>

      {/* Poll options */}
      <div className="space-y-3">
        {options.map((option) => {
          const percentage = getPercentage(option.voteCount);
          const isVoted = userVotedOptionId === option.id;

          return (
            <div key={option.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex-1 text-sm">{option.text}</span>
                {!hasEnded && currentUserId && !userVotedOptionId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVote(option.id)}
                    disabled={isVoting}
                  >
                    Vote
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    {isVoted && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    <span className="text-sm font-medium">{percentage}%</span>
                  </div>
                )}
              </div>
              
              <div className="relative">
                <Progress value={percentage} className="h-6" />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs text-muted-foreground">
                    {option.voteCount} {option.voteCount === 1 ? "vote" : "votes"}
                  </span>
                </div>
              </div>

              {option.voteCount > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setShowVotersModal(true)}
                >
                  View voters
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Change vote message */}
      {userVotedOptionId && !hasEnded && currentUserId && (
        <p className="text-xs text-muted-foreground text-center">
          Click on another option to change your vote
        </p>
      )}

      {/* Voters Modal */}
      <PollVotersModal
        isOpen={showVotersModal}
        onClose={() => setShowVotersModal(false)}
        pollId={pollId}
        pollOptions={options}
      />
    </div>
  );
}