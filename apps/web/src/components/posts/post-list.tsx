"use client";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Id } from "@/web/convex/_generated/dataModel";
import PostCard from "../components/posts/post-card";
import { useUserVotes } from "@/hooks/use-user-votes";
import { useMemo } from "react";
import { Button } from "../components/ui/button";
import { Loader2 } from "lucide-react";

interface PostListProps {
  categoryId?: Id<"categories">;
  sortBy?: "newest" | "popular" | "trending";
  freeOnly?: boolean;
  currentCategoryId?: Id<"categories">;
}

export default function PostList({
  categoryId,
  sortBy = "newest",
  freeOnly = false,
  currentCategoryId,
}: PostListProps) {
  const paginatedQuery = usePaginatedQuery(
    api.posts.getPostsPaginated,
    {
      categoryId,
      sortBy,
      freeOnly,
    },
    { initialNumItems: 20 },
  );

  const { results: posts, status, loadMore } = paginatedQuery;

  // Get all posts from paginated results
  const allPosts = useMemo(() => {
    return posts ?? [];
  }, [posts]) as
    | Array<{
        _id: Id<"posts">;
        title: string;
        content: string;
        preview?: string;
        isFree?: boolean;
        slug: string;
        createdAt: number;
        updatedAt: number;
        memberId: Id<"members">;
        categoryId: Id<"categories">;
        status: "active" | "deleted" | "hidden" | "archived";
        upvotes: number;
        downvotes: number;
        netVotes: number;
        commentCount: number;
        viewCount: number;
        isPinned?: boolean;
        isLocked?: boolean;
        editedAt?: number;
        type?: "text" | "image" | "video" | "link" | "poll";
        pollOptions?: Array<{
          id: string;
          text: string;
          voteCount: number;
        }>;
        pollEndsAt?: number;
        totalPollVotes?: number;
        mediaUrl?: string;
        thumbnailUrl?: string;
        aspectRatio?: number;
        mediaWidth?: number;
        mediaHeight?: number;
        linkUrl?: string;
        linkTitle?: string;
        linkDescription?: string;
        linkImage?: string;
        attachments?: Array<{
          id: string;
          type: "image" | "video" | "pdf" | "youtube";
          url: string;
          thumbnailUrl?: string;
          width?: number;
          height?: number;
          aspectRatio?: number;
          order: number;
          pageCount?: number;
          fileSize?: number;
          videoId?: string;
          title?: string;
          duration?: string;
          channelName?: string;
          videoDuration?: string;
          format?: string;
          resolution?: string;
          codec?: string;
        }>;
        member: {
          _id: Id<"members">;
          firstName: string;
          lastName: string;
          email: string;
          username: string;
          slug: string;
        } | null;
        category: {
          _id: Id<"categories">;
          name: string;
          displayName: string;
          icon?: string;
        } | null;
      }>
    | undefined
    | null;

  // Extract post IDs for batch vote fetching
  const postIds = useMemo(
    () => allPosts?.map((post) => post._id) ?? [],
    [allPosts],
  );

  // Batch fetch all votes at once
  const { votes } = useUserVotes(postIds, "post");

  // Loading state
  if (status === "LoadingFirstPage") {
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

  // Show an error message if the query failed (Convex returns `null` on error)
  if (posts === null) {
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

  // Empty state – show only after the first page has finished loading and returned an empty array
  if (Array.isArray(posts) && posts.length === 0) {
    return (
      <div className="space-y-2">
        <div className="bg-card border-border/50 rounded-none border p-6 text-center">
          <p className="text-muted-foreground">
            No posts found. Be the first to create one!
          </p>
        </div>
      </div>
    );
  }

  const handleLoadMore = async () => {
    try {
      await loadMore(20);
    } catch (error) {
      console.error("Failed to load more posts:", error);
      // The error will be handled by the query status
    }
  };

  return (
    <div className="space-y-2">
      {allPosts?.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          size="small"
          currentCategoryId={currentCategoryId}
          userVote={votes[post._id] || null}
        />
      ))}

      {/* Load More Button */}
      {status === "CanLoadMore" && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            size="sm"
            className="min-w-[120px]"
          >
            Load More
          </Button>
        </div>
      )}

      {/* Loading More Indicator */}
      {status === "LoadingMore" && (
        <div className="flex justify-center pt-4">
          <Button
            disabled
            variant="outline"
            size="sm"
            className="min-w-[120px]"
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
      )}

      {/* End of Posts Indicator */}
      {status === "Exhausted" && allPosts && allPosts.length > 0 && (
        <div className="py-4 text-center">
          <p className="text-muted-foreground text-sm">
            You&apos;ve reached the end
          </p>
        </div>
      )}
    </div>
  );
}
