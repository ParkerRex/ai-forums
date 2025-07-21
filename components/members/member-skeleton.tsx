import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Export the header skeleton from the dedicated component
export { default as MemberHeaderSkeleton } from "./member-header-skeleton";

/**
 * Skeleton for Member Card component
 * Matches the layout in components/member-card.tsx
 */
export function MemberCardSkeleton() {
  return (
    <div className="bg-card border-border/50 flex h-full flex-col rounded-md border p-3">
      <div className="animate-pulse space-y-4">
        {/* Avatar and basic info */}
        <div className="flex items-center space-x-3">
          <div className="bg-muted h-12 w-12 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="bg-muted h-4 w-3/4 rounded"></div>
            <div className="bg-muted h-3 w-1/2 rounded"></div>
          </div>
        </div>

        {/* Status badge */}
        <div className="bg-muted h-5 w-16 rounded"></div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="bg-muted h-3 w-full rounded"></div>
          <div className="bg-muted h-3 w-5/6 rounded"></div>
          <div className="bg-muted h-3 w-4/6 rounded"></div>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <div className="bg-muted h-3 w-16 rounded"></div>
          <div className="flex flex-wrap gap-1">
            <div className="bg-muted h-6 w-12 rounded"></div>
            <div className="bg-muted h-6 w-16 rounded"></div>
            <div className="bg-muted h-6 w-14 rounded"></div>
          </div>
        </div>

        {/* Social links */}
        <div className="flex space-x-2">
          <div className="bg-muted h-6 w-6 rounded"></div>
          <div className="bg-muted h-6 w-6 rounded"></div>
          <div className="bg-muted h-6 w-6 rounded"></div>
        </div>

        {/* Member since */}
        <div className="bg-muted h-3 w-24 rounded"></div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Member Profile component
 * Matches the layout in components/member-profile.tsx
 */
export function MemberProfileSkeleton() {
  return (
    <div className="bg-card border-border rounded-none border p-8">
      <div className="animate-pulse">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center space-x-6">
            <div className="bg-muted h-24 w-24 rounded-full"></div>
            <div className="space-y-3">
              <div className="bg-muted h-6 w-48 rounded"></div>
              <div className="bg-muted h-4 w-32 rounded"></div>
              <div className="bg-muted h-5 w-20 rounded"></div>
            </div>
          </div>
          <div className="bg-muted h-10 w-24 rounded"></div>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <div className="bg-muted mb-3 h-5 w-16 rounded"></div>
          <div className="space-y-2">
            <div className="bg-muted h-4 w-full rounded"></div>
            <div className="bg-muted h-4 w-5/6 rounded"></div>
            <div className="bg-muted h-4 w-4/6 rounded"></div>
          </div>
        </div>

        {/* Skills */}
        <div className="mb-8">
          <div className="bg-muted mb-3 h-5 w-16 rounded"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-muted h-7 w-16 rounded"></div>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div className="mb-8">
          <div className="bg-muted mb-3 h-5 w-24 rounded"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="bg-muted h-4 w-3/4 rounded"></div>
                <div className="bg-muted h-3 w-1/2 rounded"></div>
                <div className="bg-muted h-3 w-full rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div>
          <div className="bg-muted mb-3 h-5 w-20 rounded"></div>
          <div className="flex space-x-4">
            <div className="bg-muted h-10 w-10 rounded"></div>
            <div className="bg-muted h-10 w-10 rounded"></div>
            <div className="bg-muted h-10 w-10 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Post Card component
 * Matches the layout in components/post-card.tsx
 */
export function PostCardSkeleton() {
  return (
    <div className="bg-card border-border/50 rounded-md border">
      <div className="flex">
        {/* Voting section skeleton */}
        <div className="bg-muted/30 flex flex-col items-center space-y-0.5 p-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-6" />
        </div>

        {/* Content section skeleton */}
        <div className="flex-1 p-3">
          {/* Metadata line skeleton */}
          <div className="mb-2 flex items-center">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mx-2 h-3 w-1" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="ml-1 h-3 w-16" />
            <Skeleton className="mx-2 h-3 w-1" />
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Title skeleton */}
          <Skeleton className="mb-2 h-6 w-3/4" />

          {/* Content skeleton */}
          <div className="mb-4">
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      {/* Action bar skeleton */}
      <div className="border-border/50 border-t px-3 py-1.5">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <Skeleton className="mr-1 h-3 w-3" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center">
            <Skeleton className="mr-1 h-3 w-3" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="flex items-center">
            <Skeleton className="mr-1 h-3 w-3" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Activity/Comment component
 * Matches the activity layout in app/members/[id]/page.tsx
 */
export function ActivitySkeleton() {
  return (
    <div className="bg-muted/30 border-border/50 rounded-md border p-3">
      {/* Comment content skeleton */}
      <div className="mb-2">
        <Skeleton className="mb-1 h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>

      {/* Metadata skeleton */}
      <div className="flex items-center">
        <Skeleton className="h-3 w-6" />
        <Skeleton className="mx-1 h-3 w-4" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/**
 * Loading indicator for user actions
 * Reusable component for buttons, forms, etc.
 */
export function LoadingIndicator({
  size = "sm",
  text,
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  text?: string;
  className?: string;
}) {
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Loader2
        className={`text-muted-foreground animate-spin ${sizeClasses[size]}`}
      />
      {text && <span className="text-muted-foreground text-sm">{text}</span>}
    </div>
  );
}

/**
 * Load More button with loading state
 * Prepared for future pagination implementation
 */
export function LoadMoreButton({
  onClick,
  isLoading,
  disabled,
  children = "Load More",
}: {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      variant="outline"
      className="border-border text-foreground hover:bg-muted hover:border-muted-foreground w-full rounded-none border px-4 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * Section loading wrapper
 * Shows loading state for individual sections
 */
export function SectionLoader({
  isLoading,
  skeleton,
  children,
  className = "",
}: {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`transition-opacity duration-300 ${className}`}>
      {isLoading ? skeleton : children}
    </div>
  );
}

/**
 * Grid of member card skeletons for loading states
 */
export function MemberCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <MemberCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * List of post skeletons for loading states
 */
export function PostSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * List of activity skeletons for loading states
 */
export function ActivitySkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <ActivitySkeleton key={i} />
      ))}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <Loader2
        className={`text-muted-foreground animate-spin ${sizeClasses[size]}`}
      />
      {text && <span className="text-muted-foreground text-sm">{text}</span>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-12 text-center">
      <h3 className="text-foreground mb-2 text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {action}
    </div>
  );
}

export function MemberEditFormSkeleton() {
  return (
    <div className="bg-card border-border/50 rounded-md border">
      <div className="border-border/50 border-b p-4">
        <div className="bg-muted h-5 w-32 rounded"></div>
      </div>
      <div className="space-y-4 p-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="bg-muted h-4 w-20 rounded"></div>
            <div className="bg-muted h-10 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="bg-muted h-4 w-20 rounded"></div>
            <div className="bg-muted h-10 rounded"></div>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="bg-muted h-4 w-16 rounded"></div>
          <div className="bg-muted h-24 rounded"></div>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <div className="bg-muted h-4 w-16 rounded"></div>
          <div className="bg-muted h-10 rounded"></div>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex">
              <div className="bg-muted h-10 w-20 rounded-l"></div>
              <div className="bg-muted h-10 flex-1 rounded-r"></div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3">
          <div className="bg-muted h-10 w-20 rounded"></div>
          <div className="bg-muted h-10 w-24 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function MemberListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <MemberCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MemberStatsCardSkeleton() {
  return (
    <div className="bg-muted/50 border-border/50 rounded-md border p-3">
      <div className="animate-pulse space-y-2">
        <div className="bg-muted h-3 w-20 rounded"></div>
        <div className="bg-muted h-6 w-14 rounded"></div>
        <div className="bg-muted h-3 w-28 rounded"></div>
      </div>
    </div>
  );
}
