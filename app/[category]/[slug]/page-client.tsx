/**
 * Post Page Client Component
 *
 * Complex client component that handles individual post display with full interactivity.
 * Manages authentication states, modal interactions, post validation, and comments.
 *
 * Features:
 * - Dual authentication UI (authenticated vs unauthenticated views)
 * - Modal management (edit, delete, history)
 * - Post data loading via React Query
 * - Comment section with deep linking
 * - Navigation with animated back button
 * - Error handling and graceful redirects
 *
 * @see PostPage - Client component that handles routing
 */

"use client";

import { notFound, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Authenticated, Unauthenticated } from "@/components/auth-wrappers";
import CommentSection from "@/components/comments/comment-section-flat";
import { PostDeleteModal } from "@/components/posts/post-delete-modal";
import PostDetail from "@/components/posts/post-detail";
import { PostHistoryModal } from "@/components/posts/post-history-modal";
import { Badge } from "@/components/ui/badge";
import { usePostBySlug } from "@/hooks/use-posts";

/**
 * Props for the PostPageClient component
 *
 * Contains both category and slug for nested dynamic routing,
 * and route params from Next.js.
 */
interface PostPageClientProps {
  /** Route params provided by Next.js */
  params: {
    category: string;
    slug: string;
  };
}

/**
 * Post Page Client Component
 *
 * Renders individual post pages with full interactivity and dual authentication states.
 * @param params - Promise containing the dynamic route parameters
 * @returns JSX element rendering the post page with authentication-specific content
 */
export default function PostPageClient({ params }: PostPageClientProps) {
  const router = useRouter();
  const { category, slug } = params;

  // Get search params for comment deep linking
  const searchParams = useSearchParams();
  const commentId = searchParams.get("commentId");

  // Modal states for post management actions
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Validate URL parameters to prevent invalid queries
  // Both category and slug must be non-empty strings
  const hasValidParams =
    category &&
    slug &&
    typeof category === "string" &&
    category.trim() !== "" &&
    typeof slug === "string" &&
    slug.trim() !== "";

  const {
    data: post,
    isLoading: isPostLoading,
    isError,
  } = usePostBySlug(hasValidParams ? slug : "");

  // Modal event handlers for post management actions

  /** Open the edit modal */
  const handleEdit = () => {
    setIsEditing(true);
  };

  /** Open the delete confirmation modal */
  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  /** Open the post history modal */
  const handleViewHistory = () => {
    setIsHistoryModalOpen(true);
  };

  /** Handle cancel edit - exit edit mode */
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  /** Handle successful post deletion - navigate back to home page */
  const handleDeleteSuccess = () => {
    router.push("/");
  };

  // Handle post deletion redirect
  // If the post no longer exists (e.g., it was just deleted), redirect the
  // user to the home page instead of showing a 404. We still show a 404 for
  // mismatched categories (malformed URL).
  useEffect(() => {
    if (post === null && !isPostLoading) {
      router.replace("/");
    }
  }, [post, isPostLoading, router]);

  // Early return for invalid URL parameters
  // Show user-friendly error message instead of breaking the app
  if (!hasValidParams) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <h1 className="text-foreground mb-4 text-2xl font-bold">Invalid URL</h1>
          <p className="text-muted-foreground">The URL format is invalid.</p>
        </div>
      </div>
    );
  }

  // Show loading skeleton while fetching post data
  if (isPostLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Post header skeleton */}
        <div className="mb-6">
          {/* Category badge and metadata */}
          <div className="mb-4 flex items-center gap-2">
            <div className="bg-muted h-6 w-20 animate-pulse rounded-full" />
            <div className="bg-muted h-4 w-48 animate-pulse rounded-sm" />
          </div>

          {/* Post title */}
          <div className="bg-muted mb-4 h-10 animate-pulse rounded-sm" />

          {/* Author and voting section */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-muted h-10 w-10 animate-pulse rounded-full" />
              <div>
                <div className="bg-muted mb-2 h-4 w-32 animate-pulse rounded-sm" />
                <div className="bg-muted h-3 w-24 animate-pulse rounded-sm" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-muted h-8 w-8 animate-pulse rounded-sm" />
              <div className="bg-muted h-6 w-12 animate-pulse rounded-sm" />
            </div>
          </div>
        </div>

        {/* Post content skeleton */}
        <div className="mb-8 space-y-4">
          <div className="bg-muted h-4 animate-pulse rounded-sm" />
          <div className="bg-muted h-4 animate-pulse rounded-sm" />
          <div className="bg-muted h-4 w-5/6 animate-pulse rounded-sm" />
          <div className="bg-muted my-6 h-32 animate-pulse rounded-sm" />
          <div className="bg-muted h-4 animate-pulse rounded-sm" />
          <div className="bg-muted h-4 w-4/5 animate-pulse rounded-sm" />
          <div className="bg-muted h-4 animate-pulse rounded-sm" />
        </div>

        {/* Action buttons skeleton */}
        <div className="mb-8 flex items-center justify-between border-b border-t py-4">
          <div className="flex items-center space-x-4">
            <div className="bg-muted h-9 w-20 animate-pulse rounded-sm" />
            <div className="bg-muted h-9 w-24 animate-pulse rounded-sm" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-muted h-9 w-9 animate-pulse rounded-sm" />
            <div className="bg-muted h-9 w-9 animate-pulse rounded-sm" />
          </div>
        </div>

        {/* Comments section skeleton */}
        <div>
          <div className="bg-muted mb-4 h-6 w-32 animate-pulse rounded-sm" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-none border p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                  <div className="flex-1">
                    <div className="bg-muted mb-2 h-4 w-24 animate-pulse rounded-sm" />
                    <div className="bg-muted mb-1 h-3 animate-pulse rounded-sm" />
                    <div className="bg-muted h-3 w-4/5 animate-pulse rounded-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Handle post not found - redirect instead of showing 404
  // If the post no longer exists (e.g., it was just deleted), redirect the
  // user to the home page instead of showing a 404. We still show a 404 for
  // mismatched categories (malformed URL).
  if (!post || isError) {
    // The redirection will run in the effect; render nothing meanwhile.
    return null;
  }

  // Validate category/slug consistency
  // Show 404 for a category/slug mismatch where the post exists but the
  // category in the URL is wrong (indicates malformed or outdated URL)
  if (post.category?.name !== category) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Authenticated User Experience */}
      <Authenticated>
        {/* Full post detail with all interactive features */}
        <PostDetail
          post={post}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewHistory={handleViewHistory}
          isEditing={isEditing}
          onCancelEdit={handleCancelEdit}
        />

        {/* Comment section with deep linking support */}
        <CommentSection postId={post.id} targetCommentId={commentId ?? undefined} />

        {/* Post Management Modals - Only available to authenticated users */}
        {post && (
          <>
            <PostDeleteModal
              postId={post.id}
              postTitle={post.title}
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onSuccess={handleDeleteSuccess}
            />
            <PostHistoryModal
              postId={post.id}
              isOpen={isHistoryModalOpen}
              onClose={() => setIsHistoryModalOpen(false)}
            />
          </>
        )}
      </Authenticated>

      {/* Unauthenticated User Experience - Prompt to sign in */}
      <Unauthenticated>
        <div className="space-y-6">
          {/* Post Header Preview */}
          <div className="border-b pb-6">
            <div className="mb-4 flex items-center space-x-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {post.category?.displayName || "General"}
              </Badge>
            </div>
            <h1 className="mb-4 text-3xl font-bold">{post.title}</h1>
            <div className="text-muted-foreground flex items-center space-x-4 text-sm">
              <span>
                by {post.member?.firstName} {post.member?.lastName}
              </span>
              <span>-</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Sign In Prompt */}
          <div className="rounded-lg border bg-muted/50 p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold">Sign in to view this post</h2>
            <p className="text-muted-foreground mb-4">
              Join our community to access all content and discussions.
            </p>
            <a
              href="/sign-in"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-8 text-sm font-medium"
            >
              Sign In
            </a>
            <p className="text-muted-foreground mt-4 text-sm">
              Don&apos;t have an account?{" "}
              <a href="/sign-up" className="text-primary hover:underline">
                Sign up for free
              </a>
            </p>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
