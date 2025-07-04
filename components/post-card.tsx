import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowBigUpIcon } from "@/components/ui/arrow-big-up";
import { MessageSquareIcon } from "@/components/ui/message-square";
import { RabbitIcon } from "@/components/ui/rabbit";
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
    <div className="bg-card border border-border/50 rounded-lg hover:border-border hover:shadow-md transition-all duration-200 group">
      <div className="flex">
        {/* Voting panel back on the left */}
        <div className="flex flex-col items-center p-3 space-y-1 bg-muted/20 rounded-l-lg">
          <Authenticated>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-auto hover:bg-muted rounded-full"
              onClick={handleUpvote}
              disabled={isVoting}
              onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
              onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
            >
              <ArrowBigUpIcon
                ref={upvoteIconRef}
                size={20}
                className={`transition-colors ${
                  currentUserVote === "upvote"
                    ? "text-orange-500 fill-orange-500"
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
                className="p-2 h-auto hover:bg-muted rounded-full"
                onMouseEnter={() => upvoteIconRef.current?.startAnimation()}
                onMouseLeave={() => upvoteIconRef.current?.stopAnimation()}
              >
                <ArrowBigUpIcon
                  ref={upvoteIconRef}
                  size={20}
                  className="text-muted-foreground hover:text-orange-500"
                />
              </Button>
            </MembershipCTAModal>
          </Unauthenticated>
          <span className="text-sm font-bold text-foreground">
            {optimisticNetVotes}
          </span>
        </div>

        {/* Main content using PostPreview */}
        <div
          className="flex-1 cursor-pointer group-hover:bg-muted/5 transition-colors duration-200"
          onClick={handleClick}
        >
          <PostPreview
            post={post as PostData}
            size={size}
            showStats={false}
            showCategory={true}
            showMember={true}
            className="border-0 shadow-none hover:shadow-none hover:scale-100"
          />
        </div>
      </div>

      {/* Actions bar */}
      <div className="border-t border-border/30 px-4 py-2 bg-muted/10">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <Authenticated>
            <Button
              variant="ghost"
              size="sm"
              className="px-3 py-1.5 h-auto hover:bg-muted hover:text-foreground rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              onMouseEnter={() => commentIconRef.current?.startAnimation()}
              onMouseLeave={() => commentIconRef.current?.stopAnimation()}
            >
              <MessageSquareIcon
                ref={commentIconRef}
                size={16}
                className="mr-1.5"
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
                className="px-3 py-1.5 h-auto hover:bg-muted hover:text-foreground rounded-full transition-colors"
                onMouseEnter={() => commentIconRef.current?.startAnimation()}
                onMouseLeave={() => commentIconRef.current?.stopAnimation()}
              >
                <MessageSquareIcon
                  ref={commentIconRef}
                  size={16}
                  className="mr-1.5"
                />
                <span className="font-medium">{post.commentCount}</span>
              </Button>
            </MembershipCTAModal>
          </Unauthenticated>
          <BookmarkButton targetId={post._id} targetType="post" size="sm" />

          <Button
            variant="ghost"
            size="sm"
            className="px-3 py-1.5 h-auto hover:bg-muted hover:text-foreground rounded-full transition-colors"
            onClick={handleShare}
            onMouseEnter={() => shareIconRef.current?.startAnimation()}
            onMouseLeave={() => shareIconRef.current?.stopAnimation()}
          >
            <RabbitIcon ref={shareIconRef} size={16} className="mr-1.5" />
            <span className="font-medium">share</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
