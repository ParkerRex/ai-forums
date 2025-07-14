"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowBigUpIcon } from "@/components/icons/arrow-big-up";
import { VoteHoverCard } from "@/components/posts/vote-hover-card";
import { MembershipCTAModal } from "@/components/members/membership-cta-modal";
import { Authenticated, Unauthenticated } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
  /** The target ID (post or comment) */
  targetId: Id<"posts"> | Id<"comments">;
  /** The target type for vote hover card */
  targetType: "post" | "comment";
  /** Current vote count */
  voteCount: number;
  /** Whether user has voted */
  isVoted: boolean;
  /** Whether voting is in progress */
  isVoting: boolean;
  /** Vote handler function */
  onVote: (e: React.MouseEvent) => void;
  /** Optional className for styling */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show hover card with voters */
  showHoverCard?: boolean;
}

export const VoteButton: React.FC<VoteButtonProps> = ({
  targetId,
  targetType,
  voteCount,
  isVoted,
  isVoting,
  onVote,
  className,
  size = "md",
  showHoverCard = true,
}) => {
  // Animation ref for the upvote icon
  const upvoteIconRef = React.useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);



  const VoteButtonContent = () => (
    <div className={cn("inline-flex items-center", className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "group h-auto px-1.5 py-0.5 rounded-sm hover:bg-muted/50 dark:hover:bg-muted/20",
          isVoted && "text-orange-600 hover:bg-orange-100 dark:text-orange-500 dark:hover:bg-orange-900/20",
          isVoting && "opacity-50 cursor-not-allowed hover:bg-transparent"
        )}
        onClick={onVote}
        disabled={isVoting}
        onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
        onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
      >
        <ArrowBigUpIcon
          ref={upvoteIconRef}
          size={size === "sm" ? 12 : 16}
          className={cn(
            "transition-colors",
            isVoted ? "text-orange-600 fill-orange-600 dark:text-orange-500 dark:fill-orange-500" : "text-muted-foreground hover:text-foreground"
          )}
        />
      </Button>
      <span className={cn(
        "text-xs font-medium select-none ml-0.5",
        isVoted ? "text-orange-600 dark:text-orange-500" : "text-muted-foreground"
      )}>
        {voteCount}
      </span>
    </div>
  );

  const VoteButtonWithHover = () => {
    if (!showHoverCard || targetType !== "post") {
      return <VoteButtonContent />;
    }

    return (
      <VoteHoverCard postId={targetId as Id<"posts">} voteCount={voteCount}>
        <VoteButtonContent />
      </VoteHoverCard>
    );
  };

  return (
    <>
      <Authenticated>
        <VoteButtonWithHover />
      </Authenticated>

      <Unauthenticated>
        <MembershipCTAModal
          title="Upvote Great Content"
          description="Join VAI to upvote posts and help surface the best content in the community"
        >
          <div className={cn("inline-flex items-center", className)}>
            <Button
              variant="ghost"
              size="sm"
              className="group h-auto px-1.5 py-0.5 rounded-sm hover:bg-muted/50 dark:hover:bg-muted/20"
              onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
              onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
            >
              <ArrowBigUpIcon
                ref={upvoteIconRef}
                size={size === "sm" ? 12 : 16}
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </Button>
            <span className="text-xs font-medium select-none ml-0.5 text-muted-foreground">
              {voteCount}
            </span>
          </div>
        </MembershipCTAModal>
      </Unauthenticated>
    </>
  );
};
