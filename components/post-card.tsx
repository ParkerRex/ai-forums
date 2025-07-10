import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowBigUpIcon } from "@/components/ui/arrow-big-up";
import { MessageSquareIcon } from "@/components/ui/message-square";
import { UploadIcon } from "@/components/ui/upload";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { MembershipCTAModal } from "@/components/membership-cta-modal";
import { useState, useRef } from "react";
import PostPreview from "@/components/post-preview";
import { PostData } from "@/lib/post-preview-utils";
import { useMutationError } from "@/hooks/use-mutation-error";
import { BookmarkButton } from "@/components/bookmark-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Interface to match Convex post data structure
interface Post extends Omit<PostData, "member" | "author" | "category"> {
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
  pinScope?: "category" | "global" | "both";
  pollOptions?: Array<{
    id: string;
    text: string;
    voteCount: number;
  }>;
  pollEndsAt?: number;
  totalPollVotes?: number;
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

export default function PostCard({ post, size = "large" }: PostCardProps) {
  const router = useRouter();
  const [isVoting, setIsVoting] = useState(false);

  const [optimisticNetVotes, setOptimisticNetVotes] = useState(post.netVotes);
  const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(
    null,
  );

  // Refs for animated icons
  const upvoteIconRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const commentIconRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const shareIconRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);

  const voteOnPost = useMutation(api.votes.voteOnPost);
  const userVote = useQuery(api.votes.getUserVote, {
    targetId: post._id,
    targetType: "post",
  });
  const { handleMutationError } = useMutationError();

  const currentUserVote =
    optimisticUserVote !== null ? optimisticUserVote : userVote;

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVoting) return;
    setIsVoting(true);

    const voteType = currentUserVote === "upvote" ? "remove" : "upvote";

    let newNetVotes = optimisticNetVotes;
    let newUserVote: string | null = null;

    if (voteType === "upvote") {
      newNetVotes = optimisticNetVotes + (currentUserVote === null ? 1 : 1);
      newUserVote = "upvote";
    } else {
      newNetVotes = optimisticNetVotes - 1;
      newUserVote = null;
    }

    setOptimisticNetVotes(newNetVotes);
    setOptimisticUserVote(newUserVote);

    try {
      const result = await voteOnPost({
        postId: post._id,
        voteType,
      });

      setOptimisticNetVotes(result.netVotes);
      setOptimisticUserVote(result.newVoteType);
    } catch (error) {
      setOptimisticNetVotes(post.netVotes);
      setOptimisticUserVote(userVote || null);
      handleMutationError(error, () => handleUpvote(e), {
        context: "voting on post",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleClick = () => {
    router.push(`/${post.category?.name || "general"}/${post.slug}`);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}/${post.category?.name || "general"}/${post.slug}`;

    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className={cn(
      "border rounded-lg transition-all duration-200 group",
      post.isPinned ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/30 hover:bg-orange-100/50 dark:hover:bg-orange-950/30" : "bg-card hover:bg-muted/30"
    )}>
      {/* Main content - Reddit style full width */}
      <div
        className="cursor-pointer py-2 px-3"
        onClick={handleClick}
      >
        <PostPreview
          post={post as PostData}
          size={size}
          showStats={false}
          showCategory={true}
          showMember={true}
          className="border-0 shadow-none hover:shadow-none hover:scale-100 p-0"
        />
        
        {/* Actions bar with voting - Reddit style */}
        <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
          {/* Vote button moved here */}
          <Authenticated>
            <Button
              variant="ghost"
              size="sm"
              className="px-2 py-1 h-auto hover:bg-muted/50 rounded-sm transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleUpvote(e);
              }}
              disabled={isVoting}
              onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
              onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
            >
              <ArrowBigUpIcon
                ref={upvoteIconRef}
                size={12}
                className={`mr-1 transition-colors ${
                  currentUserVote === "upvote"
                    ? "text-orange-500 fill-orange-500"
                    : "text-muted-foreground hover:text-orange-500"
                }`}
              />
              <span className="font-medium">{optimisticNetVotes}</span>
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
                className="px-2 py-1 h-auto hover:bg-muted/50 rounded-sm transition-colors"
                onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
                onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
              >
                <ArrowBigUpIcon
                  ref={upvoteIconRef}
                  size={12}
                  className="mr-1 text-muted-foreground hover:text-orange-500"
                />
                <span className="font-medium">{optimisticNetVotes}</span>
              </Button>
            </MembershipCTAModal>
          </Unauthenticated>
          
          {/* Comments */}
          <Authenticated>
            <Button
              variant="ghost"
              size="sm"
              className="px-2 py-1 h-auto hover:bg-muted/50 rounded-sm transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              onMouseEnter={() => commentIconRef.current?.startAnimation()}
              onMouseLeave={() => commentIconRef.current?.stopAnimation()}
            >
              <MessageSquareIcon
                ref={commentIconRef}
                size={12}
                className="mr-1"
              />
              <span className="font-medium">{post.commentCount}</span>
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
                className="px-2 py-1 h-auto hover:bg-muted/50 rounded-sm transition-colors"
                onMouseEnter={() => commentIconRef.current?.startAnimation()}
                onMouseLeave={() => commentIconRef.current?.stopAnimation()}
              >
                <MessageSquareIcon
                  ref={commentIconRef}
                  size={12}
                  className="mr-1"
                />
                <span className="font-medium">{post.commentCount}</span>
              </Button>
            </MembershipCTAModal>
          </Unauthenticated>
          
          {/* Bookmark and Share */}
          <BookmarkButton targetId={post._id} targetType="post" size="sm" />
          <Button
            variant="ghost"
            size="sm"
            className="px-2 py-1 h-auto hover:bg-muted/50 rounded-sm transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleShare(e);
            }}
            onMouseEnter={() => shareIconRef.current?.startAnimation()}
            onMouseLeave={() => shareIconRef.current?.stopAnimation()}
          >
            <UploadIcon ref={shareIconRef} size={12} className="mr-1" />
            <span className="font-medium">share</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
