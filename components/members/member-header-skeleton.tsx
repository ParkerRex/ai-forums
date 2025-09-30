import { Skeleton } from "@/components/ui/skeleton";

export default function MemberHeaderSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-md p-6">
      <div className="flex flex-col md:flex-row items-start">
        {/* Avatar skeleton */}
        <Skeleton className="h-24 w-24 rounded-full mr-6 mb-4 md:mb-0 flex-shrink-0" />

        <div className="flex-1 w-full">
          {/* Name and badges skeleton */}
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-8 w-64" />
            <div className="flex items-center space-x-3">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>

          {/* Bio skeleton */}
          <div className="space-y-2 mb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>

          {/* Skills skeleton */}
          <div className="mb-6">
            <Skeleton className="h-4 w-16 mb-2" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-18" />
              <Skeleton className="h-6 w-22" />
            </div>
          </div>

          {/* Info grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Social links skeleton */}
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-18" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
