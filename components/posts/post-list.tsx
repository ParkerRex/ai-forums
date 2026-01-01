"use client";

import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import PostCard from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { usePosts } from "@/hooks/use-posts";
import { useUserVotes } from "@/hooks/use-user-votes";

interface PostListProps {
	categoryId?: string;
	sortBy?: "newest" | "popular" | "trending";
	freeOnly?: boolean;
	currentCategoryId?: string;
}

export default function PostList({
	categoryId,
	sortBy = "newest",
	freeOnly = false,
	currentCategoryId,
}: PostListProps) {
	const {
		data,
		status,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = usePosts({
		categoryId,
		sortBy,
		freeOnly,
	});

	// Flatten paginated results
	const allPosts = useMemo(() => {
		return data?.pages.flatMap((page) => page.items) ?? [];
	}, [data]);

	// Extract post IDs for batch vote fetching
	const postIds = useMemo(() => allPosts.map((post) => post.id), [allPosts]);

	// Batch fetch all votes at once
	const { votes } = useUserVotes(postIds, "post");

	// Loading state
	if (status === "pending") {
		return (
			<div className="space-y-2">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="bg-card border-border/50 rounded border p-3">
						<div className="animate-pulse">
							<div className="flex space-x-4">
								<div className="bg-muted h-10 w-10 rounded-full"></div>
								<div className="flex-1 space-y-2 py-1">
									<div className="bg-muted h-4 w-3/4 rounded"></div>
									<div className="space-y-2">
										<div className="bg-muted h-4 rounded"></div>
										<div className="bg-muted h-4 w-5/6 rounded"></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		);
	}

	// Show an error message if the query failed
	if (status === "error") {
		return (
			<div className="space-y-2">
				<div className="bg-destructive/10 border-destructive/20 rounded border p-6 text-center">
					<p className="text-destructive-foreground">
						Something went wrong while loading posts. Please try again later.
					</p>
				</div>
			</div>
		);
	}

	// Empty state
	if (allPosts.length === 0) {
		return (
			<div className="space-y-2">
				<div className="bg-card border-border/50 rounded-none border p-6 text-center">
					<p className="text-muted-foreground">No posts found. Be the first to create one!</p>
				</div>
			</div>
		);
	}

	const handleLoadMore = async () => {
		try {
			await fetchNextPage();
		} catch (error) {
			console.error("Failed to load more posts:", error);
		}
	};

	return (
		<div className="space-y-2">
			{allPosts.map((post) => (
				<PostCard
					key={post.id}
					post={{
						id: post.id,
						title: post.title,
						content: post.content,
						preview: post.preview ?? undefined,
						isFree: post.isFree,
						slug: post.slug,
						createdAt: new Date(post.createdAt).getTime(),
						updatedAt: new Date(post.createdAt).getTime(),
						memberId: post.memberId,
						categoryId: post.categoryId,
						status: post.status as "active" | "deleted" | "hidden" | "archived",
						upvotes: post.upvotes,
						downvotes: post.downvotes,
						netVotes: post.netVotes,
						commentCount: post.commentCount,
						viewCount: post.viewCount,
						isPinned: post.isPinned,
						isLocked: post.isLocked,
						editedAt: post.editedAt ? new Date(post.editedAt).getTime() : undefined,
						type: post.type as "text" | "image" | "video" | "link" | "poll" | undefined,
						pollOptions: post.pollOptions || undefined,
						pollEndsAt: post.pollEndsAt ? new Date(post.pollEndsAt).getTime() : undefined,
						totalPollVotes: post.totalPollVotes || undefined,
						mediaUrl: post.mediaUrl || undefined,
						thumbnailUrl: post.thumbnailUrl || undefined,
						linkUrl: post.linkUrl || undefined,
						linkTitle: post.linkTitle || undefined,
						linkDescription: post.linkDescription || undefined,
						linkImage: post.linkImage || undefined,
						attachments: post.attachments || undefined,
						member: post.member
							? {
									id: post.member.id,
									firstName: post.member.firstName,
									lastName: post.member.lastName,
									email: "",
									username: post.member.username || "",
									slug: post.member.slug,
								}
							: null,
						category: post.category
							? {
									id: post.category.id,
									name: post.category.name,
									displayName: post.category.displayName,
									icon: post.category.icon || undefined,
								}
							: null,
					}}
					size="small"
					currentCategoryId={currentCategoryId}
					userVote={votes[post.id] || null}
				/>
			))}

			{/* Load More Button */}
			{hasNextPage && !isFetchingNextPage && (
				<div className="flex justify-center pt-4">
					<Button onClick={handleLoadMore} variant="outline" size="sm" className="min-w-[120px]">
						Load More
					</Button>
				</div>
			)}

			{/* Loading More Indicator */}
			{isFetchingNextPage && (
				<div className="flex justify-center pt-4">
					<Button disabled variant="outline" size="sm" className="min-w-[120px]">
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Loading...
					</Button>
				</div>
			)}

			{/* End of Posts Indicator */}
			{!hasNextPage && allPosts.length > 0 && (
				<div className="py-4 text-center">
					<p className="text-muted-foreground text-sm">You&apos;ve reached the end</p>
				</div>
			)}
		</div>
	);
}
