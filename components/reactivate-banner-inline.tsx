"use client";

import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "convex/react";
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
  const createCheckoutSession = useMutation(api.stripe.checkout.createCheckoutSession);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  // Track if banner has been dismissed in this session
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Check if banner was dismissed in localStorage
  useEffect(() => {
    const dismissedUntil = localStorage.getItem('reactivateBannerDismissedUntil');
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setIsDismissed(true);
    }
  }, []);

  // Check if member has full access (client-side version of canViewFullContent)
  const hasFullAccess = () => {
    if (!currentMember) return false;
    
    // Check subscription status first
    if (currentMember.subscriptionStatus !== "active") {
      // If subscription is not active, check if it's cancelled but still within the period
      if (currentMember.subscriptionStatus === "cancelled" && currentMember.subscriptionEndDate) {
        const now = Date.now();
        return currentMember.subscriptionEndDate > now;
      }
      return false;
    }
    
    // Check tier - all paid tiers and scholarship have full access
    const fullAccessTiers = ["scholarship", "founding_member", "early_bird", "member"];
    return currentMember.tier ? fullAccessTiers.includes(currentMember.tier) : false;
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
      
      // Determine the appropriate price ID based on previous tier or default to member tier
      const priceId = process.env.NEXT_PUBLIC_STRIPE_MEMBER_MONTHLY_PRICE_ID!;
      
      const result = await createCheckoutSession({
        priceId,
        tier: "member",
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
    localStorage.setItem('reactivateBannerDismissedUntil', tomorrow.toISOString());
    setIsDismissed(true);
  };

  // Get personalized message based on member status
  const getMessage = () => {
    const firstName = currentMember.firstName || "there";
    
    if (currentMember.tier === "free") {
      return `Hey ${firstName}! Upgrade for full access to Shop and 1,000 other apps`;
    } else if (currentMember.subscriptionStatus === "cancelled") {
      return `Welcome back ${firstName}! Your Pro access has expired`;
    } else if (currentMember.subscriptionStatus === "past_due") {
      return `${firstName}, please update your payment method to restore Pro access`;
    }
    
    return "Upgrade for full access to Shop and 1,000 other apps";
  };

  return (
    <div className="relative w-full bg-muted/30 border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Left side: Badge and message */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-foreground text-background font-medium">
              PRO
            </Badge>
            <p className="text-sm text-muted-foreground">
              {getMessage()} —{" "}
              <button
                onClick={handleReactivate}
                disabled={isCreatingSession}
                className="font-medium text-foreground underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingSession ? "Loading..." : "Reactivate Pro"}
              </button>
            </p>
          </div>
          
          {/* Right side: Dismiss button */}
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
