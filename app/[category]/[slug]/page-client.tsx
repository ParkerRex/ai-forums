/**
 * Post Page Client Component
 *
 * Complex client component that handles individual post display with full interactivity.
 * Manages authentication states, modal interactions, post validation, and comments.
 *
 * Features:
 * - Dual authentication UI (authenticated vs unauthenticated views)
 * - Modal management (edit, delete, history)
 * - Post validation and category matching
 * - Comment section with deep linking
 * - Navigation with animated back button
 * - Responsive loading states
 * - Error handling and graceful redirects
 *
 * @see PostPage - Server component that handles SEO and routing
 */

"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import PostDetail from "@/components/posts/post-detail";
import { PostDeleteModal } from "@/components/posts/post-delete-modal";
import { PostHistoryModal } from "@/components/posts/post-history-modal";

import { PostPaywallDirect } from "@/components/posts/post-paywall-direct";
import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import CommentSection from "@/components/comments/comment-section-flat";
import { use, useState, useEffect } from "react";
import { notFound, useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

/**
 * Props for the PostPageClient component
 *
 * Contains both category and slug for nested dynamic routing
 * and post validation against the URL structure.
 */
interface PostPageClientProps {
  /** Promise containing the dynamic route parameters */
  params: Promise<{
    /** The category name from the URL path */
    category: string;
    /** The post slug from the URL path */
    slug: string;
  }>;
}

/**
 * Post Page Client Component
 *
 * Renders individual post pages with full interactivity and dual authentication states.
 * Handles complex post validation, modal management, and comment deep linking.
 *
 * @param params - Promise containing the dynamic route parameters
 * @returns JSX element rendering the post page with authentication-specific content
 *
 * @example
 * // Used by server component:
 * <PostPageClient params={Promise.resolve({ category: "workflows", slug: "automate-content" })} />
 */
export default function PostPageClient({ params }: PostPageClientProps) {
  const router = useRouter();

  // Unwrap the params promise using React's use() hook (Next.js 15 behavior)
  const resolvedParams = use(params);
  const { category, slug } = resolvedParams;

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

  // Query for the post by slug from Convex database
  // Uses conditional query - skips if parameters are invalid
  const post = useQuery(
    api.posts.getPostBySlug,
    hasValidParams ? { slug } : "skip",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;

  // Query to check if the current user can view the full content
  const canViewPost = useQuery(
    api.posts.canUserViewPost,
    post?._id ? { postId: post._id } : "skip",
  );

  // Debug logging for development (consider removing in production)
  console.log(
    "PostPageClient - category:",
    category,
    "slug:",
    slug,
    "hasValidParams:",
    hasValidParams,
  );

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
    if (post === null) {
      router.replace("/");
    }
  }, [post, router]);

  // Early return for invalid URL parameters
  // Show user-friendly error message instead of breaking the app
  if (!hasValidParams) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <h1 className="text-foreground mb-4 text-2xl font-bold">
            Invalid URL
          </h1>
          <p className="text-muted-foreground">The URL format is invalid.</p>
        </div>
      </div>
    );
  }

  // Show loading skeleton while fetching post data
  // In Convex, undefined means loading, null means not found
  if (post === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Post header skeleton */}
        <div className="mb-6">
          {/* Category badge and metadata */}
          <div className="mb-4 flex items-center gap-2">
            <div className="bg-muted h-6 w-20 animate-pulse rounded-full" />
            <div className="bg-muted h-4 w-48 animate-pulse rounded" />
          </div>

          {/* Post title */}
          <div className="bg-muted mb-4 h-10 animate-pulse rounded" />

          {/* Author and voting section */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-muted h-10 w-10 animate-pulse rounded-full" />
              <div>
                <div className="bg-muted mb-2 h-4 w-32 animate-pulse rounded" />
                <div className="bg-muted h-3 w-24 animate-pulse rounded" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-muted h-8 w-8 animate-pulse rounded" />
              <div className="bg-muted h-6 w-12 animate-pulse rounded" />
            </div>
          </div>
        </div>

        {/* Post content skeleton */}
        <div className="mb-8 space-y-4">
          <div className="bg-muted h-4 animate-pulse rounded" />
          <div className="bg-muted h-4 animate-pulse rounded" />
          <div className="bg-muted h-4 w-5/6 animate-pulse rounded" />
          <div className="bg-muted my-6 h-32 animate-pulse rounded" />
          <div className="bg-muted h-4 animate-pulse rounded" />
          <div className="bg-muted h-4 w-4/5 animate-pulse rounded" />
          <div className="bg-muted h-4 animate-pulse rounded" />
        </div>

        {/* Action buttons skeleton */}
        <div className="mb-8 flex items-center justify-between border-b border-t py-4">
          <div className="flex items-center space-x-4">
            <div className="bg-muted h-9 w-20 animate-pulse rounded" />
            <div className="bg-muted h-9 w-24 animate-pulse rounded" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-muted h-9 w-9 animate-pulse rounded" />
            <div className="bg-muted h-9 w-9 animate-pulse rounded" />
          </div>
        </div>

        {/* Comments section skeleton */}
        <div>
          <div className="bg-muted mb-4 h-6 w-32 animate-pulse rounded" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                  <div className="flex-1">
                    <div className="bg-muted mb-2 h-4 w-24 animate-pulse rounded" />
                    <div className="bg-muted mb-1 h-3 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-4/5 animate-pulse rounded" />
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
  if (post === null) {
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
    <>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* Authenticated User Experience */}
        <Authenticated>
          {canViewPost === undefined ? (
            // Loading state while checking access
            <div className="animate-pulse space-y-4">
              <div className="bg-muted h-8 w-3/4 rounded" />
              <div className="bg-muted h-4 w-full rounded" />
              <div className="bg-muted h-4 w-full rounded" />
              <div className="bg-muted h-4 w-2/3 rounded" />
            </div>
          ) : canViewPost === true ? (
            <>
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
              <CommentSection
                postId={post._id as Id<"posts">}
                targetCommentId={commentId ?? undefined}
              />

              {/* Post Management Modals - Only available to authenticated users */}
              {post && (
                <>
                  <PostDeleteModal
                    postId={post._id as Id<"posts">}
                    postTitle={post.title}
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onSuccess={handleDeleteSuccess}
                  />
                  <PostHistoryModal
                    postId={post._id as Id<"posts">}
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                  />
                </>
              )}
            </>
          ) : (
            // Authenticated user without access - show paywall
            <div className="space-y-6">
              {/* Post Header */}
              <div className="border-b pb-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary"
                    >
                      {post.category?.displayName || "General"}
                    </Badge>
                  </div>
                </div>
                <h1 className="mb-4 text-3xl font-bold">{post.title}</h1>
                <div className="text-muted-foreground flex items-center space-x-4 text-sm">
                  <span>
                    by {post.member?.firstName} {post.member?.lastName}
                  </span>
                  <span>•</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{post.upvotes} upvotes</span>
                </div>
              </div>

              {/* Preview Content with Paywall */}
              <div className="relative">
                <div className="prose prose-lg post-content max-w-none">
                  <div className="text-foreground leading-relaxed">
                    {/* Show preview if available, otherwise fallback to truncated content */}
                    {post.preview || post.content?.substring(0, 200) + "..."}
                  </div>
                </div>

                {/* Direct Paywall */}
                <PostPaywallDirect postId={post._id} postTitle={post.title} />
              </div>
            </div>
          )}
        </Authenticated>

        {/* Unauthenticated User Experience - Preview with membership CTA */}
        <Unauthenticated>
          {post.isFree ? (
            // Free posts show full content for everyone
            <>
              <PostDetail
                post={post}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewHistory={handleViewHistory}
                isEditing={isEditing}
                onCancelEdit={handleCancelEdit}
              />
              <CommentSection
                postId={post._id as Id<"posts">}
                targetCommentId={commentId ?? undefined}
              />
            </>
          ) : (
            // Paywalled posts show preview with overlay
            <div className="space-y-6">
              {/* Post Header - Same as authenticated but no interaction */}
              <div className="border-b pb-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary"
                    >
                      {post.category?.displayName || "General"}
                    </Badge>
                  </div>
                </div>
                <h1 className="mb-4 text-3xl font-bold">{post.title}</h1>
                <div className="text-muted-foreground flex items-center space-x-4 text-sm">
                  <span>
                    by {post.member?.firstName} {post.member?.lastName}
                  </span>
                  <span>•</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{post.upvotes} upvotes</span>
                </div>
              </div>

              {/* Preview Content with Overlay */}
              <div className="relative">
                <div className="prose prose-lg post-content max-w-none">
                  <div className="text-foreground leading-relaxed">
                    {/* Show preview if available, otherwise fallback to truncated content */}
                    {post.preview || post.content?.substring(0, 200) + "..."}
                  </div>
                </div>

                {/* Direct Paywall */}
                <PostPaywallDirect postId={post._id} postTitle={post.title} />
              </div>
            </div>
          )}
        </Unauthenticated>
      </div>
    </>
  );
}
