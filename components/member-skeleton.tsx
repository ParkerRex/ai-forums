import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

/**
 * Skeleton for Member Card component
 * Matches the layout in components/member-card.tsx
 */
export function MemberCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 h-full flex flex-col">
      <div className="flex items-start mb-4">
        {/* Avatar skeleton */}
        <Skeleton className="h-16 w-16 rounded-full mr-4 flex-shrink-0" />
        <div className="flex-1">
          {/* Name skeleton */}
          <Skeleton className="h-6 w-32 mb-2" />
          {/* Status badge skeleton */}
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Bio skeleton - 3 lines */}
      <div className="mb-4 flex-grow">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Metadata section skeleton */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center">
          <Skeleton className="h-3.5 w-3.5 mr-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center">
          <Skeleton className="h-3.5 w-3.5 mr-2" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center">
          <Skeleton className="h-3.5 w-3.5 mr-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Social links skeleton */}
      <div className="flex space-x-3 mt-auto pt-4 border-t border-gray-100">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-5 w-5" />
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
    <div className="bg-white border border-gray-200 rounded-lg p-8">
      <div className="flex flex-col md:flex-row items-start">
        {/* Large avatar skeleton */}
        <Skeleton className="h-32 w-32 rounded-full mr-8 mb-6 md:mb-0 flex-shrink-0" />

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            {/* Name skeleton */}
            <Skeleton className="h-8 w-48" />
            {/* Status badge skeleton */}
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Bio skeleton */}
          <div className="mb-6">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Metadata grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-6">
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-2" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-2" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-2" />
              <Skeleton className="h-3 w-26" />
            </div>
          </div>

          {/* Social links skeleton */}
          <div className="flex space-x-4">
            <div className="flex items-center">
              <Skeleton className="h-5 w-5 mr-1.5" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-5 w-5 mr-1.5" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-5 w-5 mr-1.5" />
              <Skeleton className="h-4 w-14" />
            </div>
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
    <div className="bg-white border border-gray-200 rounded-lg">
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
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
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
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <LoadingIndicator text="Loading..." />
      ) : (
        children
      )}
    </button>
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