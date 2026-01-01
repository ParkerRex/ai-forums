"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePollVoters } from "@/hooks/use-polls";
import { memberProfileUrl } from "@/lib/utils";

interface PollVotersModalProps {
	isOpen: boolean;
	onClose: () => void;
	pollId: string;
	pollOptions: Array<{
		id: string;
		text: string;
		voteCount: number;
	}>;
}

export function PollVotersModal({ isOpen, onClose, pollId, pollOptions }: PollVotersModalProps) {
	const [activeTab, setActiveTab] = useState(pollOptions[0]?.id || "");

	// Get poll votes - only fetch when modal is open
	const { data: pollVotes, isLoading } = usePollVoters(pollId, isOpen);

	const getInitials = (firstName: string, lastName: string) => {
		return `${firstName[0]}${lastName[0]}`.toUpperCase();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-h-[80vh] sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Poll Voters</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				) : pollVotes ? (
					<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
						<TabsList
							className="grid w-full"
							style={{
								gridTemplateColumns: `repeat(${pollOptions.length}, 1fr)`,
							}}
						>
							{pollOptions.map((option) => (
								<TabsTrigger key={option.id} value={option.id} className="text-xs">
									{option.text} ({option.voteCount})
								</TabsTrigger>
							))}
						</TabsList>

						{pollOptions.map((option) => (
							<TabsContent key={option.id} value={option.id} className="mt-4">
								<div className="max-h-[400px] space-y-3 overflow-y-auto">
									{pollVotes.votesByOption[option.id]?.length > 0 ? (
										pollVotes.votesByOption[option.id].map((voter) => (
											<Link
												key={voter.memberId}
												href={memberProfileUrl({
													slug: voter.slug,
													id: voter.memberId,
												})}
												className="hover:bg-muted flex items-center gap-3 rounded-none p-2 transition-colors"
											>
												<Avatar className="h-10 w-10">
													<AvatarImage
														src={voter.avatarUrl || undefined}
														alt={`${voter.firstName} ${voter.lastName}`}
													/>
													<AvatarFallback>
														{getInitials(voter.firstName, voter.lastName)}
													</AvatarFallback>
												</Avatar>
												<div className="flex-1">
													<p className="text-sm font-medium">
														{voter.firstName} {voter.lastName}
													</p>
													<p className="text-muted-foreground text-xs">
														@{voter.email.split("@")[0]}
													</p>
												</div>
												<span className="text-muted-foreground text-xs">
													{new Date(voter.votedAt).toLocaleDateString()}
												</span>
											</Link>
										))
									) : (
										<p className="text-muted-foreground py-8 text-center">
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
