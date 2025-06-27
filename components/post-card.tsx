import Link from "next/link";
import {
  ArrowUp,
  MessageSquare,
  Share,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { MembershipCTAModal } from "@/components/membership-cta-modal";
import { useState } from "react";

// Interface to match Convex post data structure
interface Post {
  _id: Id<"posts">;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  authorId: Id<"members">;
  categoryId: Id<"categories">;
  status: "active" | "deleted" | "hidden" | "archived";
  upvotes: number;
  downvotes: number;
  netVotes: number;
  commentCount: number;
  viewCount: number;
  isPinned?: boolean;
  isLocked?: boolean;
  editedAt?: number;
  editReason?: string;
  author: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
  } | null;
  category: {
    _id: Id<"categories">;
    name: string;
    displayName: string;
    icon?: string;
  } | null;
}

// Helper function to format time ago
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes}m`;
  } else if (hours < 24) {
    return `${hours}h`;
  } else {
    return `${days}d`;
  }
}

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const voteOnPost = useMutation(api.votes.voteOnPost);
  const userVote = useQuery(api.votes.getUserVote, {
    targetId: post._id,
    targetType: "post",
  });

  const handleUpvote = async () => {
    if (isVoting) return;
    setIsVoting(true);

    try {
      const voteType = userVote === "upvote" ? "remove" : "upvote";
      await voteOnPost({
        postId: post._id,
        voteType,
      });
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex">
        {/* Voting */}
        <div className="flex flex-col items-center p-4 space-y-1">
          <Authenticated>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto hover:bg-gray-100"
              onClick={handleUpvote}
              disabled={isVoting}
            >
              <ArrowUp
                className={`w-5 h-5 transition-colors ${userVote === "upvote"
                  ? "text-green-700"
                  : "text-gray-400 hover:text-green-700"
                  }`}
              />
            </Button>
          </Authenticated>
          <Unauthenticated>
            <MembershipCTAModal
              title="Upvote Great Content"
              description="Join VAI to upvote posts and help surface the best content in the community"
            >
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto hover:bg-gray-100"
              >
                <ArrowUp className="w-5 h-5 text-gray-400 hover:text-green-700" />
              </Button>
            </MembershipCTAModal>
          </Unauthenticated>
          <span className="text-sm font-medium text-gray-900">
            {post.netVotes}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 pl-0">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Link
              href={`/ai/${post.category?.name || 'general'}`}
              className="text-green-700 hover:underline"
            >
              /ai/{post.category?.name || 'general'}
            </Link>
            <span className="mx-2">•</span>
            <span>posted by</span>
            <Link
              href={`/members/${post.author?._id}`}
              className="ml-1 text-green-700 hover:underline"
            >
              {post.author?.firstName || 'Unknown'}
            </Link>
            <span className="mx-2">•</span>
            <span>{getTimeAgo(post.createdAt)} ago</span>
          </div>

          <Link href={`/post/${post._id}`} className="block group">
            <h2 className="text-lg font-medium text-gray-900 group-hover:text-green-700 transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              {post.content}
            </p>
          </Link>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <Authenticated>
              <Link href={`/post/${post._id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto hover:bg-gray-100"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {post.commentCount} comments
                </Button>
              </Link>
            </Authenticated>
            <Unauthenticated>
              <MembershipCTAModal
                title="Join the Conversation"
                description="Sign up to read comments and share your thoughts with the VAI community"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto hover:bg-gray-100"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {post.commentCount} comments
                </Button>
              </MembershipCTAModal>
            </Unauthenticated>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-auto hover:bg-gray-100"
            >
              <Share className="w-4 h-4 mr-1" />
              share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-auto hover:bg-gray-100"
            >
              <Bookmark className="w-4 h-4 mr-1" />
              save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
