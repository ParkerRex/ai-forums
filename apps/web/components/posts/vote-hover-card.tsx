"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/web/components/ui/hover-card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/web/components/ui/avatar";
import { Id } from "@/web/convex/_generated/dataModel";
import Link from "next/link";
import { memberProfileUrl } from "@/lib/utils";

interface VoteHoverCardProps {
  postId: Id<"posts">;
  voteCount: number;
  children: React.ReactNode;
}

// type Voter = {
//   _id: Id<"members">;
//   firstName: string;
//   lastName: string;
//   avatarUrl: string | null;
//   slug: string;
// };

export const VoteHoverCard: React.FC<VoteHoverCardProps> = ({
  postId,
  voteCount,
  children,
}) => {
  const voters = useQuery(api.votes.getPostVoters, { postId }) as
    | {
        voters: Array<{
          _id: Id<"members">;
          firstName: string;
          lastName: string;
          avatarUrl?: string;
          slug: string;
        }>;
        hasMore: boolean;
        total: number;
      }
    | undefined;

  if (voteCount === 0) {
    return <>{children}</>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Upvoted by</h4>
          {voters ? (
            <div className="space-y-2">
              {voters.voters.map((voter) => {
                if (!voter) return null;
                return (
                  <Link
                    key={voter._id}
                    href={memberProfileUrl({
                      slug: voter.slug,
                      _id: voter._id,
                    })}
                    className="hover:bg-muted/50 -m-1 flex items-center space-x-2 rounded p-1 transition-colors"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={voter.avatarUrl || ""} />
                      <AvatarFallback className="text-xs">
                        {voter.firstName[0]}
                        {voter.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {voter.firstName} {voter.lastName}
                    </span>
                  </Link>
                );
              })}
              {voters.hasMore && (
                <p className="text-muted-foreground text-xs">
                  and {voters.total - voters.voters.length} more...
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Loading...</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
