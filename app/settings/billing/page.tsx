"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, ExternalLink, Receipt, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

/**
 * BillingPage Component
 *
 * A comprehensive billing and subscription management page that displays the user's
 * current subscription status, payment history, and provides access to Stripe's
 * customer portal for subscription management.
 *
 * Key Features:
 * - Displays current subscription tier with appropriate badges and colors
 * - Shows subscription status (Active, Past Due, Cancelled, Expired)
 * - Provides billing details including interval, last payment, and renewal info
 * - Handles special cases for scholarship and free tier users
 * - Integrates with Stripe customer portal for subscription management
 * - Displays recent payment history with status indicators
 * - Responsive design that works on mobile and desktop
 *
 * User Flow:
 * 1. Page loads and fetches subscription information from Convex
 * 2. Displays current plan details with tier-specific styling
 * 3. Shows relevant actions based on subscription status
 * 4. Allows paid users to access Stripe portal for management
 * 5. Displays payment history for transparency
 *
 * @returns {JSX.Element} The complete billing management interface
 */
export default function BillingPage() {
  // Next.js router for programmatic navigation to pricing page
  // Used when free tier users want to upgrade their subscription
  const router = useRouter();

  // Loading state for the Stripe portal button to prevent double-clicks
  // This ensures users don't accidentally create multiple portal sessions
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  // Query to fetch comprehensive subscription information from Convex
  // This includes tier, status, billing details, and payment history
  // Returns null during loading, which we handle with a loading state
  const subscriptionInfo = useQuery(
    api.stripe.getSubscriptionInfo.getSubscriptionInfo,
  );

  // Mutation to create a Stripe customer portal session
  // This allows users to manage their subscription, update payment methods,
  // download invoices, and cancel their subscription through Stripe's UI
  const createPortalSession = useMutation(
    api.stripe.portal.createPortalSession,
  );

  /**
   * Handle Subscription Management Portal Access
   *
   * Creates a Stripe customer portal session and redirects the user to it.
   * The portal allows users to manage their subscription, update payment methods,
   * download invoices, and cancel their subscription in a secure environment.
   *
   * Process:
   * 1. Set loading state to prevent multiple clicks
   * 2. Call Convex mutation to create portal session
   * 3. Redirect user to the returned portal URL
   * 4. Handle errors with user-friendly toast messages
   * 5. Reset loading state regardless of outcome
   *
   * Error Handling:
   * - Shows toast notification for any failures
   * - Logs errors to console for debugging
   * - Ensures loading state is always reset
   *
   * @returns {Promise<void>} Async function that handles portal creation and redirect
   */
  const handleManageSubscription = async () => {
    // Prevent multiple portal session creations while one is in progress
    setIsLoadingPortal(true);

    try {
      // Create a new Stripe customer portal session via Convex mutation
      // This returns a secure URL that expires after a short time
      const { portalUrl } = await createPortalSession();

      // Redirect to the portal if URL was successfully created
      // Using window.location.href for full page navigation to external domain
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    } catch (error) {
      // Show user-friendly error message if portal creation fails
      // This could happen due to network issues or Stripe API problems
      toast.error("Failed to open billing portal");

      // Log the actual error for debugging purposes
      // This helps developers troubleshoot issues without exposing details to users
      console.error(error);
    } finally {
      // Always reset loading state, whether success or failure
      // This ensures the button becomes clickable again
      setIsLoadingPortal(false);
    }
  };

  // Show loading state while subscription information is being fetched
  // This prevents rendering incomplete UI and provides user feedback
  if (!subscriptionInfo) {
    return <div>Loading...</div>;
  }

  /**
   * Get Tier-Specific Badge Colors
   *
   * Returns appropriate CSS classes for tier badges based on the subscription tier.
   * Each tier has distinct colors to help users quickly identify their status
   * and create visual hierarchy in the interface.
   *
   * Tier Color Mapping:
   * - founding_member: Purple (premium, exclusive feel)
   * - early_bird: Blue (trustworthy, established)
   * - scholarship: Green (positive, beneficial)
   * - member: Primary theme colors (consistent with brand)
   * - default: Gray (neutral, fallback)
   *
   * @param {string} tier - The subscription tier identifier
   * @returns {string} CSS classes for badge styling
   */
  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "founding_member":
        // Purple badge for founding members - conveys exclusivity and premium status
        return "bg-purple-500 text-primary-foreground";
      case "early_bird":
        // Blue badge for early bird members - trustworthy and established feeling
        return "bg-blue-500 text-primary-foreground";
      case "scholarship":
        // Green badge for scholarship members - positive and beneficial association
        return "bg-green-500 text-primary-foreground";
      case "member":
        // Use theme colors for regular members - maintains brand consistency
        return "bg-primary text-primary-foreground";
      default:
        // Gray fallback for unknown tiers - neutral and safe
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* Page Header Section */}
      {/* Provides clear context about what this page contains and its purpose */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and payment settings
        </p>
      </div>

      {/* Current Plan Card */}
      {/* Main card displaying the user's current subscription tier and status */}
      {/* This is the primary information users need to see about their account */}
      <Card className="mb-6">
        <CardHeader>
          {/* Header with plan title and tier badge for quick identification */}
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            {/* Tier badge with dynamic colors based on subscription level */}
            <Badge className={getTierBadgeColor(subscriptionInfo.tier || "free")}>
              {subscriptionInfo.tierDisplay}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Subscription Status Section */}
            {/* Shows current status with color-coded badges for quick recognition */}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {/* Active status badge - green to indicate positive state */}
                {subscriptionInfo.isActive && (
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-600"
                  >
                    Active
                  </Badge>
                )}
                {/* Past due status badge - yellow to indicate warning state */}
                {subscriptionInfo.isPastDue && (
                  <Badge
                    variant="outline"
                    className="border-yellow-500 text-yellow-600"
                  >
                    Past Due
                  </Badge>
                )}
                {/* Cancelled status badge - orange to indicate caution state */}
                {subscriptionInfo.isCancelled && (
                  <Badge
                    variant="outline"
                    className="border-orange-500 text-orange-600"
                  >
                    Cancelled
                  </Badge>
                )}
                {/* Expired status badge - red to indicate critical state */}
                {subscriptionInfo.isExpired && (
                  <Badge
                    variant="outline"
                    className="border-red-500 text-red-600"
                  >
                    Expired
                  </Badge>
                )}
              </div>
            </div>

            {/* Billing Details Section */}
            {/* Only shown for paid tiers that have actual billing information */}
            {/* Free and scholarship users don't need to see billing details */}
            {subscriptionInfo.tier !== "free" &&
              subscriptionInfo.tier !== "scholarship" && (
                <>
                  <Separator />
                  {/* Two-column grid for billing interval and last payment info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Billing Interval
                      </p>
                      {/* Shows whether user is billed monthly or yearly */}
                      <p className="font-medium">
                        {subscriptionInfo.billingIntervalDisplay || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Last Payment
                      </p>
                      {/* Shows last payment amount and date for transparency */}
                      <p className="font-medium">
                        {subscriptionInfo.lastPaymentAmount || "N/A"}
                        {subscriptionInfo.lastPaymentDate && (
                          <span className="text-sm text-muted-foreground ml-1">
                            on {subscriptionInfo.lastPaymentDate}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Renewal Information Section */}
                  {/* Only shown for active subscriptions that will auto-renew */}
                  {/* Helps users understand when their next payment will occur */}
                  {subscriptionInfo.renewalInfo &&
                    subscriptionInfo.isActive &&
                    !subscriptionInfo.cancelAtPeriodEnd && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Next Billing Date
                          </p>
                          {/* Shows next billing date with descriptive renewal text */}
                          <p className="font-medium">
                            {subscriptionInfo.renewalInfo.nextBillingDate}
                            <span className="text-sm text-muted-foreground ml-2">
                              ({subscriptionInfo.renewalInfo.renewalText})
                            </span>
                          </p>
                        </div>
                      </>
                    )}

                  {/* Cancellation Notice Section */}
                  {/* Warning banner for subscriptions set to cancel at period end */}
                  {/* Uses yellow color scheme to indicate important information */}
                  {subscriptionInfo.cancelAtPeriodEnd && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        {/* Alert icon to draw attention to the cancellation notice */}
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800 dark:text-yellow-200">
                            Subscription set to cancel
                          </p>
                          {/* Clear information about when the subscription will end */}
                          <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                            Your subscription will end on{" "}
                            {subscriptionInfo.renewalInfo?.nextBillingDate}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            {/* Special Status Messages Section */}
            {/* Different messages for scholarship and free tier users */}

            {/* Scholarship user message - green background for positive association */}
            {subscriptionInfo.tier === "scholarship" && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-800 dark:text-green-200">
                  You have been granted scholarship access with full member
                  benefits at no cost.
                </p>
              </div>
            )}

            {/* Free tier user message with upgrade call-to-action */}
            {subscriptionInfo.tier === "free" && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm">
                  Upgrade to Pro to unlock all features and join the community.
                </p>
                {/* Button to navigate to pricing page for upgrade */}
                <Button
                  className="mt-3"
                  onClick={() => router.push("/pricing")}
                >
                  View Pricing
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Management Actions Card */}
      {/* Only shown for paid subscribers who can manage their subscription */}
      {/* Free and scholarship users don't need subscription management options */}
      {subscriptionInfo.tier !== "free" &&
        subscriptionInfo.tier !== "scholarship" && (
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>
                Update your payment method, download invoices, or cancel your
                subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Main action button to access Stripe customer portal */}
              {/* Responsive width - full on mobile, auto on larger screens */}
              <Button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="w-full sm:w-auto"
              >
                {/* Credit card icon to indicate billing/payment functionality */}
                <CreditCard className="h-4 w-4 mr-2" />
                {/* Dynamic text based on loading state */}
                {isLoadingPortal ? "Loading..." : "Manage Subscription"}
                {/* External link icon to indicate navigation to external site */}
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
              {/* Informational text about the redirect to build user trust */}
              <p className="text-sm text-muted-foreground mt-3">
                You&apos;ll be redirected to our secure billing portal powered
                by Stripe
              </p>
            </CardContent>
          </Card>
        )}

      {/* Recent Payments History Card */}
      {/* Only shown if user has payment history to display */}
      {/* Provides transparency about billing and payment status */}
      {subscriptionInfo.recentPayments &&
        subscriptionInfo.recentPayments.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Map through recent payments to display each transaction */}
                {subscriptionInfo.recentPayments.map((payment: {
                  id: string;
                  date: string;
                  amount: string;
                  status: string;
                  description: string;
                }) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-2"
                  >
                    {/* Left side: Payment details with receipt icon */}
                    <div className="flex items-center gap-3">
                      {/* Receipt icon for visual consistency */}
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <div>
                        {/* Payment amount in bold for emphasis */}
                        <p className="font-medium">{payment.amount}</p>
                        {/* Payment date in muted color for hierarchy */}
                        <p className="text-sm text-muted-foreground">
                          {payment.date}
                        </p>
                      </div>
                    </div>
                    {/* Right side: Payment status badge with conditional styling */}
                    <Badge
                      variant={
                        payment.status === "succeeded"
                          ? "outline"
                          : "destructive"
                      }
                      className={
                        payment.status === "succeeded"
                          ? "border-green-500 text-green-600"
                          : ""
                      }
                    >
                      {payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
