import { Skeleton } from "@/components/ui/skeleton";

export default function PostHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-6 overflow-x-auto pb-2">
          {/* All Posts Tab Skeleton */}
          <Skeleton className="h-6 w-20" />
          
          {/* Category Tabs Skeletons */}
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-24" />
          ))}
        </div>

        {/* Sort Options Skeleton */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
} 