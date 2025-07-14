import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowBigUpIcon } from "@/components/icons/arrow-big-up";
import { MessageSquareIcon } from "@/components/icons/message-square";
import { cn } from "@/lib/utils";
import { useRef } from "react";

interface MemberActivityCardProps {
  activity: {
    id: string;
    type: "comment";
    content: string;
    timeAgo: string;
    postId: string;
    postTitle: string;
    postSlug?: string;
    categoryName?: string;
    netVotes: number;
  };
  size?: "small" | "medium" | "large";
}

export default function MemberActivityCard({ activity, size = "medium" }: MemberActivityCardProps) {
  const router = useRouter();
  
  // Refs for animated icons
  const upvoteIconRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const commentIconRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);

  const handleClick = () => {
    // Navigate to the post using category/slug pattern
    if (activity.postSlug && activity.categoryName) {
      router.push(`/${activity.categoryName}/${activity.postSlug}`);
    } else {
      // Fallback - this shouldn't happen with proper data
      console.warn('Missing post slug or category for activity:', activity.id);
    }
  };

  return (
    <div className={cn(
      "border rounded-lg transition-all duration-200 group",
      "bg-card hover:bg-muted/30"
    )}>
      {/* Main content - Similar to PostCard layout */}
      <div
        className="cursor-pointer py-2 px-3"
        onClick={handleClick}
      >
        {/* Activity type indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <MessageSquareIcon size={12} />
          <span>Commented on</span>
          <span className="font-medium text-foreground truncate">
            {activity.postTitle}
          </span>
        </div>
        
        {/* Comment content */}
        <div className={cn(
          "text-sm text-foreground",
          size === "small" && "line-clamp-2",
          size === "medium" && "line-clamp-3",
          size === "large" && "line-clamp-4"
        )}>
          {activity.content}
        </div>
        
        {/* Actions bar - Similar to PostCard */}
        <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
          {/* Vote count (read-only for activity) */}
          <div className="flex items-center px-2 py-1">
            <ArrowBigUpIcon
              ref={upvoteIconRef}
              size={12}
              className="mr-1 text-muted-foreground"
            />
            <span className="font-medium">{activity.netVotes}</span>
          </div>
          
          {/* Time ago */}
          <span>{activity.timeAgo}</span>
          
          {/* View thread button */}
          <Button
            variant="ghost"
            size="sm"
            className="px-2 py-1 h-auto hover:bg-muted/50 rounded-sm transition-colors ml-auto"
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
            <span className="font-medium">View thread</span>
          </Button>
        </div>
      </div>
    </div>
  );
}