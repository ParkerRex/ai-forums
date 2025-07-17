"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

/**
 * ReactivateBannerInline component displays a subtle banner prompting users to reactivate their account.
 * This banner appears when a user's subscription has been cancelled, expired, or they're on the free tier.
 *
 * The banner is positioned:
 * - Above posts on the home page
 * - Above post details on the post detail page
 *
 * Features:
 * - Dynamically renders based on user's tier
 * - Shows only if the user isn't paying
 * - Displays the user's name when available
 * - Subtle, beautiful styling inspired by the design mockup
 *
 * @returns JSX.Element | null - The reactivate banner component or null if not needed
 */
export function ReactivateBannerInline() {
  const router = useRouter();
  const currentMember = useQuery(api.auth.current);
  const createCheckoutSession = useAction(
    api.stripe.checkout.createCheckoutSession,
  );
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Track if banner has been dismissed in this session
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if banner was dismissed in localStorage
  useEffect(() => {
    const dismissedUntil = localStorage.getItem(
      "reactivateBannerDismissedUntil",
    );
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setIsDismissed(true);
    }
  }, []);

  // TODO(ENTITLEMENT-REFactor): Replace hasFullAccess() with a single
  // real-time query (api.members.entitlement.getEntitlement) once that
  // query is added. This will remove the need for manual field checks
  // and ensure the banner hides as soon as the webhook activates the
  // subscription.

  // Check if member has full access (client-side version of canViewFullContent)
  const hasFullAccess = () => {
    if (!currentMember) return false;

    // Check subscription status first
    if (currentMember.subscriptionStatus !== "active") {
      // If subscription is not active, check if it's cancelled but still within the period
      if (
        currentMember.subscriptionStatus === "cancelled" &&
        currentMember.subscriptionEndDate
      ) {
        const now = Date.now();
        return currentMember.subscriptionEndDate > now;
      }
      return false;
    }

    // Check tier - all paid tiers and scholarship have full access
    const fullAccessTiers = [
      "scholarship",
      "founding_member",
      "early_bird",
      "member",
    ];
    return currentMember.tier
      ? fullAccessTiers.includes(currentMember.tier)
      : false;
  };

  // Don't show banner if:
  // 1. No member data yet
  // 2. Member has full access (paying member)
  // 3. Banner has been dismissed
  if (!currentMember || hasFullAccess() || isDismissed) {
    return null;
  }

  /**
   * Handles the reactivation process when user clicks the "Reactivate Pro" link.
   * Creates a Stripe checkout session and redirects to the payment flow.
   */
  const handleReactivate = async () => {
    try {
      setIsCreatingSession(true);

      const result = await createCheckoutSession({
        tier:
          currentMember.tier === "founding_member"
            ? "founding_member"
            : currentMember.tier === "early_bird"
              ? "early_bird"
              : "member",
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
   * Handles dismissing the banner for 24 hours
   */
  const handleDismiss = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    localStorage.setItem(
      "reactivateBannerDismissedUntil",
      tomorrow.toISOString(),
    );
    setIsDismissed(true);
  };

  // Get personalized message based on member status
  const getMessage = () => {
    const firstName = currentMember.firstName || "there";

    // No free tier - all users should have paid tiers
    if (currentMember.subscriptionStatus === "cancelled") {
      return `Welcome back ${firstName}! Your Pro access has expired`;
    } else if (currentMember.subscriptionStatus === "past_due") {
      return `${firstName}, please update your payment method to restore Pro access`;
    } else if (currentMember.subscriptionStatus === "expired") {
      return `Welcome back ${firstName}! Your Pro access has expired`;
    }

    return `Hey ${firstName}! Reactivate your Pro access to continue`;
  };

  return (
    <div className="relative w-full border-b border-white/10 bg-black dark:border-black/10 dark:bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Left side: Badge and message */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-black dark:bg-black dark:text-white">
              PRO
            </span>
            <p className="text-sm text-white dark:text-black">
              {getMessage()}
              <span className="mx-2 text-white/60 dark:text-black/60">•</span>
              <button
                onClick={handleReactivate}
                disabled={isCreatingSession}
                className="font-semibold text-white underline decoration-white/30 underline-offset-2 transition-colors hover:text-white/80 hover:decoration-white/60 disabled:cursor-not-allowed disabled:opacity-50 dark:text-black dark:decoration-black/30 dark:hover:text-black/80 dark:hover:decoration-black/60"
              >
                {isCreatingSession ? "Loading..." : "Reactivate Pro"}
              </button>
            </p>
          </div>

          {/* Right side: Dismiss button */}
          <button
            onClick={handleDismiss}
            className="rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black dark:text-black/60 dark:hover:bg-black/10 dark:hover:text-black dark:focus:ring-black/20 dark:focus:ring-offset-white"
            aria-label="Dismiss banner for 24 hours"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
            >
              <path
                d="M13 1L1 13M1 1L13 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
