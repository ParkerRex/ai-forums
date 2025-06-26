"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import MemberProfile from "@/components/member-profile";
import PostCard from "@/components/post-card";
import { MemberProfileSkeleton, PostSkeletonList, ActivitySkeletonList } from "@/components/member-skeleton";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { use } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MemberDetailPage({ params }: PageProps) {
  // Unwrap the params Promise using React.use()
  const { id } = use(params);

  // Validate that the ID looks like a Convex ID before making the query
  const isValidId = id.length > 20 && id.match(/^[a-z0-9]+$/);

  // Fetch member data from Convex (only if ID format is valid)
  const memberData = useQuery(
    api.members.getMemberById,
    isValidId ? { id: id as Id<"members"> } : "skip",
  );

  // Fetch member posts from Convex (only if ID format is valid)
  const memberPostsData = useQuery(
    api.members.getMemberPosts,
    isValidId ? {
      memberId: id as Id<"members">,
      paginationOpts: { numItems: 10, cursor: null } // Get first 10 posts
    } : "skip",
  );

  // Fetch member activity from Convex (only if ID format is valid)
  const memberActivityData = useQuery(
    api.members.getMemberActivity,
    isValidId ? {
      memberId: id as Id<"members">,
      paginationOpts: { numItems: 10, cursor: null } // Get first 10 activities
    } : "skip",
  );

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
    }
    : null;

  // Transform posts data to match PostCard interface
  const memberPosts = memberPostsData?.page?.map((post) => ({
    id: post._id,
    title: post.title,
    author: member ? `${member.firstName} ${member.lastName}` : "Unknown",
    community: post.category?.displayName || post.category?.name || "general",
    timeAgo: post.timeAgo,
    votes: post.netVotes,
    comments: post.commentCount,
    content: post.content,
  })) || [];

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

  // Invalid ID format
  if (!isValidId) {
    notFound();
  }

  // Loading state
  if (memberData === undefined) {
    return (
      <div className="font-mono min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <MemberProfileSkeleton />

          <div className="mt-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Posts by Member
            </h2>
            <PostSkeletonList count={3} />
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Recent Activity
            </h2>
            <ActivitySkeletonList count={4} />
          </div>
        </div>
      </div>
    );
  }

  // Member not found
  if (memberData === null || !member) {
    notFound();
  }

  return (
    <div className="font-mono min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <MemberProfile member={member} />

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Posts by {member.firstName}
          </h2>

          {/* Posts loading state */}
          {memberPostsData === undefined ? (
            <PostSkeletonList count={3} />
          ) : memberPosts.length > 0 ? (
            <div className="space-y-6">
              {memberPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No posts yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                {member.firstName} hasn&apos;t shared any posts with the community yet.
              </p>
            </div>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Recent Activity
          </h2>

          {/* Activity loading state */}
          {memberActivityData === undefined ? (
            <ActivitySkeletonList count={4} />
          ) : memberActivity.length > 0 ? (
            <div className="space-y-4">
              {memberActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <p className="text-sm text-gray-700">{activity.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activity.timeAgo} on{" "}
                    <Link
                      href={`/post/${activity.postId}`}
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
              <p className="text-gray-600">No recent activity.</p>
              <p className="text-sm text-gray-500 mt-2">
                {member.firstName} hasn&apos;t commented on any posts recently.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
