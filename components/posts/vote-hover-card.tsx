"use client";

import Link from "next/link";
import type React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { usePostVoters } from "@/hooks/use-user-votes";
import { memberProfileUrl } from "@/lib/utils";

interface VoteHoverCardProps {
	postId: string;
	voteCount: number;
	children: React.ReactNode;
}

export const VoteHoverCard: React.FC<VoteHoverCardProps> = ({ postId, voteCount, children }) => {
	const { data: voters } = usePostVoters(postId);

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
										key={voter.id}
										href={memberProfileUrl({
											slug: voter.slug,
											id: voter.id,
										})}
										className="flex items-center space-x-2 hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
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
								<p className="text-xs text-muted-foreground">
									and {voters.total - voters.voters.length} more...
								</p>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">Loading...</p>
					)}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
