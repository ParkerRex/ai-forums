import { Skeleton } from "@/web/components/ui/skeleton";

export default function PostSidebarSkeleton() {
  return (
    <div className="space-y-2">
      {/* Online Users Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-2 py-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="ml-auto h-1.5 w-1.5 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-3" />
        </div>
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}
