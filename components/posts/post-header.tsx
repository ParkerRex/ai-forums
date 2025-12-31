"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { ClapIcon } from "@/components/icons/clap";
import { FlameIcon } from "@/components/icons/flame";
import { FlaskIcon } from "@/components/icons/flask";
import { HomeIcon, type HomeIconHandle } from "@/components/icons/home";
import { PartyPopperIcon } from "@/components/icons/party-popper";
import { SquareStackIcon } from "@/components/icons/square-stack";
import PostHeaderSkeleton from "@/components/posts/post-header-skeleton";
import { SortPopover } from "@/components/posts/sort-popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/use-categories";

interface PostHeaderProps {
  sortBy?: "newest" | "popular" | "trending";
  onSortChange?: (sort: "newest" | "popular" | "trending") => void;
}

// Type for category icon refs
type CategoryIconRef = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export default function PostHeader({ sortBy = "newest", onSortChange }: PostHeaderProps) {
  const homeIconRef = React.useRef<HomeIconHandle>(null);
  const categoryIconRefs = React.useRef<{ [key: string]: CategoryIconRef | null }>({});
  const { data: categoriesData, isLoading } = useCategories();
  const categories = categoriesData?.items;
  const pathname = usePathname();

  // Show skeleton while categories are loading
  if (isLoading) {
    return <PostHeaderSkeleton />;
  }

  // Icon mapping for categories
  const getCategoryIcon = (categoryName: string, _isActive: boolean, categoryId: string) => {
    const iconProps = {
      size: 16,
      ref: (ref: CategoryIconRef | null) => {
        categoryIconRefs.current[categoryId] = ref;
      },
    };

    switch (categoryName) {
      case "content":
        return <ClapIcon {...iconProps} />;
      case "connect":
        return <SquareStackIcon {...iconProps} />;
      case "prompts":
        return <FlaskIcon {...iconProps} />;
      case "workflows":
        return <FlameIcon {...iconProps} />;
      case "announcements":
        return <PartyPopperIcon {...iconProps} />;
      default:
        return null;
    }
  };

  // Handle category icon animation
  const handleCategoryIconAnimation = (categoryId: string, start: boolean) => {
    const iconRef = categoryIconRefs.current[categoryId];
    if (iconRef) {
      if (start) {
        iconRef.startAnimation();
      } else {
        iconRef.stopAnimation();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-6 overflow-x-auto pb-2">
          {/* All Posts Tab */}
          <Button
            variant="ghost"
            size="sm"
            className={`px-2 ${pathname === "/" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            onMouseEnter={() => homeIconRef.current?.startAnimation()}
            onMouseLeave={() => homeIconRef.current?.stopAnimation()}
            asChild
          >
            <Link href="/" className="flex items-center gap-1" prefetch={true}>
              <HomeIcon ref={homeIconRef} size={16} />
              <span>all posts</span>
            </Link>
          </Button>

          {/* Category Tabs */}
          {!categories || categories.length === 0 ? (
            <span className="text-muted-foreground text-sm">No categories available</span>
          ) : (
            categories.map((category) => {
              const isActive = pathname === `/${category.name}`;

              return (
                <Button
                  key={category.id}
                  variant="ghost"
                  size="sm"
                  className={`px-2 ${isActive ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  asChild
                >
                  <Link
                    href={`/${category.name}`}
                    className="flex items-center gap-1"
                    prefetch={true}
                    onMouseEnter={() => handleCategoryIconAnimation(category.id, true)}
                    onMouseLeave={() => handleCategoryIconAnimation(category.id, false)}
                  >
                    {getCategoryIcon(category.name, isActive, category.id)}
                    <span>/{category.name}</span>
                  </Link>
                </Button>
              );
            })
          )}

          {/* Sort Options */}
          {onSortChange && (
            <div className="ml-6">
              <SortPopover sortBy={sortBy} onSortChange={onSortChange} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
