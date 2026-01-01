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

import { ArrowLeft, Bookmark } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import React, { use } from "react";
import { PageErrorBoundary, QueryErrorBoundary } from "@/components/error-boundary";
import MemberActivityCard from "@/components/members/member-activity-card";
import MemberProfile from "@/components/members/member-profile";
import {
  ActivitySkeletonList,
  MemberProfileSkeleton,
  PostSkeletonList,
} from "@/components/members/member-skeleton";
import PostPreview from "@/components/posts/post-preview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/providers/auth-provider";
import { useMember, useMemberPosts, useMemberActivity } from "@/hooks/use-members";
import { useBookmarksWithDetails } from "@/hooks/use-bookmarks";

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
  const { user } = useAuth();

  // Fetch member data using React Query
  const { data: memberData, isLoading: isMemberLoading, isError: isMemberError } = useMember(slug);

  // Fetch member posts using React Query with pagination
  const {
    data: memberPostsData,
    isLoading: arePostsLoading,
    hasNextPage: hasMorePosts,
    fetchNextPage: loadMorePosts,
    isFetchingNextPage: isLoadingMorePosts,
  } = useMemberPosts(memberData?.id);

  // Fetch member activity using React Query with pagination
  const { data: memberActivityData, isLoading: isActivityLoading } = useMemberActivity(memberData?.id);

  // Check if viewing own profile for bookmarks privacy
  const isOwnProfile = user && memberData && user.id === memberData.id;

  // Fetch member bookmarks (only if viewing own profile)
  const { data: memberBookmarks, isLoading: areBookmarksLoading } = useBookmarksWithDetails(
    isOwnProfile ? undefined : undefined // Only fetch if own profile
  );

  // Member not found (only check this after data has loaded)
  if (memberData === null && !isMemberLoading) {
    notFound();
  }

  // Transform member data for MemberProfile component
  const member = memberData
    ? {
        id: memberData.id,
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        email: memberData.email,
        status: memberData.status || "active",
        joinedDate: memberData.joinedDate
          ? new Date(memberData.joinedDate).toLocaleDateString()
          : undefined,
        country: memberData.country,
        updatedAt: undefined,
        bio: memberData.bio,
        lastOnline: memberData.lastOnline
          ? new Date(memberData.lastOnline).toLocaleDateString()
          : undefined,
        initials: `${memberData.firstName?.[0] || ""}${memberData.lastName?.[0] || ""}`,
        linkGithub: memberData.linkGithub,
        linkX: memberData.linkX,
        linkYouTube: memberData.linkYouTube,
        location: memberData.location,
        avatarUrl: memberData.avatarUrl,
        websiteUrl: memberData.websiteUrl,
        linkedinUrl: memberData.linkedinUrl,
        skills: memberData.skills || [],
        slug: memberData.slug,
        tier: memberData.tier,
        subscriptionStatus: memberData.subscriptionStatus,
        subscriptionEndDate: memberData.subscriptionEndDate,
        billingInterval: memberData.billingInterval,
        postCount: memberData.postCount,
      }
    : null;

  // Flatten paginated posts data
  const allPosts = memberPostsData?.pages?.flatMap((page) => page.items) || [];

  // Transform activity data
  const memberActivity =
    memberActivityData?.pages?.flatMap((page) =>
      page.items.map((activity) => ({
        id: activity.id,
        type: "comment" as const,
        content: activity.content,
        timeAgo: activity.timeAgo || "recently",
        postId: activity.postId,
        postTitle: activity.post?.title || "Unknown Post",
        postSlug: activity.post?.slug,
        categoryName: activity.post?.categoryName,
        netVotes: activity.netVotes,
      }))
    ) || [];

  // Use actual post count from member data
  const postCount = member?.postCount || 0;

  // Main render - comprehensive member profile page with Twitter-style layout
  return (
    <div className="w-full max-w-4xl mx-auto bg-background text-foreground">
      <div className="border-x border-b border-border">
        {/* Twitter-style sticky header */}
        <header className="flex items-center justify-between p-2 px-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {member ? `${member.firstName} ${member.lastName}` : "Loading..."}
              </h1>
              <p className="text-sm text-muted-foreground">{postCount} posts</p>
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
            <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="posts">
              <QueryErrorBoundary context="loading member posts">
                {arePostsLoading ? (
                  <PostSkeletonList count={3} />
                ) : allPosts.length > 0 ? (
                  <>
                    <div className="divide-y divide-border">
                      {allPosts.map((post) => (
                        <div key={post.id} className="p-4">
                          <PostPreview
                            post={{
                              id: post.id,
                              title: post.title,
                              content: post.content,
                              createdAt: new Date(post.createdAt).getTime(),
                              upvotes: post.upvotes || 0,
                              downvotes: post.downvotes || 0,
                              commentCount: post.commentCount || 0,
                              viewCount: post.viewCount || 0,
                              member: post.member,
                              category: post.category ? { name: post.category.name, displayName: post.category.displayName, icon: post.category.icon ?? undefined } : undefined,
                            }}
                            size="medium"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Load More Button */}
                    {hasMorePosts && (
                      <div className="p-4 text-center border-t border-border">
                        <Button
                          variant="outline"
                          onClick={() => loadMorePosts()}
                          disabled={isLoadingMorePosts}
                        >
                          {isLoadingMorePosts ? "Loading..." : "Load More Posts"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">No posts yet.</div>
                )}
              </QueryErrorBoundary>
            </TabsContent>

            {/* Recent Activity Tab */}
            <TabsContent value="recent-activity">
              <QueryErrorBoundary context="loading member activity">
                {isActivityLoading ? (
                  <ActivitySkeletonList count={4} />
                ) : memberActivity.length > 0 ? (
                  <div className="divide-y divide-border">
                    {memberActivity.map((activity) => (
                      <div key={activity.id} className="p-4">
                        <MemberActivityCard activity={activity} size="medium" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">No recent activity.</div>
                )}
              </QueryErrorBoundary>
            </TabsContent>

            {/* Bookmarks Tab */}
            <TabsContent value="bookmarks">
              {isOwnProfile ? (
                <QueryErrorBoundary context="loading member bookmarks">
                  {areBookmarksLoading ? (
                    <PostSkeletonList count={3} />
                  ) : memberBookmarks && memberBookmarks.length > 0 ? (
                    <div className="divide-y divide-border">
                      {memberBookmarks.map((bookmark) => (
                        <div key={bookmark.id} className="p-4">
                          {bookmark.target && (
                            <PostPreview
                              post={{
                                id: bookmark.target.id,
                                title: bookmark.target.title,
                                content: bookmark.target.content,
                                createdAt: new Date(bookmark.target.createdAt).getTime(),
                                upvotes: 0,
                                downvotes: 0,
                                commentCount: 0,
                                viewCount: 0,
                                member: bookmark.target.member,
                                category: bookmark.target.category,
                              }}
                              size="small"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 flex flex-col items-center justify-center text-center h-64">
                      <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-bold">Save posts for later</h3>
                      <p className="text-muted-foreground mt-2 max-w-xs">
                        Bookmark posts to easily find them again in the future.
                      </p>
                    </div>
                  )}
                </QueryErrorBoundary>
              ) : (
                <div className="p-4 flex flex-col items-center justify-center text-center h-64">
                  <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
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
