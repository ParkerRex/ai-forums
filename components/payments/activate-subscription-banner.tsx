"use client";

import { useAction, useQuery } from "convex/react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

/**
 * ActivateSubscriptionBanner - Consolidated banner for subscription activation
 *
 * Shows for:
 * - Churned customers (expired/cancelled subscriptions)
 * - Migrated members without Stripe accounts
 * - Members approaching billing cycle (5 days before)
 *
 * Features:
 * - Tier-specific pricing and messaging
 * - Personalized with customer name
 * - Grace period based on joinedDate billing cycle
 * - Dismissible for 24 hours
 */
export function ActivateSubscriptionBanner() {
  const router = useRouter();
  const currentMember = useQuery(api.auth.current);
  const createCheckoutSession = useAction(api.stripe.checkout.createCheckoutSession);

  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Check if banner was dismissed in localStorage
  useEffect(() => {
    const dismissedUntil = localStorage.getItem("activateSubscriptionBannerDismissedUntil");
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setIsVisible(false);
    }
  }, []);

  /**
   * Calculate next billing date based on joinedDate
   * Uses the same day of month as joinedDate but in current/next month
   */
  const getNextBillingDate = (joinedDate: number): Date => {
    const joined = new Date(joinedDate);
    const now = new Date();

    // Get the day of month from joined date
    const billingDay = joined.getDate();

    // Start with current month
    let nextBilling = new Date(now.getFullYear(), now.getMonth(), billingDay);

    // If billing date already passed this month, move to next month
    if (nextBilling <= now) {
      nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
    }

    return nextBilling;
  };

  // TODO(ENTITLEMENT-REFactor): use api.members.entitlement.getEntitlement
  // instead of bespoke shouldShowBanner() logic so that visibility updates
  // instantly and duplicate rules live in one place.

  /**
   * Check if member should see the banner
   */
  const shouldShowBanner = (): boolean => {
    if (!currentMember || !isVisible) return false;

    // Never show for active subscriptions
    if (currentMember.subscriptionStatus === "active") return false;

    // Always show for expired/cancelled (churned customers)
    if (
      currentMember.subscriptionStatus === "expired" ||
      currentMember.subscriptionStatus === "cancelled"
    ) {
      return true;
    }

    // For members without subscriptions (migrated), check grace period
    if (currentMember.subscriptionStatus === "none" || !currentMember.subscriptionStatus) {
      const nextBilling = getNextBillingDate(currentMember.joinedDate);
      const now = new Date();
      const daysUntilBilling = Math.ceil(
        (nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Show banner 5 days before billing
      return daysUntilBilling <= 5;
    }

    return false;
  };
  //  TODO: update this to be dynamic

  /**
   * Get tier-specific pricing information
   */
  const getTierInfo = () => {
    switch (currentMember?.tier) {
      case "founding_member":
        return {
          name: "Founding Member",
          monthlyPrice: 39,
          yearlyPrice: 375,
          badge: "Forever Price",
        };
      case "early_bird":
        return {
          name: "Early Bird",
          monthlyPrice: 50,
          yearlyPrice: 480,
          badge: "Grandfathered",
        };
      default:
        return {
          name: "Pro Member",
          monthlyPrice: 99,
          yearlyPrice: 950,
          badge: null,
        };
    }
  };

  /**
   * Get personalized message based on member status
   */
  const getMessage = () => {
    if (!currentMember) return "";

    const firstName = currentMember.firstName || "there";
    const tierInfo = getTierInfo();

    if (currentMember.subscriptionStatus === "expired") {
      return `Welcome back ${firstName}! Your ${tierInfo.name} access has expired`;
    } else if (currentMember.subscriptionStatus === "cancelled") {
      return `Welcome back ${firstName}! Your ${tierInfo.name} access has expired`;
    } else if (currentMember.subscriptionStatus === "past_due") {
      return `${firstName}, please update your payment method to restore ${tierInfo.name} access`;
    } else {
      // For migrated members approaching billing
      const nextBilling = getNextBillingDate(currentMember.joinedDate);
      const daysUntil = Math.ceil((nextBilling.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return `Hey ${firstName}! Your ${tierInfo.name} billing starts in ${daysUntil} days`;
    }
  };

  /**
   * Handle subscription activation
   */
  const handleActivate = async () => {
    if (!currentMember) return;

    try {
      setIsCreatingSession(true);

      // Get the appropriate price ID for the member's tier
      const tier =
        currentMember.tier === "founding_member"
          ? "founding_member"
          : currentMember.tier === "early_bird"
            ? "early_bird"
            : "member";

      // Use member tier pricing for now (you'll set up tier-specific pricing)

      const result = await createCheckoutSession({
        tier,
        billingInterval: "monthly",
      });

      if (result.checkoutUrl) {
        router.push(result.checkoutUrl);
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  /**
   * Handle banner dismissal
   */
  const handleDismiss = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    localStorage.setItem("activateSubscriptionBannerDismissedUntil", tomorrow.toISOString());
    setIsVisible(false);
  };

  // Don't render if shouldn't show
  if (!shouldShowBanner()) {
    return null;
  }

  const tierInfo = getTierInfo();

  return (
    <div className="border-border bg-muted/50 w-full border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center gap-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {tierInfo.badge && (
                <span className="bg-background text-foreground inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
                  {tierInfo.badge}
                </span>
              )}
              <p className="text-foreground text-sm font-medium">{getMessage()}</p>
            </div>

            <Button
              onClick={handleActivate}
              disabled={isCreatingSession}
              size="sm"
              className="whitespace-nowrap"
            >
              {isCreatingSession ? "Loading..." : "Reactivate Pro"}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground absolute right-0 h-6 w-6 p-0"
            aria-label="Dismiss banner for 24 hours"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
