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
              <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
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

            {/* Premium Membership CTA - High-quality conversion design */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/3 to-accent/5 border border-primary/20 shadow-xl">
              {/* Subtle background pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.02] to-transparent opacity-50" />

              <div className="relative p-8 text-center">
                {/* Premium icon with gradient background */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                    <Lock className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>

                {/* Premium heading and description */}
                <div className="space-y-3 mb-8">
                  <h3 className="text-2xl font-bold text-foreground">
                    Unlock Full Post Access
                  </h3>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    Join the elite AI community and access exclusive insights
                    from industry leaders
                  </p>
                </div>

                {/* Value proposition highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-background/50 border border-primary/10">
                    <Eye className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Full Content Access
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-background/50 border border-primary/10">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {post.commentCount} Expert Comments
                    </span>
                  </div>
                </div>

                {/* Premium CTA button */}
                <MembershipCTAModal
                  title="Unlock Full Post Access"
                  description="Join VAI to read complete posts and engage with the AI community"
                  source="post-paywall"
                >
                  <Button
                    size="lg"
                    className="h-12 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Lock className="w-5 h-5 mr-2" />
                    Join VAI Pro
                  </Button>
                </MembershipCTAModal>

                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>Members from</span>
                    <div className="flex items-center gap-2">
                      {/* Microsoft logo */}
                      <svg className="w-4 h-4" viewBox="0 0 23 23" fill="none">
                        <path d="M11 11V0H0v11h11z" fill="#f25022" />
                        <path d="M23 11V0H12v11h11z" fill="#7fba00" />
                        <path d="M11 23V12H0v11h11z" fill="#00a4ef" />
                        <path d="M23 23V12H12v11h11z" fill="#ffb900" />
                      </svg>
                      {/* Google logo */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285f4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34a853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#fbbc05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#ea4335"
                        />
                      </svg>
                    </div>
                  </div>
                  <span>•</span>
                  <span>30-day guarantee</span>
                  <span>•</span>
                  <span>Cancel anytime</span>
                </div>
              </div>
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
