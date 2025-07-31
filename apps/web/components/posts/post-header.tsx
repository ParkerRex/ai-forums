"use client";
import React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Id } from "@/web/convex/_generated/dataModel";
import { Skeleton } from "@/web/components/ui/skeleton";
import { usePathname } from "next/navigation";
import PostHeaderSkeleton from "@/web/components/posts/post-header-skeleton";
import { HomeIcon, HomeIconHandle } from "@/web/components/icons/home";
import { Button } from "@/web/components/ui/button";
import { ClapIcon } from "@/web/components/icons/clap";
import { SquareStackIcon } from "@/web/components/icons/square-stack";
import { FlaskIcon } from "@/web/components/icons/flask";
import { FlameIcon } from "@/web/components/icons/flame";
import { PartyPopperIcon } from "@/web/components/icons/party-popper";
import { SortPopover } from "@/web/components/posts/sort-popover";

interface PostHeaderProps {
  sortBy?: "newest" | "popular" | "trending";
  onSortChange?: (sort: "newest" | "popular" | "trending") => void;
}

// Type for category icon refs
type CategoryIconRef = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export default function PostHeader({
  sortBy = "newest",
  onSortChange,
}: PostHeaderProps) {
  const homeIconRef = React.useRef<HomeIconHandle>(null);
  const categoryIconRefs = React.useRef<{
    [key: string]: CategoryIconRef | null;
  }>({});
  const categories = useQuery(api.categories.getCategories) as
    | Array<{
        _id: Id<"categories">;
        name: string;
        displayName: string;
        description: string;
        icon?: string;
        postCount: number;
      }>
    | undefined;
  const pathname = usePathname();

  // Show skeleton while categories are loading
  if (categories === undefined) {
    return <PostHeaderSkeleton />;
  }

  // Icon mapping for categories
  const getCategoryIcon = (
    categoryName: string,
    isActive: boolean,
    categoryId: string,
  ) => {
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
      <div className="mb-6 flex items-center justify-between">
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
          {categories === undefined ? (
            // Loading state
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))
          ) : categories?.length === 0 ? (
            <span className="text-muted-foreground text-sm">
              No categories available
            </span>
          ) : (
            categories?.map((category) => {
              const isActive = pathname === `/${category.name}`;

              return (
                <Button
                  key={category._id}
                  variant="ghost"
                  size="sm"
                  className={`px-2 ${isActive ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  asChild
                >
                  <Link
                    href={`/${category.name}`}
                    className="flex items-center gap-1"
                    prefetch={true}
                    onMouseEnter={() =>
                      handleCategoryIconAnimation(category._id, true)
                    }
                    onMouseLeave={() =>
                      handleCategoryIconAnimation(category._id, false)
                    }
                  >
                    {getCategoryIcon(category.name, isActive, category._id)}
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
