import { useRouter } from "next/navigation";
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
import PostPreview from "@/components/post-preview";
import { PostData } from "@/lib/post-preview-utils";

// Interface to match Convex post data structure
interface Post extends Omit<PostData, 'author' | 'category'> {
  _id: Id<"posts">;
  title: string;
  content: string;
  slug: string;
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
    slug?: string;
  } | null;
  category: {
    _id: Id<"categories">;
    name: string;
    displayName: string;
    icon?: string;
  } | null;
}

interface PostCardProps {
  post: Post;
  size?: "small" | "medium" | "large";
}

export default function PostCard({ post, size = "medium" }: PostCardProps) {
  const router = useRouter();
  const [isVoting, setIsVoting] = useState(false);
  const voteOnPost = useMutation(api.votes.voteOnPost);
  const userVote = useQuery(api.votes.getUserVote, {
    targetId: post._id,
    targetType: "post",
  });

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleClick = () => {
    router.push(`/${post.category?.name || 'general'}/${post.slug}`);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement share functionality
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement save functionality
  };

  return (
    <div className="bg-card border border-border rounded-lg hover:border-muted-foreground/20 transition-colors">
      <div className="flex">
        {/* Voting panel */}
        <div className="flex flex-col items-center p-4 space-y-1">
          <Authenticated>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto hover:bg-muted"
              onClick={handleUpvote}
              disabled={isVoting}
            >
              <ArrowUp
                className={`w-5 h-5 transition-colors ${
                  userVote === "upvote"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
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
                className="p-1 h-auto hover:bg-muted"
              >
                <ArrowUp className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </Button>
            </MembershipCTAModal>
          </Unauthenticated>
          <span className="text-sm font-medium text-foreground">
            {post.netVotes}
          </span>
        </div>

        {/* Main content using PostPreview */}
        <div className="flex-1 cursor-pointer" onClick={handleClick}>
          <PostPreview
            post={post as PostData}
            size={size}
            showStats={false}
            showCategory={true}
            showAuthor={true}
            className="border-0 shadow-none hover:shadow-none"
          />
        </div>
      </div>

      {/* Actions bar */}
      <div className="border-t border-border px-4 py-2">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <Authenticated>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-auto hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              {post.commentCount} comments
            </Button>
          </Authenticated>
          <Unauthenticated>
            <MembershipCTAModal
              title="Join the Conversation"
              description="Sign up to read comments and share your thoughts with the VAI community"
            >
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-auto hover:bg-muted"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                {post.commentCount} comments
              </Button>
            </MembershipCTAModal>
          </Unauthenticated>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-auto hover:bg-muted"
            onClick={handleShare}
          >
            <Share className="w-4 h-4 mr-1" />
            share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-auto hover:bg-muted"
            onClick={handleSave}
          >
            <Bookmark className="w-4 h-4 mr-1" />
            save
          </Button>
        </div>
      </div>
    </div>
  );
}
