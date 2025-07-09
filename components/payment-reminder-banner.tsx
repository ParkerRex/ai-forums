"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AlertCircle, X } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function PaymentReminderBanner() {
  const subscriptionInfo = useQuery(api.stripe.getSubscriptionInfo.getSubscriptionInfo);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem("payment-reminder-dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("payment-reminder-dismissed", "true");
  };

  // Don't show banner if:
  // - User is not logged in
  // - Subscription info is loading
  // - Banner was dismissed
  // - User doesn't have an active subscription
  // - Renewal is more than 7 days away
  if (!subscriptionInfo || isDismissed || !subscriptionInfo.isActive) {
    return null;
  }

  const daysUntilRenewal = subscriptionInfo.renewalInfo?.daysUntilRenewal;
  if (!daysUntilRenewal || daysUntilRenewal > 7) {
    return null;
  }

  // Determine banner styling based on urgency
  const bannerClasses = cn(
    "relative w-full px-4 py-3 text-sm font-medium text-center",
    {
      "bg-yellow-50 text-yellow-900 border-b border-yellow-200": daysUntilRenewal > 3,
      "bg-orange-50 text-orange-900 border-b border-orange-200": daysUntilRenewal <= 3 && daysUntilRenewal > 1,
      "bg-red-50 text-red-900 border-b border-red-200": daysUntilRenewal <= 1,
    }
  );

  const iconClasses = cn(
    "inline-block w-4 h-4 mr-2",
    {
      "text-yellow-600": daysUntilRenewal > 3,
      "text-orange-600": daysUntilRenewal <= 3 && daysUntilRenewal > 1,
      "text-red-600": daysUntilRenewal <= 1,
    }
  );

  return (
    <div className={bannerClasses}>
      <AlertCircle className={iconClasses} />
      <span>
        Your {subscriptionInfo.tierDisplay} subscription {subscriptionInfo.renewalInfo?.renewalText}.
      </span>
      {subscriptionInfo.cancelAtPeriodEnd ? (
        <span className="ml-1">
          Your subscription is set to cancel. 
          <Link href="/settings/billing" className="ml-1 underline hover:no-underline">
            Reactivate
          </Link>
        </span>
      ) : (
        <Link href="/settings/billing" className="ml-2 underline hover:no-underline">
          Manage subscription
        </Link>
      )}
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5 transition-colors"
        aria-label="Dismiss reminder"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}