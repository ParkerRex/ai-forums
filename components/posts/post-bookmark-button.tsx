"use client";

import { Bookmark } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Authenticated, Unauthenticated } from "@/components/auth-wrappers";
import { Button } from "@/components/ui/button";
import { useIsBookmarked, useToggleBookmark } from "@/hooks/use-bookmarks";

interface PostBookmarkButtonProps {
  targetId: string;
  targetType: "post" | "resource";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  variant?: "ghost" | "outline";
  className?: string;
}

export function PostBookmarkButton({
  targetId,
  targetType,
  size = "md",
  showLabel = false,
  variant = "ghost",
  className = "",
}: PostBookmarkButtonProps) {
  const [isBookmarking, setIsBookmarking] = useState(false);
  const toggleBookmark = useToggleBookmark();
  const isBookmarked = useIsBookmarked(targetId, targetType);

  const displayLabel = isBookmarked ? "saved" : "save";

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBookmarking) return;
    setIsBookmarking(true);

    try {
      const result = await toggleBookmark.mutateAsync({
        targetId,
        targetType,
      });

      toast.success(result.bookmarked ? "Added to bookmarks" : "Removed from bookmarks");
    } catch (error) {
      console.error("Error bookmarking:", error);
      toast.error("Failed to update bookmark");
    } finally {
      setIsBookmarking(false);
    }
  };

  const buttonSize = size === "sm" ? "sm" : "sm";

  return (
    <>
      <Authenticated>
        <Button
          variant={variant}
          size={buttonSize}
          className={`hover:bg-muted/50 h-auto rounded-none px-2 py-1 ${className}`}
          onClick={handleToggle}
          disabled={isBookmarking}
        >
          <Bookmark
            size={12}
            className={`transition-colors ${
              isBookmarked ? "fill-blue-500 text-blue-500" : "text-muted-foreground"
            }`}
          />
          {showLabel && <span className="ml-1 text-xs font-medium">{displayLabel}</span>}
        </Button>
      </Authenticated>
      <Unauthenticated>
        <Button
          variant={variant}
          size={buttonSize}
          className={`hover:bg-muted/50 h-auto rounded-none px-2 py-1 ${className}`}
        >
          <Bookmark size={12} className="text-muted-foreground" />
          {showLabel && <span className="ml-1 text-xs font-medium">save</span>}
        </Button>
      </Unauthenticated>
    </>
  );
}

export default PostBookmarkButton;
