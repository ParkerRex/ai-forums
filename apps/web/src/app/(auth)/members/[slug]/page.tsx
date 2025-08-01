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

import { notFound, useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
import { ArrowLeft, Bookmark } from "lucide-react";
import React from "react";
import MemberProfile from "../components/members/member-profile";
import PostCard from "../components/posts/post-card";
import MemberActivityCard from "../components/members/member-activity-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  MemberProfileSkeleton,
  PostSkeletonList,
  ActivitySkeletonList,
} from "../components/members/member-skeleton";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { use } from "react";
import {
  PageErrorBoundary,
  QueryErrorBoundary,
} from "../components/error-boundary";

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
  const [postsCursor, setPostsCursor] = React.useState<string | null>(null);
  const [allPosts, setAllPosts] = React.useState<
    Array<NonNullable<typeof memberPostsData>["page"][number]>
  >([]);

  // Fetch member data from Convex using slug - primary data source
  const memberData = useQuery(api.members.getMemberBySlug, { slug });

  // Fetch member posts from Convex (only if member data is loaded)
  // This conditional approach prevents unnecessary API calls and errors
  const memberPostsData = useQuery(
    api.members.getMemberPosts,
    memberData
      ? {
          memberId: memberData._id,
          paginationOpts: { numItems: 10, cursor: postsCursor }, // Paginated posts loading
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
  const isOwnProfile =
    currentMember && memberData && currentMember._id === memberData._id;
  const memberBookmarksData = useQuery(
    api.bookmarks.getUserBookmarks,
    isOwnProfile
      ? {
          paginationOpts: { numItems: 10, cursor: null }, // Get more bookmarks for tab view
        }
      : "skip", // Skip for privacy if not own profile
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
  const areBookmarksLoading = memberBookmarksData === undefined;

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
        // Stats
        postCount: memberData.postCount,
      }
    : null;

  // Transform posts data to match PostCard interface
  // PostCard expects the standard post structure from the API
  const memberBookmarks = memberBookmarksData?.page || [];

  // Effect to accumulate posts as we paginate
  React.useEffect(() => {
    if (memberPostsData?.page) {
      if (postsCursor === null) {
        // First page, replace all posts
        setAllPosts(memberPostsData.page);
      } else {
        // Subsequent pages, append to existing posts
        setAllPosts((prev) => [...prev, ...memberPostsData.page]);
      }
    }
  }, [memberPostsData, postsCursor]);

  // Reset posts when member changes
  React.useEffect(() => {
    setPostsCursor(null);
    setAllPosts([]);
  }, [slug]);

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
      postSlug: activity.post?.slug,
      categoryName: activity.post?.categoryName,
      netVotes: activity.netVotes, // Vote score for the comment
    })) || [];

  // Use actual post count from member data
  const postCount = member?.postCount || 0;

  // Main render - comprehensive member profile page with Twitter-style layout
  return (
    <div className="bg-background text-foreground mx-auto w-full max-w-4xl">
      <div className="border-border border-x border-b">
        {/* Twitter-style sticky header */}
        <header className="border-border bg-background/80 sticky top-0 z-10 flex items-center justify-between border-b p-2 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {member
                  ? `${member.firstName} ${member.lastName}`
                  : "Loading..."}
              </h1>
              <p className="text-muted-foreground text-sm">{postCount} posts</p>
            </div>
          </div>
        </header>

        <main>
          {/* Member Profile Section - Progressive Loading */}
          {isMemberLoading ? (
            <MemberProfileSkeleton />
          ) : member ? (
            <MemberProfile member={member} />
          ) : null}

          {/* Tabbed Content Section */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="border-border grid w-full grid-cols-3 rounded-none border-b">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="posts">
              <QueryErrorBoundary context="loading member posts">
                {arePostsLoading && postsCursor === null ? (
                  <PostSkeletonList count={3} />
                ) : allPosts.length > 0 ? (
                  <>
                    <div className="divide-border divide-y">
                      {allPosts.map((post) => (
                        <div key={post._id} className="p-4">
                          <PostCard post={post} />
                        </div>
                      ))}
                    </div>
                    {/* Load More Button */}
                    {memberPostsData && !memberPostsData.isDone && (
                      <div className="border-border border-t p-4 text-center">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setPostsCursor(memberPostsData.continueCursor)
                          }
                          disabled={arePostsLoading}
                        >
                          {arePostsLoading ? "Loading..." : "Load More Posts"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground p-4 text-center">
                    No posts yet.
                  </div>
                )}
              </QueryErrorBoundary>
            </TabsContent>

            {/* Recent Activity Tab */}
            <TabsContent value="recent-activity">
              <QueryErrorBoundary context="loading member activity">
                {isActivityLoading ? (
                  <ActivitySkeletonList count={4} />
                ) : memberActivity.length > 0 ? (
                  <>
                    <div className="divide-border divide-y">
                      {memberActivity.map((activity) => (
                        <div key={activity.id} className="p-4">
                          <MemberActivityCard
                            activity={activity}
                            size="medium"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground p-4 text-center">
                    No recent activity.
                  </div>
                )}
              </QueryErrorBoundary>
            </TabsContent>

            {/* Bookmarks Tab */}
            <TabsContent value="bookmarks">
              {isOwnProfile ? (
                <QueryErrorBoundary context="loading member bookmarks">
                  {areBookmarksLoading ? (
                    <PostSkeletonList count={3} />
                  ) : memberBookmarks.length > 0 ? (
                    <div className="divide-border divide-y">
                      {memberBookmarks.map((bookmark) => (
                        <div key={bookmark._id} className="p-4">
                          <PostCard post={bookmark.target} size="small" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center p-4 text-center">
                      <Bookmark className="text-muted-foreground mb-4 h-12 w-12" />
                      <h3 className="text-xl font-bold">
                        Save posts for later
                      </h3>
                      <p className="text-muted-foreground mt-2 max-w-xs">
                        Bookmark posts to easily find them again in the future.
                      </p>
                    </div>
                  )}
                </QueryErrorBoundary>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center p-4 text-center">
                  <Bookmark className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="text-xl font-bold">Bookmarks are private</h3>
                  <p className="text-muted-foreground mt-2 max-w-xs">
                    Only the member can see their bookmarked posts.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
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
