import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Id } from "@/web/convex/_generated/dataModel";

interface PostAnalytics {
  viewCount: number;
  activeReaders: number;
  bookmarkCount: number;
  readingTime: number;
  relatedPostsCount: number;
}

export function usePostAnalytics(postId?: Id<"posts">): PostAnalytics | null {
  // TODO: Implement these API endpoints when analytics module is ready
  // For now, return simulated data

  // Get view count for the post
  // const analytics = useQuery(
  //   api.analytics.getPostAnalytics,
  //   postId ? { postId } : "skip"
  // );

  // Get active readers (users who viewed in last 5 minutes)
  // const activeReaders = useQuery(
  //   api.analytics.getActiveReaders,
  //   postId ? { postId } : "skip"
  // );

  // Get bookmark count
  // const bookmarkCount = useQuery(
  //   api.bookmarks.getBookmarkCount,
  //   postId ? { targetId: postId, targetType: "post" as const } : "skip"
  // );

  // Get related posts count
  // const relatedPosts = useQuery(
  //   api.posts.getRelatedPosts,
  //   postId ? { postId, limit: 50 } : "skip"
  // );

  // Return simulated data for now
  if (!postId) {
    return null;
  }

  const simulated = useSimulatedAnalytics();
  return simulated;
}

// Hook for simulated/demo analytics (for development)
export function useSimulatedAnalytics() {
  // Simulate realistic view counts
  const baseViews = Math.floor(Math.random() * 2000) + 500;
  const activeReaders = Math.floor(Math.random() * 20) + 5;

  return {
    viewCount: baseViews,
    activeReaders,
    bookmarkCount: Math.floor(baseViews * 0.15), // ~15% bookmark rate
    readingTime: Math.floor(Math.random() * 8) + 3, // 3-10 min
    relatedPostsCount: Math.floor(Math.random() * 50) + 20,
  };
}
