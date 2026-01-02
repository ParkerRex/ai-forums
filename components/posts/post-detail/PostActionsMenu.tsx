"use client";

import { Edit, Flag, History, MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePinPost, useUnpinPost } from "@/hooks/use-posts";
import type { Post } from "./types";

interface PostActionsMenuProps {
  post: Post;
  isAdmin: boolean;
  isMemberPost: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
}

export function PostActionsMenu({
  post,
  isAdmin,
  isMemberPost,
  onEdit,
  onDelete,
  onViewHistory,
}: PostActionsMenuProps) {
  const pinPostMutation = usePinPost();
  const unpinPostMutation = useUnpinPost();

  const handleHighlight = async (scope: "category" | "global" | "both") => {
    try {
      await pinPostMutation.mutateAsync({ postId: post.id, scope });
      const scopeText =
        scope === "both"
          ? "in both category and globally"
          : scope === "global"
            ? "globally"
            : `in ${post.category?.displayName || "category"}`;
      toast.success(`Post highlighted ${scopeText}`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleUnhighlight = async () => {
    try {
      await unpinPostMutation.mutateAsync(post.id);
      toast.success("Post unhighlighted");
    } catch {
      toast.error("Failed to unhighlight post");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          data-testid="post-more-menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onViewHistory}>
          <History className="mr-2 h-4 w-4" />
          View History
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Flag className="mr-2 h-4 w-4" />
          Report
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            {post.isPinned ? (
              <DropdownMenuItem onClick={handleUnhighlight}>
                <PinOff className="mr-2 h-4 w-4" />
                Remove Highlight
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => handleHighlight("category")}>
                  <Pin className="mr-2 h-4 w-4" />
                  Highlight in Category
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleHighlight("global")}>
                  <Pin className="mr-2 h-4 w-4" />
                  Highlight Globally
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleHighlight("both")}>
                  <Pin className="mr-2 h-4 w-4" />
                  Highlight in Both
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
        {isMemberPost && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Post
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Post
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
