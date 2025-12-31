"use client";

import React from "react";
import { Authenticated, Unauthenticated } from "@/components/auth-wrappers";
import { ArrowBigUpIcon } from "@/components/icons/arrow-big-up";
import { MembershipCTAModal } from "@/components/members/membership-cta-modal";
import { VoteHoverCard } from "@/components/posts/vote-hover-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
	targetId: string;
	targetType: "post" | "comment";
	voteCount: number;
	isVoted: boolean;
	isVoting: boolean;
	onVote: (e: React.MouseEvent) => void;
	className?: string;
	size?: "sm" | "md" | "lg";
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
					"hover:bg-muted/50 dark:hover:bg-muted/20 group h-auto rounded-none px-1.5 py-0.5",
					isVoted &&
						"text-orange-600 hover:bg-orange-100 dark:text-orange-500 dark:hover:bg-orange-900/20",
					isVoting && "cursor-not-allowed opacity-50 hover:bg-transparent",
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
						isVoted
							? "fill-orange-600 text-orange-600 dark:fill-orange-500 dark:text-orange-500"
							: "text-muted-foreground hover:text-foreground",
					)}
				/>
			</Button>
			<span
				className={cn(
					"ml-0.5 select-none text-xs font-medium",
					isVoted
						? "text-orange-600 dark:text-orange-500"
						: "text-muted-foreground",
				)}
			>
				{voteCount}
			</span>
		</div>
	);

	const VoteButtonWithHover = () => {
		if (!showHoverCard || targetType !== "post") {
			return <VoteButtonContent />;
		}

		return (
			<VoteHoverCard postId={targetId} voteCount={voteCount}>
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
							className="hover:bg-muted/50 dark:hover:bg-muted/20 group h-auto rounded-none px-1.5 py-0.5"
							onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
							onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
						>
							<ArrowBigUpIcon
								ref={upvoteIconRef}
								size={size === "sm" ? 12 : 16}
								className="text-muted-foreground hover:text-foreground transition-colors"
							/>
						</Button>
						<span className="text-muted-foreground ml-0.5 select-none text-xs font-medium">
							{voteCount}
						</span>
					</div>
				</MembershipCTAModal>
			</Unauthenticated>
		</>
	);
};
