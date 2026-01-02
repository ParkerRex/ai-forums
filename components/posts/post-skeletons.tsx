/**
 * Skeleton components for post loading states
 *
 * Used with Suspense for streaming SSR to show loading placeholders
 * while data is being fetched on the server.
 */

export function PostDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Post header skeleton */}
      <div className="mb-6">
        {/* Category badge and metadata */}
        <div className="mb-4 flex items-center gap-2">
          <div className="bg-muted h-6 w-20 animate-pulse rounded-full" />
          <div className="bg-muted h-4 w-48 animate-pulse rounded-sm" />
        </div>

        {/* Post title */}
        <div className="bg-muted mb-4 h-10 animate-pulse rounded-sm" />

        {/* Author and voting section */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-muted h-10 w-10 animate-pulse rounded-full" />
            <div>
              <div className="bg-muted mb-2 h-4 w-32 animate-pulse rounded-sm" />
              <div className="bg-muted h-3 w-24 animate-pulse rounded-sm" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-muted h-8 w-8 animate-pulse rounded-sm" />
            <div className="bg-muted h-6 w-12 animate-pulse rounded-sm" />
          </div>
        </div>
      </div>

      {/* Post content skeleton */}
      <div className="mb-8 space-y-4">
        <div className="bg-muted h-4 animate-pulse rounded-sm" />
        <div className="bg-muted h-4 animate-pulse rounded-sm" />
        <div className="bg-muted h-4 w-5/6 animate-pulse rounded-sm" />
        <div className="bg-muted my-6 h-32 animate-pulse rounded-sm" />
        <div className="bg-muted h-4 animate-pulse rounded-sm" />
        <div className="bg-muted h-4 w-4/5 animate-pulse rounded-sm" />
        <div className="bg-muted h-4 animate-pulse rounded-sm" />
      </div>

      {/* Action buttons skeleton */}
      <div className="mb-8 flex items-center justify-between border-b border-t py-4">
        <div className="flex items-center space-x-4">
          <div className="bg-muted h-9 w-20 animate-pulse rounded-sm" />
          <div className="bg-muted h-9 w-24 animate-pulse rounded-sm" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-muted h-9 w-9 animate-pulse rounded-sm" />
          <div className="bg-muted h-9 w-9 animate-pulse rounded-sm" />
        </div>
      </div>
    </div>
  );
}

export function CommentsSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4">
      <div className="bg-muted mb-4 h-6 w-32 animate-pulse rounded-sm" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-none border p-4">
            <div className="flex items-start space-x-3">
              <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
              <div className="flex-1">
                <div className="bg-muted mb-2 h-4 w-24 animate-pulse rounded-sm" />
                <div className="bg-muted mb-1 h-3 animate-pulse rounded-sm" />
                <div className="bg-muted h-3 w-4/5 animate-pulse rounded-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PostPageSkeleton() {
  return (
    <div className="space-y-8">
      <PostDetailSkeleton />
      <CommentsSkeleton />
    </div>
  );
}
