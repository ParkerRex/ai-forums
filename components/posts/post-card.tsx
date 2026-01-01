"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Authenticated, Unauthenticated } from "@/components/auth-wrappers";
import { ArrowBigUpIcon } from "@/components/icons/arrow-big-up";
import { MessageSquareIcon } from "@/components/icons/message-square";
import { PostBookmarkButton } from "@/components/posts/post-bookmark-button";
import PostPreview from "@/components/posts/post-preview";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "@/components/ui/upload";
import { useVoteOnPost } from "@/hooks/use-posts";
import { useMutationError } from "@/hooks/use-mutation-error";
import type { PostData } from "@/lib/post-preview-utils";
import { cn } from "@/lib/utils";

interface Post extends Omit<PostData, "member" | "author" | "category"> {
	id: string;
	title: string;
	content: string;
	preview?: string;
	isFree?: boolean;
	slug: string;
	createdAt: number;
	updatedAt: number;
	memberId: string;
	categoryId: string;
	status: "active" | "deleted" | "hidden" | "archived";
	upvotes: number;
	downvotes: number;
	netVotes: number;
	commentCount: number;
	viewCount: number;
	isPinned?: boolean;
	isLocked?: boolean;
	editedAt?: number;
	editReason?: string;
	pinScope?: "category" | "global" | "both";
	pollOptions?: Array<{
		id: string;
		text: string;
		voteCount: number;
	}>;
	pollEndsAt?: number;
	totalPollVotes?: number;
	attachments?: Array<{
		type: string;
		url: string;
		name?: string;
		size?: number;
	}>;
	mediaUrl?: string;
	thumbnailUrl?: string;
	linkUrl?: string;
	linkTitle?: string;
	linkDescription?: string;
	linkImage?: string;
	type?: "text" | "image" | "video" | "link" | "poll";
	member: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		username: string;
		slug?: string;
	} | null;
	category: {
		id: string;
		name: string;
		displayName: string;
		icon?: string;
	} | null;
}

interface PostCardProps {
	post: Post;
	size?: "small" | "medium" | "large";
	currentCategoryId?: string;
	userVote?: "upvote" | null;
}

export default function PostCard({
	post,
	size = "large",
	currentCategoryId,
	userVote,
}: PostCardProps) {
	const router = useRouter();
	const [isVoting, setIsVoting] = useState(false);

	const [optimisticNetVotes, setOptimisticNetVotes] = useState(post.netVotes);
	const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(
		null,
	);

	const upvoteIconRef = useRef<{
		startAnimation: () => void;
		stopAnimation: () => void;
	}>(null);
	const commentIconRef = useRef<{
		startAnimation: () => void;
		stopAnimation: () => void;
	}>(null);
	const shareIconRef = useRef<{
		startAnimation: () => void;
		stopAnimation: () => void;
	}>(null);

	const voteOnPost = useVoteOnPost();

	const { handleMutationError } = useMutationError();

	const actualUserVote = userVote !== undefined ? userVote : null;
	const currentUserVote =
		optimisticUserVote !== null ? optimisticUserVote : actualUserVote;

	const handleUpvote = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isVoting) return;
		setIsVoting(true);

		const voteType = currentUserVote === "upvote" ? "remove" : "upvote";

		let newNetVotes = optimisticNetVotes;
		let newUserVote: string | null = null;

		if (voteType === "upvote") {
			newNetVotes = optimisticNetVotes + (currentUserVote === null ? 1 : 1);
			newUserVote = "upvote";
		} else {
			newNetVotes = optimisticNetVotes - 1;
			newUserVote = null;
		}

		setOptimisticNetVotes(newNetVotes);
		setOptimisticUserVote(newUserVote);

		try {
			const result = await voteOnPost.mutateAsync({
				postId: post.id,
				voteType,
			});

			setOptimisticNetVotes(result.netVotes);
			setOptimisticUserVote(result.newVoteType);
		} catch (error) {
			setOptimisticNetVotes(post.netVotes);
			setOptimisticUserVote(actualUserVote || null);
			handleMutationError(error, () => handleUpvote(e), {
				context: "voting on post",
			});
		} finally {
			setIsVoting(false);
		}
	};

	const handleClick = () => {
		router.push(`/${post.category?.name || "general"}/${post.slug}`);
	};

	const handleShare = async (e: React.MouseEvent) => {
		e.stopPropagation();
		const postUrl = `${window.location.origin}/${post.category?.name || "general"}/${post.slug}`;

		try {
			await navigator.clipboard.writeText(postUrl);
			toast.success("Link copied to clipboard!");
		} catch {
			toast.error("Failed to copy link");
		}
	};

	return (
		<div
			className={cn(
				"group rounded-none border transition-all duration-200",
				post.isPinned
					? "border-orange-200 bg-orange-50 hover:bg-orange-100/50 dark:border-orange-900/30 dark:bg-orange-950/20 dark:hover:bg-orange-950/30"
					: "bg-card hover:bg-muted/30",
			)}
		>
			<div className="cursor-pointer px-3 py-2" onClick={handleClick}>
				<PostPreview
					post={post as unknown as PostData}
					size={size}
					showStats={false}
					showCategory={currentCategoryId !== post.categoryId}
					showMember={true}
					className="border-0 p-0 shadow-none hover:shadow-none"
				/>

				<div className="text-muted-foreground mt-2 flex items-center space-x-3 text-xs">
					<Authenticated>
						<Button
							variant="ghost"
							size="sm"
							className="hover:bg-muted/50 h-auto rounded-none transition-colors"
							onClick={(e) => {
								e.stopPropagation();
								if (!post.isFree) {
									handleClick();
								} else {
									handleUpvote(e);
								}
							}}
							disabled={isVoting && post.isFree}
							onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
							onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
						>
							<ArrowBigUpIcon
								ref={upvoteIconRef}
								size={16}
								className={`transition-colors ${
									currentUserVote === "upvote"
										? "fill-orange-500 text-orange-500"
										: "text-muted-foreground hover:text-orange-500"
								}`}
							/>
							<span className="font-medium">{optimisticNetVotes}</span>
						</Button>
					</Authenticated>
					<Unauthenticated>
						<Button
							variant="ghost"
							size="sm"
							className="hover:bg-muted/50 h-auto rounded-none px-2 py-1 transition-colors"
							onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
							onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
						>
							<ArrowBigUpIcon
								ref={upvoteIconRef}
								size={18}
								className="text-muted-foreground hover:text-orange-500"
							/>
							<span className="font-medium">{optimisticNetVotes}</span>
						</Button>
					</Unauthenticated>

					<Authenticated>
						<Button
							variant="ghost"
							size="sm"
							className="hover:bg-muted/50 h-auto rounded-none px-2 py-1 transition-colors"
							onClick={(e) => {
								e.stopPropagation();
								handleClick();
							}}
							onMouseEnter={() => commentIconRef.current?.startAnimation()}
							onMouseLeave={() => commentIconRef.current?.stopAnimation()}
						>
							<MessageSquareIcon ref={commentIconRef} size={12} className="mr-1" />
							<span className="font-mono tracking-tighter">
								{post.commentCount}
							</span>
						</Button>
					</Authenticated>
					<Unauthenticated>
						<Button
							variant="ghost"
							size="sm"
							className="hover:bg-muted/50 h-auto rounded-none px-2 py-1 transition-colors"
							onMouseEnter={() => commentIconRef.current?.startAnimation()}
							onMouseLeave={() => commentIconRef.current?.stopAnimation()}
						>
							<MessageSquareIcon ref={commentIconRef} size={10} className="mr-1" />
							<span className="font-mono tracking-tighter">
								{post.commentCount}
							</span>
						</Button>
					</Unauthenticated>

					<PostBookmarkButton targetId={post.id} targetType="post" size="sm" />
					<Button
						variant="ghost"
						size="sm"
						className="hover:bg-muted/50 h-auto rounded-none transition-colors"
						onClick={(e) => {
							e.stopPropagation();
							handleShare(e);
						}}
						onMouseEnter={() => shareIconRef.current?.startAnimation()}
						onMouseLeave={() => shareIconRef.current?.stopAnimation()}
					>
						<UploadIcon ref={shareIconRef} size={12} className="" />
					</Button>
				</div>
			</div>
		</div>
	);
}
