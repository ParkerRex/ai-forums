"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

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
  if (!isVisible || !subscriptionInfo || subscriptionInfo.isActive || subscriptionInfo.tier === "free") {
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
          savings: "Save $93 with yearly"
        };
      case "early_bird":
        return { 
          name: "Early Bird", 
          monthly: "$50/mo", 
          yearly: "$480/yr",
          savings: "Save $120 with yearly"
        };
      default:
        return { 
          name: "Pro", 
          monthly: "$99/mo", 
          yearly: "$950/yr",
          savings: "Save $238 with yearly"
        };
    }
  };

  const tierInfo = getTierPricing();

  return (
    <div className="w-full bg-black dark:bg-[#272727] h-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-4 h-12 relative">
          <p className="text-sm font-medium text-white">
            Your {tierInfo.name} plan has expired — 
            <Link href="/reactivate" className="underline hover:no-underline">
              Reactivate for {tierInfo.monthly}
            </Link>
          </p>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-white hover:text-gray-300 hover:bg-gray-800 absolute right-0 cursor-pointer"
            aria-label="Dismiss reactivation banner"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
