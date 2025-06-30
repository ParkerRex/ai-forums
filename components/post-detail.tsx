import Link from "next/link"
import Image from "next/image"
import { ArrowUp, ArrowDown, MessageSquare, Share, Bookmark, Flag, MoreHorizontal, Play, ExternalLink, Edit, Trash2, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Id } from "@/convex/_generated/dataModel"
import { useRef, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { getMediaPlaceholder } from "@/lib/post-preview-utils"
import { RenderTipTapContent } from "@/lib/render-post-content"
import { memberProfileUrl } from "@/lib/utils"

interface Post {
  _id: Id<"posts">
  title: string
  content: string
  createdAt: number
  editedAt?: number
  netVotes: number
  commentCount: number
  type?: "text" | "image" | "video" | "link"
  mediaUrl?: string
  thumbnailUrl?: string
  linkUrl?: string
  linkTitle?: string
  linkDescription?: string
  linkImage?: string
  linkPreviews?: Record<string, {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    url: string;
  }>
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
  onEdit?: () => void
  onDelete?: () => void
  onViewHistory?: () => void
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

export default function PostDetail({ post, onEdit, onDelete, onViewHistory }: PostDetailProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const postType = post.type || "text";

  // Get current user to check if they can edit/delete this post
  const currentMember = useQuery(api.members.getCurrentMember);

  // Check if current user is the author
  const isAuthor = currentMember && post.author && currentMember._id === post.author._id;
  
  // Debug logging
  console.log('Debug author check:', {
    currentMember: currentMember ? { _id: currentMember._id, email: currentMember.email } : null,
    postAuthor: post.author ? { _id: post.author._id, username: post.author.username } : null,
    isAuthor
  });

  const handleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

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

            {/* Media Content */}
            {postType === "image" && post.mediaUrl && (
              <div className="mb-6 rounded-lg overflow-hidden">
                <Image
                  src={post.mediaUrl}
                  alt={post.title}
                  width={800}
                  height={600}
                  className="w-full h-auto object-contain max-h-[600px]"
                  placeholder="blur"
                  blurDataURL={getMediaPlaceholder()}
                />
              </div>
            )}

            {postType === "video" && post.mediaUrl && (
              <div className="mb-6 rounded-lg overflow-hidden relative bg-background">
                <video
                  ref={videoRef}
                  src={post.mediaUrl}
                  className="w-full h-auto max-h-[600px]"
                  controls
                  poster={post.thumbnailUrl}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                />
                {!isVideoPlaying && post.thumbnailUrl && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    onClick={handleVideoPlay}
                  >
                    <div className="bg-background/80 rounded-full p-4 hover:bg-background/90 transition-colors">
                      <Play className="h-12 w-12 text-primary-foreground fill-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {postType === "link" && post.linkUrl && (
              <Card className="mb-6 overflow-hidden hover:shadow-md transition-shadow">
                <a 
                  href={post.linkUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  {post.linkImage && (
                    <div className="relative h-48 bg-muted">
                      <Image
                        src={post.linkImage}
                        alt={post.linkTitle || "Link preview"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2">
                      {post.linkTitle || post.linkUrl}
                    </h3>
                    {post.linkDescription && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                        {post.linkDescription}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      <span>{new URL(post.linkUrl).hostname}</span>
                    </div>
                  </CardContent>
                </a>
              </Card>
            )}

            {/* Rich Text Content */}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2 h-auto hover:bg-muted">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* Always show View History */}
                  <DropdownMenuItem onClick={onViewHistory}>
                    <History className="w-4 h-4 mr-2" />
                    View History
                  </DropdownMenuItem>
                  {/* Only show Edit/Delete if user is the author */}
                  {isAuthor && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onEdit}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Post
                      </DropdownMenuItem>
                    </>
                  )}
                  {/* Debug item to see if dropdown is working */}
                  {process.env.NODE_ENV === 'development' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled>
                        Debug: isAuthor = {isAuthor ? 'true' : 'false'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Comments removed – rendered by parent component */}
    </div>
  )
}
