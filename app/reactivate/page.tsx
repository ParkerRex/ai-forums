"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * ReactivatePage Component
 *
 * A specialized page for users with cancelled or expired subscriptions to reactivate
 * their membership at their original pricing tier. This page handles tier-specific
 * pricing (founding member, early bird, regular) and maintains grandfathered rates
 * for legacy users.
 *
 * Key Features:
 * - Preserves original subscription tier and pricing for returning users
 * - Supports monthly/yearly billing toggle with savings calculations
 * - Handles authentication flow with proper redirects
 * - Integrates with Stripe checkout for subscription reactivation
 * - Shows tier-specific benefits and locked-in pricing guarantees
 *
 * Authentication Flow:
 * - Redirects unauthenticated users to sign-in with return URL
 * - Redirects users with active subscriptions back to pricing page
 * - Only shows reactivation options for users with previous subscriptions
 *
 * @returns {JSX.Element | null} The reactivation page or null during loading/redirects
 */
export default function ReactivatePage() {
  // Billing period state - defaults to yearly to encourage longer commitments
  // and maximize savings for returning users
  const [billingPeriod, setBillingPeriod] = useState<"yearly" | "monthly">(
    "yearly",
  );

  // Loading state for the reactivation button to prevent double-clicks
  // and provide user feedback during Stripe checkout session creation
  const [isLoading, setIsLoading] = useState(false);

  // Next.js router for programmatic navigation during authentication flow
  const router = useRouter();

  // Clerk authentication hook to verify user is signed in before showing reactivation options
  const { isSignedIn } = useAuth();

  // Convex query to fetch user's subscription information including tier and status
  // This determines pricing and eligibility for reactivation
  const subscriptionInfo = useQuery(
    api.stripe.getSubscriptionInfo.getSubscriptionInfo,
  );

  // Convex action to create Stripe checkout sessions for subscription reactivation
  // Handles server-side Stripe integration with tier-specific pricing
  const createCheckoutSession = useAction(
    api.stripe.checkout.createCheckoutSession,
  );

  /**
   * Authentication Effect
   *
   * Redirects unauthenticated users to the sign-in page with a return URL
   * pointing back to this reactivation page. This ensures users complete
   * authentication before accessing subscription management features.
   */
  useEffect(() => {
    // Redirect if not signed in
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/reactivate");
    }
  }, [isSignedIn, router]);

  /**
   * Subscription Status Effect
   *
   * Handles routing logic based on user's current subscription status:
   * - Active subscriptions: redirect to pricing page (no reactivation needed)
   * - Free tier users: redirect to pricing page (no previous subscription to reactivate)
   * - Cancelled/expired users: allow access to reactivation flow
   */
  useEffect(() => {
    // Redirect if user has active subscription or no previous subscription
    if (subscriptionInfo) {
      if (subscriptionInfo.isActive) {
        router.push("/pricing");
      }
    }
  }, [subscriptionInfo, router]);

  // Early return during loading or for ineligible users
  // Prevents flash of content before redirects complete
  if (!subscriptionInfo) {
    return null;
  }

  /**
   * Get Tier-Specific Information
   *
   * Returns pricing and display information based on the user's subscription tier.
   * This function maintains grandfathered pricing for legacy users and provides
   * appropriate messaging for each tier level.
   *
   * Tier Hierarchy:
   * - founding_member: Lowest price, purple badge, "forever" messaging
   * - early_bird: Mid-tier price, blue badge, "grandfathered" messaging
   * - default (member): Current pricing, primary color, no special badge
   *
   * @returns {Object} Tier information including name, pricing, colors, and badges
   */
  const getTierInfo = () => {
    switch (subscriptionInfo.tier) {
      case "founding_member":
        return {
          name: "Founding Member",
          description:
            "Your exclusive early supporter pricing - locked forever",
          monthlyPrice: 39,
          yearlyPrice: 375,
          color: "bg-purple-500",
          badge: "Forever Price",
        };
      case "early_bird":
        return {
          name: "Early Bird",
          description: "Your grandfathered rate as an early member",
          monthlyPrice: 50,
          yearlyPrice: 480,
          color: "bg-blue-500",
          badge: "Grandfathered",
        };
      default:
        return {
          name: "Pro Member",
          description: "Full access to the VAI community",
          monthlyPrice: 99,
          yearlyPrice: 950,
          color: "bg-primary",
          badge: null,
        };
    }
  };

  // Get tier-specific information for the current user
  const tierInfo = getTierInfo();

  // Calculate current price based on selected billing period
  const currentPrice =
    billingPeriod === "yearly" ? tierInfo.yearlyPrice : tierInfo.monthlyPrice;

  // Calculate annual savings when choosing yearly billing
  // This helps encourage users to select the yearly option
  const savings = tierInfo.monthlyPrice * 12 - tierInfo.yearlyPrice;

  // Calculate savings percentage for display in the UI
  // Rounded to nearest whole number for clean presentation
  const savingsPercent = Math.round(
    (savings / (tierInfo.monthlyPrice * 12)) * 100,
  );

  /**
   * Handle Subscription Reactivation
   *
   * Creates a Stripe checkout session for the user's specific tier and billing period.
   * This function handles the complete reactivation flow including error handling
   * and user feedback through loading states and toast notifications.
   *
   * Process:
   * 1. Set loading state to prevent double-clicks
   * 2. Construct environment variable key for tier-specific Stripe price ID
   * 3. Create checkout session via Convex mutation
   * 4. Redirect to Stripe checkout or show error message
   * 5. Reset loading state regardless of outcome
   *
   * @returns {Promise<void>} Async function that handles the reactivation process
   */
  const handleReactivate = async () => {
    setIsLoading(true);

    try {
      // Ensure subscription info has a tier
      if (!subscriptionInfo?.tier) {
        throw new Error("No subscription tier found");
      }

      // Construct the environment variable key for the specific tier and billing period
      // Format: NEXT_PUBLIC_STRIPE_FOUNDING_MEMBER_YEARLY_PRICE_ID
      const priceIdKey = `NEXT_PUBLIC_STRIPE_${subscriptionInfo.tier.toUpperCase()}_${billingPeriod.toUpperCase()}_PRICE_ID`;
      const priceId = process.env[priceIdKey];

      // Validate that the price configuration exists for this tier/period combination
      if (!priceId) {
        throw new Error("Price configuration not found");
      }

      // Create Stripe checkout session with tier-specific parameters
      const { checkoutUrl } = await createCheckoutSession({
        priceId,
        tier: subscriptionInfo.tier as
          | "founding_member"
          | "early_bird"
          | "member",
        billingInterval: billingPeriod,
      });

      // Redirect to Stripe checkout if session creation was successful
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      // Log error for debugging and show user-friendly error message
      console.error("Reactivation error:", error);
      toast.error("Failed to create checkout session");
    } finally {
      // Always reset loading state to re-enable the button
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen py-16">
      <div className="container mx-auto max-w-2xl px-4">
        {/* Page Header Section */}
        {/* Welcome message with sparkles icon to create positive, celebratory feeling */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 flex items-center justify-center gap-3 text-4xl font-bold">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            Welcome Back!
          </h1>
          {/* Personalized subtitle showing their specific tier name */}
          <p className="text-muted-foreground text-xl">
            Reactivate your {tierInfo.name} membership at your special rate
          </p>
        </div>

        {/* Main Reactivation Card */}
        {/* Enhanced border to draw attention to the primary action area */}
        <Card className="border-2">
          <CardHeader>
            {/* Card header with tier name and optional badge */}
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{tierInfo.name}</CardTitle>
              {/* Conditional badge rendering for special tiers */}
              {tierInfo.badge && (
                <Badge className={`${tierInfo.color} text-white`}>
                  {tierInfo.badge}
                </Badge>
              )}
            </div>
            {/* Tier description explaining the value proposition */}
            <p className="text-muted-foreground mt-2">{tierInfo.description}</p>
          </CardHeader>
          <CardContent>
            {/* Billing Period Toggle Section */}
            {/* Two-button toggle allowing users to compare monthly vs yearly pricing */}
            <div className="mb-6 flex items-center gap-4">
              {/* Monthly billing option button */}
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`flex-1 rounded-lg px-4 py-3 font-medium transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <div>Monthly</div>
                {/* Large price display to make cost comparison easy */}
                <div className="mt-1 text-2xl font-bold">
                  ${tierInfo.monthlyPrice}/mo
                </div>
              </button>

              {/* Yearly billing option button with savings badge */}
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`relative flex-1 rounded-lg px-4 py-3 font-medium transition-colors ${
                  billingPeriod === "yearly"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {/* Savings badge positioned absolutely to draw attention */}
                {savingsPercent > 0 && (
                  <Badge className="absolute -right-2 -top-2 bg-green-500 text-white">
                    Save {savingsPercent}%
                  </Badge>
                )}
                <div>Yearly</div>
                {/* Monthly equivalent price for easy comparison */}
                <div className="mt-1 text-2xl font-bold">
                  ${Math.round(tierInfo.yearlyPrice / 12)}/mo
                </div>
                {/* Annual total for transparency */}
                <div className="text-xs opacity-80">
                  ${tierInfo.yearlyPrice} billed annually
                </div>
              </button>
            </div>

            {/* Savings Information Section */}
            {/* Highlighted box showing potential savings to encourage yearly billing */}
            <div className="bg-muted/50 mb-6 rounded-lg p-4">
              <p className="text-center text-sm">
                {billingPeriod === "yearly" ? (
                  // Message for users who selected yearly billing
                  <>
                    You&apos;ll save{" "}
                    <span className="font-bold text-green-600">${savings}</span>{" "}
                    per year with annual billing
                  </>
                ) : (
                  // Encouragement message for users on monthly billing
                  <>
                    Switch to yearly and save{" "}
                    <span className="font-bold text-green-600">${savings}</span>{" "}
                    per year
                  </>
                )}
              </p>
            </div>

            {/* Primary Reactivation Button */}
            {/* Large, prominent button with dynamic pricing and loading state */}
            <Button
              className="h-12 w-full text-lg"
              size="lg"
              onClick={handleReactivate}
              disabled={isLoading}
            >
              {isLoading
                ? "Processing..."
                : `Reactivate for $${currentPrice}/${billingPeriod === "yearly" ? "year" : "month"}`}
            </Button>

            {/* Benefits List Section */}
            {/* Reassuring list of what users get when they reactivate */}
            <div className="mt-6 space-y-2">
              {/* Immediate access benefit */}
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Immediate access to all features</span>
              </div>

              {/* Price lock guarantee - key value proposition for returning users */}
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Your {tierInfo.name} pricing is locked forever</span>
              </div>

              {/* Cancellation flexibility to reduce commitment anxiety */}
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Cancel anytime from your account settings</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Contact Information */}
        {/* Provides users with a way to get help if they have questions */}
        <p className="text-muted-foreground mt-8 text-center text-sm">
          Questions? Contact us at support@vai.ai
        </p>
      </div>
    </div>
  );
}
