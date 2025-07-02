import React, { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { MembershipCTAModal } from "@/components/membership-cta-modal";

interface BookmarkButtonProps {
  targetId: string;
  targetType: "post" | "resource";
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  variant?: "ghost" | "outline";
  className?: string;
}

export function BookmarkButton({ 
  targetId, 
  targetType, 
  size = "md", 
  showCount = false,
  variant = "ghost",
  className = ""
}: BookmarkButtonProps) {
  const [isBookmarking, setIsBookmarking] = useState(false);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
  const isBookmarked = useQuery(api.bookmarks.isBookmarked, {
    targetId,
    targetType,
  });

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBookmarking) return;
    setIsBookmarking(true);

    try {
      await toggleBookmark({
        targetId,
        targetType,
      });
    } catch (error) {
      console.error("Error bookmarking:", error);
    } finally {
      setIsBookmarking(false);
    }
  };

  const iconSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;
  const buttonSize = size === "sm" ? "sm" : "sm";

  return (
    <>
      <Authenticated>
        <Button
          variant={variant}
          size={buttonSize}
          className={`p-2 h-auto hover:bg-muted ${className}`}
          onClick={handleToggle}
          disabled={isBookmarking}
        >
          <Bookmark
            size={iconSize}
            className={`transition-colors ${
              isBookmarked
                ? "text-blue-500 fill-blue-500"
                : "text-muted-foreground hover:text-blue-500"
            }`}
          />
          {showCount && <span className="ml-1 text-xs">save</span>}
        </Button>
      </Authenticated>
      <Unauthenticated>
        <MembershipCTAModal
          title="Save Great Content"
          description="Join VAI to bookmark posts and resources for easy access later"
        >
          <Button
            variant={variant}
            size={buttonSize}
            className={`p-2 h-auto hover:bg-muted ${className}`}
          >
            <Bookmark size={iconSize} className="text-muted-foreground hover:text-blue-500" />
            {showCount && <span className="ml-1 text-xs">save</span>}
          </Button>
        </MembershipCTAModal>
      </Unauthenticated>
    </>
  );
}
