import { useRouter } from "next/navigation";
import { Button } from "@/web/components/ui/button";
import { ArrowBigUpIcon } from "@/web/components/icons/arrow-big-up";
import { MessageSquareIcon } from "@/web/components/icons/message-square";
import { UploadIcon } from "@/web/components/ui/upload";
import { Id } from "@/web/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { useState, useRef } from "react";
import PostPreview from "@/web/components/posts/post-preview";
import { PostData } from "@/lib/post-preview-utils";
import { useMutationError } from "@/hooks/use-mutation-error";
import { PostBookmarkButton } from "@/web/components/posts/post-bookmark-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Interface to match Convex post data structure
interface Post extends Omit<PostData, "member" | "author" | "category"> {
  _id: Id<"posts">;
  title: string;
  content: string;
  preview?: string;
  isFree?: boolean;
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
  currentCategoryId?: Id<"categories">;
  userVote?: "upvote" | null;
}

export default function PostCard({
  post,
  size = "large",
  currentCategoryId,
  userVote,
}: PostCardProps) {
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

  // Only query for user vote if not provided as prop (for standalone usage)
  const userVoteQuery = useQuery(
    api.votes.getUserVote,
    userVote === undefined
      ? {
          targetId: post._id,
          targetType: "post" as const,
        }
      : "skip",
  );

  const { handleMutationError } = useMutationError();

  // Use prop if provided, otherwise fall back to query
  const actualUserVote = userVote !== undefined ? userVote : userVoteQuery;

  const currentUserVote =
    optimisticUserVote !== null ? optimisticUserVote : actualUserVote;

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
      setOptimisticUserVote(actualUserVote || null);
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
    <div
      className={cn(
        "group rounded-none border transition-all duration-200",
        post.isPinned
          ? "border-orange-200 bg-orange-50 hover:bg-orange-100/50 dark:border-orange-900/30 dark:bg-orange-950/20 dark:hover:bg-orange-950/30"
          : "bg-card hover:bg-muted/30",
      )}
    >
      {/* Main content - Reddit style full width */}
      <div className="cursor-pointer px-3 py-2" onClick={handleClick}>
        <PostPreview
          post={post as PostData}
          size={size}
          showStats={false}
          showCategory={currentCategoryId !== post.categoryId}
          showMember={true}
          className="border-0 p-0 shadow-none hover:shadow-none"
        />

        {/* Actions bar with voting - Reddit style */}
        <div className="text-muted-foreground mt-2 flex items-center space-x-3 text-xs">
          {/* Vote button moved here */}
          <Authenticated>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted/50 h-auto rounded-none transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // For paywalled posts, navigate to post page to show paywall
                if (!post.isFree) {
                  handleClick();
                } else {
                  handleUpvote(e);
                }
              }}
              disabled={isVoting && post.isFree}
              onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
              onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
            >
              <ArrowBigUpIcon
                ref={upvoteIconRef}
                size={16}
                className={`transition-colors ${
                  currentUserVote === "upvote"
                    ? "fill-orange-500 text-orange-500"
                    : "text-muted-foreground hover:text-orange-500"
                }`}
              />
              <span className="font-medium">{optimisticNetVotes}</span>
            </Button>
          </Authenticated>
          <Unauthenticated>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted/50 h-auto rounded-none px-2 py-1 transition-colors"
              onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
              onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
            >
              <ArrowBigUpIcon
                ref={upvoteIconRef}
                size={18}
                className="text-muted-foreground hover:text-orange-500"
              />
              <span className="font-medium">{optimisticNetVotes}</span>
            </Button>
          </Unauthenticated>

          {/* Comments */}
          <Authenticated>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted/50 h-auto rounded-none px-2 py-1 transition-colors"
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
              <span className="font-mono tracking-tighter">
                {post.commentCount}
              </span>
            </Button>
          </Authenticated>
          <Unauthenticated>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted/50 h-auto rounded-none px-2 py-1 transition-colors"
              onMouseEnter={() => commentIconRef.current?.startAnimation()}
              onMouseLeave={() => commentIconRef.current?.stopAnimation()}
            >
              <MessageSquareIcon
                ref={commentIconRef}
                size={10}
                className="mr-1"
              />
              <span className="font-mono tracking-tighter">
                {post.commentCount}
              </span>
            </Button>
          </Unauthenticated>

          {/* Bookmark and Share */}
          <PostBookmarkButton targetId={post._id} targetType="post" size="sm" />
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-muted/50 h-auto rounded-none transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleShare(e);
            }}
            onMouseEnter={() => shareIconRef.current?.startAnimation()}
            onMouseLeave={() => shareIconRef.current?.stopAnimation()}
          >
            <UploadIcon ref={shareIconRef} size={12} className="" />
          </Button>
        </div>
      </div>
    </div>
  );
}
