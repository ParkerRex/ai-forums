import Link from "next/link"
import { ArrowUp, ArrowDown, MessageSquare, Share, Bookmark, Flag, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Id } from "@/convex/_generated/dataModel"
import { RenderTipTapContent } from "@/lib/render-post-content"
import { memberProfileUrl } from "@/lib/utils"

interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

interface Post {
  _id: Id<"posts">
  title: string
  content: string
  createdAt: number
  netVotes: number
  commentCount: number
  linkPreviews?: Record<string, LinkPreview>
  author?: {
    _id: Id<"members">
    firstName: string
    lastName: string
    username: string
    slug?: string
  } | null
  category?: {
    name: string
  } | null
}

interface PostDetailProps {
  post: Post
}

// Helper to compute human-readable time-ago string
function getTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

export default function PostDetail({ post }: PostDetailProps) {
  return (
    <div className="space-y-6">
      {/* Main Post */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex">
          {/* Voting */}
          <div className="flex flex-col items-center p-4 space-y-1 bg-muted/50 rounded-l-lg">
            <Button variant="ghost" size="sm" className="p-1 h-auto hover:bg-muted">
              <ArrowUp className="w-6 h-6 text-muted-foreground hover:text-primary" />
            </Button>
            <span className="text-lg font-bold text-foreground">{post.netVotes}</span>
            <Button variant="ghost" size="sm" className="p-1 h-auto hover:bg-muted">
              <ArrowDown className="w-6 h-6 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex items-center text-sm text-muted-foreground mb-4">
              <Link 
                href={`/${post.category?.name || "general"}`}
                className="text-primary hover:underline"
              >
                /{post.category?.name || "general"}
              </Link>
              <span className="mx-2">•</span>
              <span>posted by</span>
              <Link 
                href={post.author ? memberProfileUrl({ slug: post.author.slug!, _id: post.author._id }) : "#"}
                className="ml-1 text-primary hover:underline"
                data-testid="author-link"
              >
                /u/{post.author?.username || "unknown"}
              </Link>
              <span className="mx-2">•</span>
              <span>{getTimeAgo(post.createdAt)} ago</span>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-6">{post.title}</h1>

            <div className="mb-6">
              <RenderTipTapContent htmlContent={post.content} />
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground border-t border-border pt-4">
              <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-muted">
                <MessageSquare className="w-4 h-4 mr-1" />
                {post.commentCount} comments
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-muted">
                <Share className="w-4 h-4 mr-1" />
                share
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-muted">
                <Bookmark className="w-4 h-4 mr-1" />
                save
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-muted">
                <Flag className="w-4 h-4 mr-1" />
                report
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-muted">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments removed – rendered by parent component */}
    </div>
  )
}
