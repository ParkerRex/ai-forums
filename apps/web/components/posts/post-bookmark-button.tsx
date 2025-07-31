/**
 * @fileoverview Bookmark button component for saving and unsaving posts and resources.
 * This component provides a unified interface for users to bookmark content across the application.
 * It handles authentication states, loading states, and provides visual feedback for bookmark actions.
 *
 * Key Features:
 * - Toggle bookmark functionality (save/unsave)
 * - Authentication-aware rendering
 * - Visual feedback with filled/unfilled bookmark icon
 * - Configurable size, label, and styling options
 * - Membership CTA for unauthenticated users
 * - Toast notifications for user feedback
 * - Loading states during API calls
 *
 * @author VAI Team
 * @since 1.0.0
 */

import React, { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/web/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { toast } from "sonner";

interface PostBookmarkButtonProps {
  targetId: string;
  targetType: "post" | "resource";
  size?: "sm" | "md" | "lg";
  /** @deprecated Use showLabel instead */
  showCount?: boolean;
  showLabel?: boolean;
  variant?: "ghost" | "outline";
  className?: string;
}

export function PostBookmarkButton({
  targetId,
  targetType,
  size = "md",
  showCount = false,
  showLabel = false,
  variant = "ghost",
  className = "",
}: PostBookmarkButtonProps) {
  const [isBookmarking, setIsBookmarking] = useState(false);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
  const isBookmarked = useQuery(api.bookmarks.isBookmarked, {
    targetId,
    targetType,
  });

  const shouldShowLabel = showLabel || showCount;
  const displayLabel = isBookmarked ? "saved" : "save";

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBookmarking) return;
    setIsBookmarking(true);

    try {
      const result = await toggleBookmark({
        targetId,
        targetType,
      });

      toast.success(
        result.bookmarked ? "Added to bookmarks" : "Removed from bookmarks",
      );
    } catch (error) {
      console.error("Error bookmarking:", error);
      toast.error("Failed to update bookmark");
    } finally {
      setIsBookmarking(false);
    }
  };

  // Using fixed icon size of 12 for Reddit-style design
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
              isBookmarked
                ? "fill-blue-500 text-blue-500"
                : "text-muted-foreground"
            }`}
          />
          {shouldShowLabel && (
            <span className="ml-1 text-xs font-medium">{displayLabel}</span>
          )}
        </Button>
      </Authenticated>
      <Unauthenticated>
        <Button
          variant={variant}
          size={buttonSize}
          className={`hover:bg-muted/50 h-auto rounded-none px-2 py-1 ${className}`}
        >
          <Bookmark size={12} className="text-muted-foreground" />
          {shouldShowLabel && (
            <span className="ml-1 text-xs font-medium">save</span>
          )}
        </Button>
      </Unauthenticated>
    </>
  );
}

/**
 * Export the BookmarkButton component as the default export.
 * This allows for easier imports throughout the application.
 */
export default PostBookmarkButton;
