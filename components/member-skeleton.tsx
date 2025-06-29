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
    <div className="bg-card border border-border rounded-lg p-6 h-full flex flex-col">
      <div className="animate-pulse space-y-4">
        {/* Avatar and basic info */}
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-muted rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>

        {/* Status badge */}
        <div className="h-6 bg-muted rounded w-20"></div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-full"></div>
          <div className="h-3 bg-muted rounded w-5/6"></div>
          <div className="h-3 bg-muted rounded w-4/6"></div>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-16"></div>
          <div className="flex flex-wrap gap-1">
            <div className="h-6 bg-muted rounded w-12"></div>
            <div className="h-6 bg-muted rounded w-16"></div>
            <div className="h-6 bg-muted rounded w-14"></div>
          </div>
        </div>

        {/* Social links */}
        <div className="flex space-x-2">
          <div className="w-8 h-8 bg-muted rounded"></div>
          <div className="w-8 h-8 bg-muted rounded"></div>
          <div className="w-8 h-8 bg-muted rounded"></div>
        </div>

        {/* Member since */}
        <div className="h-3 bg-muted rounded w-24"></div>
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
    <div className="bg-card border border-border rounded-lg p-8">
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-muted rounded-full"></div>
            <div className="space-y-3">
              <div className="h-6 bg-muted rounded w-48"></div>
              <div className="h-4 bg-muted rounded w-32"></div>
              <div className="h-5 bg-muted rounded w-20"></div>
            </div>
          </div>
          <div className="h-10 bg-muted rounded w-24"></div>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <div className="h-5 bg-muted rounded w-16 mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-4 bg-muted rounded w-4/6"></div>
          </div>
        </div>

        {/* Skills */}
        <div className="mb-8">
          <div className="h-5 bg-muted rounded w-16 mb-3"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-7 bg-muted rounded w-16"></div>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div className="mb-8">
          <div className="h-5 bg-muted rounded w-24 mb-3"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div>
          <div className="h-5 bg-muted rounded w-20 mb-3"></div>
          <div className="flex space-x-4">
            <div className="w-10 h-10 bg-muted rounded"></div>
            <div className="w-10 h-10 bg-muted rounded"></div>
            <div className="w-10 h-10 bg-muted rounded"></div>
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
    <div className="bg-card border border-border rounded-lg">
      <div className="flex">
        {/* Voting section skeleton */}
        <div className="flex flex-col items-center p-4 space-y-1">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-6 w-6" />
        </div>

        {/* Content section skeleton */}
        <div className="flex-1 p-4 pl-0">
          {/* Metadata line skeleton */}
          <div className="flex items-center mb-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-1 mx-2" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16 ml-1" />
            <Skeleton className="h-3 w-1 mx-2" />
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Title skeleton */}
          <Skeleton className="h-6 w-3/4 mb-2" />

          {/* Content skeleton */}
          <div className="mb-4">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>

          {/* Action buttons skeleton */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-1" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-1" />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-1" />
              <Skeleton className="h-4 w-8" />
            </div>
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
    <div className="bg-muted/30 border border-border rounded-lg p-4">
      {/* Comment content skeleton */}
      <div className="mb-2">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Metadata skeleton */}
      <div className="flex items-center">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-6 mx-1" />
        <Skeleton className="h-3 w-24" />
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
  className = ""
}: {
  size?: "xs" | "sm" | "md" | "lg";
  text?: string;
  className?: string;
}) {
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Loader2 className={`animate-spin text-gray-500 ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-gray-500">{text}</span>}
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
  children = "Load More"
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
      className="w-full py-3 px-4 border border-border rounded-lg text-foreground hover:bg-muted hover:border-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
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
  className = ""
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    <div className="space-y-6">
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
    <div className="space-y-4">
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
    lg: "w-8 h-8"
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <Loader2 className={`animate-spin text-muted-foreground ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
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
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {action}
    </div>
  );
}

export function MemberEditFormSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="p-6 border-b border-border">
        <div className="h-6 bg-muted rounded w-32"></div>
      </div>
      <div className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-16"></div>
          <div className="h-24 bg-muted rounded"></div>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-16"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex">
              <div className="h-10 bg-muted rounded-l w-20"></div>
              <div className="h-10 bg-muted rounded-r flex-1"></div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3">
          <div className="h-10 bg-muted rounded w-20"></div>
          <div className="h-10 bg-muted rounded w-24"></div>
        </div>
      </div>
    </div>
  );
}

export function MemberListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <MemberCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MemberStatsCardSkeleton() {
  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-muted rounded w-24"></div>
        <div className="h-8 bg-muted rounded w-16"></div>
        <div className="h-3 bg-muted rounded w-32"></div>
      </div>
    </div>
  );
} 