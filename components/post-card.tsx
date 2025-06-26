import Link from "next/link";
import {
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Share,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Updated interface to match real Convex data structure
interface Post {
  id: string; // Convex _id
  title: string;
  author: string; // Author's full name
  community: string; // Category display name
  timeAgo: string;
  votes: number; // netVotes
  comments: number; // commentCount
  content: string;
}

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex">
        {/* Voting */}
        <div className="flex flex-col items-center p-4 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto hover:bg-gray-100"
          >
            <ArrowUp className="w-5 h-5 text-gray-400 hover:text-green-700" />
          </Button>
          <span className="text-sm font-medium text-gray-900">
            {post.votes}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto hover:bg-gray-100"
          >
            <ArrowDown className="w-5 h-5 text-gray-400 hover:text-red-500" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 pl-0">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Link
              href={`/ai/${post.community}`}
              className="text-green-700 hover:underline"
            >
              /ai/{post.community}
            </Link>
            <span className="mx-2">•</span>
            <span>posted by</span>
            <Link
              href={`/u/${post.author}`}
              className="ml-1 text-green-700 hover:underline"
            >
              /u/{post.author}
            </Link>
            <span className="mx-2">•</span>
            <span>{post.timeAgo} ago</span>
          </div>

          <Link href={`/post/${post.id}`} className="block group">
            <h2 className="text-lg font-medium text-gray-900 group-hover:text-green-700 transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              {post.content}
            </p>
          </Link>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-auto hover:bg-gray-100"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              {post.comments} comments
            </Button>
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
