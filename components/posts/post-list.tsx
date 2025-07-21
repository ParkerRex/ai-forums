"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import PostCard from "@/components/posts/post-card";

interface PostListProps {
  categoryId?: Id<"categories">;
  sortBy?: "newest" | "popular" | "trending";
  freeOnly?: boolean;
  currentCategoryId?: Id<"categories">;
}

export default function PostList({ categoryId, sortBy = "newest", freeOnly = false, currentCategoryId }: PostListProps) {
  const posts = useQuery(api.posts.getPosts, {
    categoryId,
    limit: 20,
    sortBy,
    freeOnly,
  }) as Array<{
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
  }> | undefined | null;

  // Loading state
  if (posts === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border/50 rounded p-3">
            <div className="animate-pulse">
              <div className="flex space-x-4">
                <div className="rounded-full bg-muted h-10 w-10"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (posts === null) {
    return (
      <div className="space-y-2">
        <div className="bg-card border border-border/50 rounded-none p-6 text-center">
          <p className="text-muted-foreground">Unable to load posts. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="space-y-2">
        <div className="bg-card border border-border/50 rounded-none p-6 text-center">
          <p className="text-muted-foreground">No posts found. Be the first to create one!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <PostCard key={post._id} post={post} size="small" currentCategoryId={currentCategoryId} />
      ))}
    </div>
  );
}
