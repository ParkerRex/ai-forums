"use client";

import { Skeleton } from "@/web/components/ui/skeleton";

export function SubscriptionStatusSkeleton() {
  return (
    <div className="mb-6 flex items-center gap-2">
      {/* Tier badge skeleton */}
      <Skeleton className="h-6 w-24 rounded-full" />

      {/* Billing interval skeleton */}
      <Skeleton className="h-5 w-16 rounded-full" />

      {/* Manage button skeleton */}
      <Skeleton className="ml-auto h-8 w-32 rounded-md" />
    </div>
  );
}

export function MemberProfileHeaderSkeleton() {
  return (
    <div className="mb-2 flex items-center justify-between">
      {/* Name skeleton */}
      <Skeleton className="h-9 w-48" />

      {/* Edit button skeleton */}
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
  );
}
