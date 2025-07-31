"use client";

import React from "react";
import { Badge } from "@/web/components/ui/badge";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTierName } from "@/lib/format";

interface TierBadgeProps {
  tier: "founding_member" | "early_bird" | "member";
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

// Tier badge colors matching member-profile.tsx
// Note: No free tier - platform operates with zero free users
// Scholarships handled via Stripe coupons with early_bird tier
const tierVariants = {
  founding_member:
    "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  early_bird:
    "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  member: "bg-foreground text-background border-foreground",
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-0.5",
  lg: "text-base px-3 py-1",
};

const iconSizes = {
  sm: 12,
  md: 14,
  lg: 16,
};

export function TierBadge({
  tier,
  size = "md",
  className,
  showIcon = true,
}: TierBadgeProps) {
  const isFoundingMember = tier === "founding_member";

  return (
    <Badge
      variant="outline"
      className={cn(
        tierVariants[tier],
        sizeClasses[size],
        "font-medium",
        className,
      )}
    >
      {isFoundingMember && showIcon && (
        <Star className="mr-1 fill-current" size={iconSizes[size]} />
      )}
      {formatTierName(tier)}
    </Badge>
  );
}
