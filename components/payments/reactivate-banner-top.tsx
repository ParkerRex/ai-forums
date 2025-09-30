"use client";

import { useQuery } from "convex/react";
import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

/**
 * ReactivateBannerTop component displays a prominent banner at the top of the page
 * prompting users to reactivate their deactivated account. This banner is designed
 * to be highly visible and encourage immediate action from users whose subscriptions
 * have been cancelled or expired.
 *
 * The banner features:
 * - Full-width layout that spans the entire top of the page
 * - Warning message about account deactivation
 * - Prominent call-to-action button for reactivation
 * - Dismiss functionality to temporarily hide the banner
 *
 * @returns JSX.Element - The top reactivate banner component
 */
export function ReactivateBannerTop() {
  const [isVisible, setIsVisible] = useState(true);
  const subscriptionInfo = useQuery(api.stripe.getSubscriptionInfo.getSubscriptionInfo);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  // Don't show banner if:
  // - User has active subscription
  // - User has never had a subscription (free tier)
  // - Banner was dismissed
  // - Still loading subscription info
  if (!isVisible || !subscriptionInfo || subscriptionInfo.isActive) {
    return null;
  }

  // Only show for expired/cancelled subscriptions
  if (!subscriptionInfo.isExpired && !subscriptionInfo.isCancelled) {
    return null;
  }

  // Get personalized pricing based on their previous tier
  const getTierPricing = () => {
    switch (subscriptionInfo.tier) {
      case "founding_member":
        return {
          name: "Founding Member",
          monthly: "$39/mo",
          yearly: "$375/yr",
          savings: "Save $93 with yearly",
        };
      case "early_bird":
        return {
          name: "Early Bird",
          monthly: "$50/mo",
          yearly: "$480/yr",
          savings: "Save $120 with yearly",
        };
      default:
        return {
          name: "Pro",
          monthly: "$99/mo",
          yearly: "$950/yr",
          savings: "Save $238 with yearly",
        };
    }
  };

  const tierInfo = getTierPricing();

  return (
    <div className="w-full bg-black dark:bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center gap-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white dark:bg-black/10 dark:text-black">
              {tierInfo.name}
            </span>
            <p className="text-sm font-medium text-white dark:text-black">Your plan has expired</p>
            <span className="text-white/60 dark:text-black/60">•</span>
            <Link
              href="/reactivate"
              className="inline-flex items-center gap-1 text-sm font-semibold text-white underline decoration-white/30 transition-colors hover:text-white/80 hover:decoration-white/60 dark:text-black dark:decoration-black/30 dark:hover:text-black/80 dark:hover:decoration-black/60"
            >
              Reactivate for {tierInfo.monthly}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="absolute right-0 h-6 w-6 cursor-pointer p-0 text-white/60 transition-colors hover:bg-white/10 hover:text-white dark:text-black/60 dark:hover:bg-black/10 dark:hover:text-black"
            aria-label="Dismiss reactivation banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
