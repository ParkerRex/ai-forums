import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowUp, ArrowDown, MessageSquare, MoreHorizontal } from "lucide-react"

interface Comment {
  id: number
  author: string
  content: string
  timeAgo: string
  votes: number
  replies?: Comment[]
}

const mockComments: Comment[] = [
  {
    id: 1,
    author: "rustlang",
    content:
      "Make sure your OS is arm64 and not arm32. I had similar issues until I realized I was running the wrong architecture.",
    timeAgo: "1 point 3 hours ago",
    votes: 1,
  },
  {
    id: 2,
    author: "devops_guru",
    content:
      "Have you tried using Docker with multi-arch builds? That usually solves most ARM compatibility issues for me.",
    timeAgo: "2 points 2 hours ago",
    votes: 2,
  },
]

interface CommentSectionProps {
  postId: number
  commentCount: number
}

export default function CommentSection({ postId, commentCount }: CommentSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">all {commentCount} comments</h2>
        <div className="text-sm text-gray-500">
          sorted by:{" "}
          <Button variant="ghost" className="p-0 h-auto text-green-700 hover:underline">
            best
          </Button>
        </div>
      </div>

      {/* Comment Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <Textarea
          placeholder="What are your thoughts?"
          className="min-h-[100px] border-gray-300 focus:border-green-700 focus:ring-green-700 mb-3"
        />
        <div className="flex justify-end">
          <Button className="bg-green-700 hover:bg-green-800">comment</Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {mockComments.map((comment) => (
          <div key={comment.id} className="bg-white border-l-2 border-gray-200 pl-4">
            <div className="flex items-start space-x-3">
              <div className="flex flex-col items-center space-y-1">
                <Button variant="ghost" size="sm" className="p-1 h-auto">
                  <ArrowUp className="w-4 h-4 text-gray-400 hover:text-green-700" />
                </Button>
                <span className="text-xs text-gray-500">{comment.votes}</span>
                <Button variant="ghost" size="sm" className="p-1 h-auto">
                  <ArrowDown className="w-4 h-4 text-gray-400 hover:text-red-500" />
                </Button>
              </div>

              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-2">
                  <span className="text-green-700 hover:underline cursor-pointer">/u/{comment.author}</span>
                  <span className="ml-2">{comment.timeAgo}</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">{comment.content}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <Button variant="ghost" size="sm" className="p-1 h-auto hover:bg-gray-100">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    reply
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1 h-auto hover:bg-gray-100">
                    share
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1 h-auto hover:bg-gray-100">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
