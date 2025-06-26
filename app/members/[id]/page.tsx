"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import MemberProfile from "@/components/member-profile";
import PostCard from "@/components/post-card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { use } from "react";

// Mock comments data - TODO: Replace with real activity query
const recentActivity = [
  {
    type: "comment",
    content: "Great point on the /patterns post!",
    timeAgo: "1h",
    postId: 3,
  },
  {
    type: "comment",
    content: "Thanks for sharing this in /tools!",
    timeAgo: "5h",
    postId: 4,
  },
];

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

  // Invalid ID format
  if (!isValidId) {
    notFound();
  }

  // Loading state
  if (memberData === undefined) {
    return (
      <div className="font-mono min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Loading member...
            </h1>
            <p className="text-gray-600">
              Please wait while we fetch the member information.
            </p>
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
            <div className="text-center py-8">
              <p className="text-gray-600">Loading posts...</p>
            </div>
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
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <p className="text-sm text-gray-700">{activity.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activity.timeAgo} on post{" "}
                    <Link
                      href={`/post/${activity.postId}`}
                      className="text-green-700 hover:underline"
                    >
                      #{activity.postId}
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}
