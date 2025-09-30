"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function SubscriptionStatusSkeleton() {
  return (
    <div className="flex items-center gap-2 mb-6">
      {/* Tier badge skeleton */}
      <Skeleton className="h-6 w-24 rounded-full" />

      {/* Billing interval skeleton */}
      <Skeleton className="h-5 w-16 rounded-full" />

      {/* Manage button skeleton */}
      <Skeleton className="h-8 w-32 rounded-md ml-auto" />
    </div>
  );
}

export function MemberProfileHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-2">
      {/* Name skeleton */}
      <Skeleton className="h-9 w-48" />

      {/* Edit button skeleton */}
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
  );
}
