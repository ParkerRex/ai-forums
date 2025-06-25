import Link from "next/link"
import { ArrowUp, ArrowDown, MessageSquare, Share, Bookmark, Flag, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import CommentSection from "@/components/comment-section"

interface Post {
  id: number
  title: string
  author: string
  community: string
  timeAgo: string
  votes: number
  comments: number
  content: string
  submittedDate: string
  upvotePercentage: number
}

interface PostDetailProps {
  post: Post
}

export default function PostDetail({ post }: PostDetailProps) {
  return (
    <div className="space-y-6">
      {/* Main Post */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex">
          {/* Voting */}
          <div className="flex flex-col items-center p-4 space-y-1 bg-gray-50 rounded-l-lg">
            <Button variant="ghost" size="sm" className="p-1 h-auto hover:bg-gray-200">
              <ArrowUp className="w-6 h-6 text-gray-400 hover:text-green-700" />
            </Button>
            <span className="text-lg font-bold text-gray-900">{post.votes}</span>
            <Button variant="ghost" size="sm" className="p-1 h-auto hover:bg-gray-200">
              <ArrowDown className="w-6 h-6 text-gray-400 hover:text-red-500" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <Link href={`/ai/${post.community}`} className="text-green-700 hover:underline font-medium">
                /ai/{post.community}
              </Link>
              <span className="mx-2">•</span>
              <span>posted by</span>
              <Link href={`/u/${post.author}`} className="ml-1 text-green-700 hover:underline">
                /u/{post.author}
              </Link>
              <span className="mx-2">•</span>
              <span>{post.timeAgo} ago</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-6">{post.title}</h1>

            <div className="prose prose-sm max-w-none text-gray-700 mb-6">
              {post.content.split("\n").map((paragraph, index) => (
                <p key={index} className="mb-4 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500 border-t pt-4">
              <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-gray-100">
                <MessageSquare className="w-4 h-4 mr-1" />
                {post.comments} comments
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-gray-100">
                <Share className="w-4 h-4 mr-1" />
                share
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-gray-100">
                <Bookmark className="w-4 h-4 mr-1" />
                save
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-gray-100">
                <Flag className="w-4 h-4 mr-1" />
                report
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-gray-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <CommentSection postId={post.id} commentCount={post.comments} />
    </div>
  )
}
