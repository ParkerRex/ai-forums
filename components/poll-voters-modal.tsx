"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { memberProfileUrl } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PollVotersModalProps {
  isOpen: boolean;
  onClose: () => void;
  pollId: Id<"posts">;
  pollOptions: Array<{
    id: string;
    text: string;
    voteCount: number;
  }>;
}

export function PollVotersModal({
  isOpen,
  onClose,
  pollId,
  pollOptions,
}: PollVotersModalProps) {
  const [activeTab, setActiveTab] = useState(pollOptions[0]?.id || "");
  
  // Get poll votes
  const pollVotes = useQuery(api.polls.getPollVotes, { pollId });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Poll Voters</DialogTitle>
        </DialogHeader>

        {pollVotes ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${pollOptions.length}, 1fr)` }}>
              {pollOptions.map((option) => (
                <TabsTrigger key={option.id} value={option.id} className="text-xs">
                  {option.text} ({option.voteCount})
                </TabsTrigger>
              ))}
            </TabsList>

            {pollOptions.map((option) => (
              <TabsContent key={option.id} value={option.id} className="mt-4">
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {pollVotes.votesByOption[option.id]?.length > 0 ? (
                    pollVotes.votesByOption[option.id].map((voter) => (
                      <Link
                        key={voter.memberId}
                        href={memberProfileUrl({ slug: voter.slug, _id: voter.memberId })}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={voter.avatarUrl} alt={`${voter.firstName} ${voter.lastName}`} />
                          <AvatarFallback>
                            {getInitials(voter.firstName, voter.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {voter.firstName} {voter.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{voter.email.split('@')[0]}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(voter.votedAt).toLocaleDateString()}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No votes for this option yet
                    </p>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}