"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import MemberProfile from "@/components/member-profile";
import PostCard from "@/components/post-card";
import { MemberProfileSkeleton, PostSkeletonList, ActivitySkeletonList } from "@/components/member-skeleton";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { use } from "react";
import { PageErrorBoundary, QueryErrorBoundary } from "@/components/error-boundary";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function MemberDetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  
  // Fetch member data from Convex using slug
  const memberData = useQuery(
    api.members.getMemberBySlug,
    { slug }
  );

  // Fetch member posts from Convex (only if member data is loaded)
  const memberPostsData = useQuery(
    api.members.getMemberPosts,
    memberData ? {
      memberId: memberData._id,
      paginationOpts: { numItems: 10, cursor: null } // Get first 10 posts
    } : "skip",
  );

  // Fetch member activity from Convex (only if member data is loaded)
  const memberActivityData = useQuery(
    api.members.getMemberActivity,
    memberData ? {
      memberId: memberData._id,
      paginationOpts: { numItems: 10, cursor: null } // Get first 10 activities
    } : "skip",
  );

  // Fetch member bookmarks (only if viewing own profile)
  const currentMember = useQuery(api.members.getCurrentMember);
  const isOwnProfile = currentMember && memberData && currentMember._id === memberData._id;
  const memberBookmarksData = useQuery(
    api.bookmarks.getUserBookmarks,
    isOwnProfile ? {
      paginationOpts: { numItems: 5, cursor: null }
    } : "skip",
  );

  // Member not found (only check this after data has loaded)
  if (memberData === null) {
    notFound();
  }

  // Progressive loading states
  const isMemberLoading = memberData === undefined;
  const arePostsLoading = memberPostsData === undefined;
  const isActivityLoading = memberActivityData === undefined;

  // Minimal transformation using server-computed data
  const member = memberData
    ? {
      id: memberData._id,
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      status: memberData.status,
      joinedDate: memberData.joinedDateFormatted, // Use server-formatted date
      country: memberData.country,
      updatedAt: new Date(memberData.updatedAt).toISOString().split("T")[0], // Convert to date string
      bio: memberData.bio,
      lastOnline: memberData.lastOnlineFormatted, // Use server-formatted date
      initials: memberData.initials, // Use server-computed initials
      linkGithub: memberData.linkGithub,
      linkX: memberData.linkX,
      linkYouTube: memberData.linkYouTube,
      location: memberData.location,
      // Add new member upgrade fields
      avatarUrl: memberData.avatarUrl,
      websiteUrl: memberData.websiteUrl,
      linkedinUrl: memberData.linkedinUrl,
      skills: memberData.skills || [],
      // Include slug for future use
      slug: memberData.slug,
    }
    : null;

  // Transform posts data to match PostCard interface
  const memberPosts = memberPostsData?.page || [];

  // Transform activity data for UI
  const memberActivity = memberActivityData?.page?.map((activity) => ({
    id: activity._id,
    type: "comment" as const,
    content: activity.content,
    timeAgo: activity.timeAgo,
    postId: activity.postId,
    postTitle: activity.post?.title || "Unknown Post",
    netVotes: activity.netVotes,
  })) || [];

  return (
    <div className="font-mono min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Back Navigation */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {/* Member Profile Section - Progressive Loading */}
        {isMemberLoading ? (
          <MemberProfileSkeleton />
        ) : member ? (
          <MemberProfile member={member} />
        ) : null}

        {/* Posts Section - Independent Loading */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            {member ? `Posts by ${member.firstName}` : 'Posts by Member'}
          </h2>

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
              <div className="text-center py-8">
                <p className="text-muted-foreground">No posts yet.</p>
                <p className="text-sm text-muted-foreground opacity-80 mt-2">
                  {member?.firstName || 'This member'} hasn&apos;t shared any posts with the community yet.
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
                    <p className="text-sm text-foreground">{activity.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.timeAgo} on{" "}
                      <Link
                        href={`#`}
                        className="text-green-700 hover:underline"
                      >
                        {activity.postTitle}
                      </Link>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recent activity.</p>
                <p className="text-sm text-muted-foreground opacity-80 mt-2">
                  {member?.firstName || 'This member'} hasn&apos;t commented on any posts recently.
                </p>
              </div>
            )}
          </QueryErrorBoundary>
        </div>

        {/* Bookmarks Section - Only show for own profile */}
        {isOwnProfile && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                My Bookmarks
              </h2>
              <Button variant="outline" size="sm" asChild>
                <Link href="/bookmarks">View All</Link>
              </Button>
            </div>

            <QueryErrorBoundary context="loading member bookmarks">
              {memberBookmarksData === undefined ? (
                <PostSkeletonList count={3} />
              ) : memberBookmarksData.page.length > 0 ? (
                <div className="space-y-4">
                  {memberBookmarksData.page.slice(0, 3).map((bookmark) => (
                    <PostCard key={bookmark._id} post={bookmark.target} size="small" />
                  ))}
                </div>
              ) : (
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

export default function MemberDetailPage({ params }: PageProps) {
  // Unwrap the params Promise using React.use()
  const { slug } = use(params);

  return (
    <PageErrorBoundary context="loading member profile">
      <MemberDetailContent slug={slug} />
    </PageErrorBoundary>
  );
}
