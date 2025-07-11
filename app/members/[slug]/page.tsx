"use client";

/**
 * @fileoverview Individual Member Profile Page
 * 
 * This page displays detailed information about a specific member, including:
 * - Complete member profile with avatar, bio, and social links
 * - Member's posts with full PostCard components
 * - Recent activity (comments) with links to original posts
 * - Personal bookmarks (only visible to the member themselves)
 * - Progressive loading for each section independently
 * 
 * The page uses dynamic routing with member slugs for SEO-friendly URLs.
 * It implements comprehensive error handling and loading states for each
 * data section to provide optimal user experience.
 * 
 * Features:
 * - Dynamic slug-based routing (/members/[slug])
 * - Progressive loading with independent sections
 * - Privacy-aware bookmark display
 * - Error boundaries for resilient UI
 * - Back navigation with animated icon
 * - Responsive design for all screen sizes
 * 
 * @author VAI Development Team
 * @version 1.0.0
 */

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/arrow-left";
import React from "react";
import MemberProfile from "@/components/member-profile";
import PostCard from "@/components/post-card";
import {
  MemberProfileSkeleton,
  PostSkeletonList,
  ActivitySkeletonList,
} from "@/components/member-skeleton";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { use } from "react";
import {
  PageErrorBoundary,
  QueryErrorBoundary,
} from "@/components/error-boundary";

/**
 * Props interface for the MemberDetailPage component.
 * 
 * Uses Next.js 13+ dynamic routing where params are passed as a Promise.
 * The slug parameter is extracted from the URL path.
 * 
 * @interface PageProps
 * @property {Promise<{ slug: string }>} params - Promise containing route parameters
 */
interface PageProps {
  params: Promise<{ slug: string }>; // Next.js 13+ dynamic routing params
}

/**
 * Main content component for individual member profile pages.
 * 
 * Handles fetching and displaying member data, posts, activity, and bookmarks.
 * Implements progressive loading where each section loads independently to
 * provide better user experience and avoid blocking the entire page.
 * 
 * @component
 * @param {object} props - Component props
 * @param {string} props.slug - Member's URL slug for data fetching
 * @returns {JSX.Element} The complete member profile page content
 * 
 * @example
 * ```tsx
 * <MemberDetailContent slug="john-doe" />
 * ```
 */
function MemberDetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  // Ref for the animated back arrow icon - allows manual control of animation
  const backIconRef = React.useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);

  // Fetch member data from Convex using slug - primary data source
  const memberData = useQuery(api.members.getMemberBySlug, { slug });

  // Fetch member posts from Convex (only if member data is loaded)
  // This conditional approach prevents unnecessary API calls and errors
  const memberPostsData = useQuery(
    api.members.getMemberPosts,
    memberData
      ? {
          memberId: memberData._id,
          paginationOpts: { numItems: 10, cursor: null }, // Get first 10 posts for performance
        }
      : "skip", // Skip query if member data not loaded yet
  );

  // Fetch member activity from Convex (only if member data is loaded)
  // Activity includes comments and other engagement metrics
  const memberActivityData = useQuery(
    api.members.getMemberActivity,
    memberData
      ? {
          memberId: memberData._id,
          paginationOpts: { numItems: 10, cursor: null }, // Get first 10 activities
        }
      : "skip", // Skip query if member data not loaded yet
  );

  // Fetch member bookmarks (only if viewing own profile)
  // Privacy protection: only show bookmarks to the member themselves
  const currentMember = useQuery(api.members.getCurrentMember);
  const isOwnProfile = currentMember && memberData && currentMember._id === memberData._id;
  const memberBookmarksData = useQuery(
    api.bookmarks.getUserBookmarks,
    isOwnProfile ? {
      paginationOpts: { numItems: 5, cursor: null } // Show fewer bookmarks in preview
    } : "skip", // Skip for privacy if not own profile
  );

  // Member not found (only check this after data has loaded)
  // null means the query completed but no member was found
  if (memberData === null) {
    notFound(); // Trigger Next.js 404 page
  }

  // Progressive loading states for independent section loading
  // This allows each section to load independently without blocking others
  const isMemberLoading = memberData === undefined;
  const arePostsLoading = memberPostsData === undefined;
  const isActivityLoading = memberActivityData === undefined;

  // Minimal transformation using server-computed data
  // Transform Convex data structure to match MemberProfile component interface
  const member = memberData
    ? {
        id: memberData._id, // Convert Convex _id to generic id
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        email: memberData.email,
        status: memberData.status, // Member status: active, churned, or free
        joinedDate: memberData.joinedDateFormatted, // Use server-formatted date for consistency
        country: memberData.country,
        updatedAt: new Date(memberData.updatedAt).toISOString().split("T")[0], // Convert to YYYY-MM-DD format
        bio: memberData.bio,
        lastOnline: memberData.lastOnlineFormatted, // Use server-formatted date
        initials: memberData.initials, // Use server-computed initials for consistency
        linkGithub: memberData.linkGithub,
        linkX: memberData.linkX,
        linkYouTube: memberData.linkYouTube,
        location: memberData.location,
        // Enhanced member profile fields
        avatarUrl: memberData.avatarUrl,
        websiteUrl: memberData.websiteUrl,
        linkedinUrl: memberData.linkedinUrl,
        skills: memberData.skills || [], // Ensure skills is always an array
        // Include slug for potential future routing needs
        slug: memberData.slug,
        // Subscription fields
        tier: memberData.tier,
        subscriptionStatus: memberData.subscriptionStatus,
        subscriptionEndDate: memberData.subscriptionEndDate,
        billingInterval: memberData.billingInterval,
      }
    : null;

  // Transform posts data to match PostCard interface
  // PostCard expects the standard post structure from the API
  const memberPosts = memberPostsData?.page || [];

  // Transform activity data for UI display
  // Activity represents member engagement (comments, votes, etc.)
  const memberActivity =
    memberActivityData?.page?.map((activity) => ({
      id: activity._id,
      type: "comment" as const, // Currently only showing comments in activity
      content: activity.content,
      timeAgo: activity.timeAgo, // Server-computed relative time
      postId: activity.postId,
      postTitle: activity.post?.title || "Unknown Post", // Fallback for deleted posts
      netVotes: activity.netVotes, // Vote score for the comment
    })) || [];

  // Main render - comprehensive member profile page
  return (
    <div className="font-mono min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Back Navigation with animated icon */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()} // Use browser back for better UX
          className="mb-6"
          onMouseEnter={() => backIconRef.current?.startAnimation()}
          onMouseLeave={() => backIconRef.current?.stopAnimation()}
        >
          <ArrowLeftIcon ref={backIconRef} size={16} className="mr-2" />
          Back
        </Button>

        {/* Member Profile Section - Progressive Loading */}
        {/* This section loads independently to avoid blocking the entire page */}
        {isMemberLoading ? (
          <MemberProfileSkeleton />
        ) : member ? (
          <MemberProfile member={member} />
        ) : null}

        {/* Posts Section - Independent Loading */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            {/* Dynamic title based on member data availability */}
            {member ? `Posts by ${member.firstName}` : "Posts by Member"}
          </h2>

          {/* Error boundary for resilient post loading */}
          <QueryErrorBoundary context="loading member posts">
            {arePostsLoading ? (
              <PostSkeletonList count={3} />
            ) : memberPosts.length > 0 ? (
              <div className="space-y-6">
                {memberPosts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            ) : (
              /* Empty state for members with no posts */
              <div className="text-center py-8">
                <p className="text-muted-foreground">No posts yet.</p>
                <p className="text-sm text-muted-foreground opacity-80 mt-2">
                  {member?.firstName || "This member"} hasn&apos;t shared any
                  posts with the community yet.
                </p>
              </div>
            )}
          </QueryErrorBoundary>
        </div>

        {/* Activity Section - Independent Loading */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Recent Activity
          </h2>

          {/* Error boundary for resilient activity loading */}
          <QueryErrorBoundary context="loading member activity">
            {isActivityLoading ? (
              <ActivitySkeletonList count={4} />
            ) : memberActivity.length > 0 ? (
              <div className="space-y-4">
                {memberActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-muted border rounded-lg p-4"
                  >
                    {/* Activity content (comment text) */}
                    <p className="text-sm text-foreground">
                      {activity.content}
                    </p>
                    {/* Activity metadata with post link */}
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.timeAgo} on{" "}
                      <span className="text-green-700">
                        {activity.postTitle}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state for members with no activity */
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recent activity.</p>
                <p className="text-sm text-muted-foreground opacity-80 mt-2">
                  {member?.firstName || "This member"} hasn&apos;t commented on
                  any posts recently.
                </p>
              </div>
            )}
          </QueryErrorBoundary>
        </div>

        {/* Bookmarks Section - Only show for own profile (privacy protection) */}
        {isOwnProfile && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                My Bookmarks
              </h2>
              {/* Link to full bookmarks page */}
              <Button variant="outline" size="sm" asChild>
                <Link href="/bookmarks">View All</Link>
              </Button>
            </div>

            {/* Error boundary for resilient bookmark loading */}
            <QueryErrorBoundary context="loading member bookmarks">
              {memberBookmarksData === undefined ? (
                <PostSkeletonList count={3} />
              ) : memberBookmarksData.page.length > 0 ? (
                <div className="space-y-4">
                  {/* Show only first 3 bookmarks as a preview */}
                  {memberBookmarksData.page.slice(0, 3).map((bookmark) => (
                    <PostCard key={bookmark._id} post={bookmark.target} size="small" />
                  ))}
                </div>
              ) : (
                /* Empty state for members with no bookmarks */
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No bookmarks yet.</p>
                  <p className="text-sm text-muted-foreground opacity-80 mt-2">
                    Start bookmarking posts to see them here.
                  </p>
                </div>
              )}
            </QueryErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main Member Detail Page component with error boundary protection.
 * 
 * This is the default export for the dynamic route `/members/[slug]`.
 * It handles the Next.js 13+ Promise-based params and provides error
 * boundary protection for the entire page.
 * 
 * @component
 * @param {PageProps} props - Page props containing route parameters
 * @returns {JSX.Element} The complete member detail page with error handling
 * 
 * @example
 * ```tsx
 * // Used in Next.js routing
 * // app/members/[slug]/page.tsx
 * export default function MemberDetailPage({ params }) { ... }
 * ```
 */
export default function MemberDetailPage({ params }: PageProps) {
  // Unwrap the params Promise using React.use() - Next.js 13+ feature
  const { slug } = use(params);

  return (
    <PageErrorBoundary context="loading member profile">
      <MemberDetailContent slug={slug} />
    </PageErrorBoundary>
  );
}
