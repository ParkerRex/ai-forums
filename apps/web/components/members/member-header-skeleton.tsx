import { Skeleton } from "../components/ui/skeleton";

export default function MemberHeaderSkeleton() {
  return (
    <div className="bg-card border-border/50 rounded-md border p-6">
      <div className="flex flex-col items-start md:flex-row">
        {/* Avatar skeleton */}
        <Skeleton className="mb-4 mr-6 h-24 w-24 flex-shrink-0 rounded-full md:mb-0" />

        <div className="w-full flex-1">
          {/* Name and badges skeleton */}
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <div className="flex items-center space-x-3">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>

          {/* Bio skeleton */}
          <div className="mb-6 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>

          {/* Skills skeleton */}
          <div className="mb-6">
            <Skeleton className="mb-2 h-4 w-16" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="w-18 h-6" />
              <Skeleton className="w-22 h-6" />
            </div>
          </div>

          {/* Info grid skeleton */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Social links skeleton */}
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="w-18 h-8" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
