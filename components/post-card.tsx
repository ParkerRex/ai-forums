import { useRouter } from "next/navigation";
import {
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowBigUpIcon } from "@/components/ui/arrow-big-up";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { MembershipCTAModal } from "@/components/membership-cta-modal";
import { useState } from "react";
import PostPreview from "@/components/post-preview";
import { PostData } from "@/lib/post-preview-utils";
import { BookmarkButton } from "@/components/bookmark-button";

// Interface to match Convex post data structure
interface Post extends Omit<PostData, 'member' | 'author' | 'category'> {
  _id: Id<"posts">;
  title: string;
  content: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
  memberId: Id<"members">;
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
  member: {
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

  return (
    <div className="bg-card border border-border/50 rounded-md hover:border-border transition-colors">
      <div className="flex">
        {/* Voting panel */}
        <div className="flex flex-col items-center p-2 space-y-0.5 bg-muted/30">
          <Authenticated>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto hover:bg-muted"
              onClick={handleUpvote}
              disabled={isVoting}
            >
              <ArrowBigUpIcon
                size={16}
                className={`transition-colors ${
                  userVote === "upvote"
                    ? "text-orange-500"
                    : "text-muted-foreground hover:text-orange-500"
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
                <ArrowBigUpIcon size={16} className="text-muted-foreground hover:text-orange-500" />
              </Button>
            </MembershipCTAModal>
          </Unauthenticated>
          <span className="text-xs font-medium text-foreground">
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
            showMember={true}
            className="border-0 shadow-none hover:shadow-none"
          />
        </div>
      </div>

      {/* Actions bar */}
      <div className="border-t border-border/50 px-3 py-1.5">
        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
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
              <MessageSquare className="w-3 h-3 mr-1" />
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
          <BookmarkButton
            targetId={post._id}
            targetType="post"
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
