import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/header";
import MemberProfile from "@/components/member-profile";
import PostCard from "@/components/post-card"; // Assuming PostCard is reusable

// Mock member data - in a real app this would come from a database
const members = [
  {
    id: "1",
    firstName: "Alice",
    lastName: "Smith",
    email: "alice.smith@example.com",
    status: "active",
    joinedDate: "2023-01-15",
    country: "USA",
    updatedAt: "2024-06-20",
    bio: "Full-stack developer passionate about open source and AI. Building tools to make developers' lives easier. I enjoy contributing to various projects and exploring new technologies. My current focus is on developing scalable AI applications and improving developer productivity through automation.",
    lastOnline: "2 hours ago",
    linkGithub: "https://github.com/alicesmith",
    linkX: "https://x.com/alicesmithdev",
    linkYouTube: "https://youtube.com/alicesmithcodes",
    location: "San Francisco, CA",
  },
  // ... other members
];

// Mock posts data - in a real app this would come from a database
const allPosts = [
  {
    id: 1,
    title: "My journey into AI development",
    authorId: "1",
    author: "AliceSmith",
    community: "ai-dev",
    timeAgo: "1d",
    votes: 150,
    comments: 30,
    content: "Sharing my experience learning AI and building my first model...",
  },
  {
    id: 2,
    title: "Open source tool for code generation",
    authorId: "1",
    author: "AliceSmith",
    community: "open-source",
    timeAgo: "3d",
    votes: 220,
    comments: 55,
    content: "Excited to release a new tool I've been working on...",
  },
  // ... other posts
];

// Mock comments data
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
  params: { id: string };
}

export default function MemberDetailPage({ params }: PageProps) {
  const member = members.find((m) => m.id === params.id);
  const memberPosts = allPosts.filter((p) => p.authorId === params.id);

  if (!member) {
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
          {memberPosts.length > 0 ? (
            <div className="space-y-6">
              {memberPosts.map((post) => (
                <PostCard key={post.id} post={post as any} /> // Cast to any to match PostCard props
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No posts yet.</p>
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
