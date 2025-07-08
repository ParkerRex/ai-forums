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
import PostDetail from "@/components/post-detail";
import { MembershipCTAModal } from "@/components/membership-cta-modal";
import { PostEditModal } from "@/components/post-edit-modal";
import { PostDeleteModal } from "@/components/post-delete-modal";
import { PostHistoryModal } from "@/components/post-history-modal";
import { ReactivateBannerInline } from "@/components/reactivate-banner-inline";
import { Button } from "@/components/ui/button";
import { Lock, Eye, MessageSquare } from "lucide-react";
import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import CommentSection from "@/components/comment-section";
import { use, useState, useEffect } from "react";
import { notFound, useSearchParams, useRouter } from "next/navigation";

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
    setIsEditModalOpen(true);
  };

  /** Open the delete confirmation modal */
  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  /** Open the post history modal */
  const handleViewHistory = () => {
    setIsHistoryModalOpen(true);
  };

  /** Handle successful post edit - refresh data without full page reload */
  const handleEditSuccess = () => {
    router.refresh();
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4"></div>
          <div className="h-4 bg-muted rounded mb-2"></div>
          <div className="h-4 bg-muted rounded mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
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
      <ReactivateBannerInline />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Authenticated User Experience - Full access to posts and interactions */}
      <Authenticated>
        {/* Full post detail with all interactive features */}
        <PostDetail
          post={post}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewHistory={handleViewHistory}
        />

        {/* Comment section with deep linking support */}
        <CommentSection
          postId={post._id as Id<"posts">}
          targetCommentId={commentId ?? undefined}
        />

        {/* Post Management Modals - Only available to authenticated users */}
        {post && (
          <>
            <PostEditModal
              post={post}
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              onSuccess={handleEditSuccess}
            />
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
      </Authenticated>

      {/* Unauthenticated User Experience - Preview with membership CTA */}
      <Unauthenticated>
        {/* Limited preview to encourage membership signup */}
        <div className="space-y-6">
          {/* Post Header - Same as authenticated but no interaction */}
          <div className="border-b pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {post.category?.displayName || "General"}
                </span>
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-4">
              {post.title}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>
                by {post.member?.firstName} {post.member?.lastName}
              </span>
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>{post.upvotes} upvotes</span>
            </div>
          </div>

          {/* Preview Content - Truncated to encourage signup */}
          <div className="prose prose-lg max-w-none">
            <div className="text-muted-foreground leading-relaxed">
              {/* Show first 200 characters as teaser */}
              {post.content?.substring(0, 200)}...
            </div>
          </div>

          {/* Membership CTA - Conversion-focused design */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Join to Read Full Post
            </h3>
            <p className="text-muted-foreground mb-4">
              Get access to the complete discussion and join the conversation
            </p>

            {/* Feature highlights to encourage signup */}
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                Full content access
              </div>
              <div className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-1" />
                {post.commentCount} comments
              </div>
            </div>

            {/* Membership signup modal trigger */}
            <MembershipCTAModal
              title="Unlock Full Post Access"
              description="Join VAI to read complete posts and engage with the AI community"
            >
              <Button className="px-8">Join to Continue Reading</Button>
            </MembershipCTAModal>
          </div>

          {/* Action Buttons - Disabled to show what's available after signup */}
          <div className="flex items-center space-x-4 pt-6 border-t">
            <Button variant="outline" disabled className="opacity-50">
              👍 {post.upvotes}
            </Button>
            <Button variant="outline" disabled className="opacity-50">
              💬 {post.commentCount}
            </Button>
            <Button variant="outline" disabled className="opacity-50">
              Share
            </Button>
          </div>
        </div>
      </Unauthenticated>
      </div>
    </>
  );
}
