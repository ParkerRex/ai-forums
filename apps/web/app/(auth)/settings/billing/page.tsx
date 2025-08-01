"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  CreditCard,
  ExternalLink,
  Receipt,
  AlertCircle,
  Calendar,
  DollarSign,
  Zap,
  Shield,
} from "lucide-react";
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
  // Note: Router removed since no free tier upgrade functionality needed

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
    return (
      <div className="container max-w-4xl py-8">
        <div className="animate-pulse space-y-8">
          <div>
            <div className="bg-muted h-8 w-64 rounded"></div>
            <div className="bg-muted mt-2 h-4 w-96 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="bg-muted h-48 rounded-lg"></div>
            <div className="bg-muted h-32 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
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
    <div className="container max-w-4xl space-y-8 py-8">
      {/* Page Header Section */}
      {/* Provides clear context about what this page contains and its purpose */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground">
          Manage your subscription and payment settings
        </p>
      </div>

      {/* Current Plan Card */}
      {/* Main card displaying the user's current subscription tier and status */}
      {/* This is the primary information users need to see about their account */}
      <Card>
        <CardHeader>
          {/* Header with plan title and tier badge for quick identification */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="text-primary h-5 w-5" />
              <CardTitle>Current Plan</CardTitle>
            </div>
            {/* Tier badge with dynamic colors based on subscription level */}
            <Badge
              className={getTierBadgeColor(subscriptionInfo.tier || "free")}
            >
              {subscriptionInfo.tierDisplay}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Subscription Status Section */}
            {/* Shows current status with color-coded badges for quick recognition */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Subscription Status
              </p>
              <div className="flex items-center gap-2">
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
            {/* Note: No free tier - platform operates with zero free users */}
            {/* Scholarships handled via Stripe coupons, still show billing details */}
            {subscriptionInfo.tier && (
              <>
                <Separator />
                {/* Two-column grid for billing interval and last payment info */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>Billing Interval</span>
                    </div>
                    {/* Shows whether user is billed monthly or yearly */}
                    <p className="text-lg font-semibold">
                      {subscriptionInfo.billingIntervalDisplay || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span>Last Payment</span>
                    </div>
                    {/* Shows last payment amount and date for transparency */}
                    <p className="text-lg font-semibold">
                      {subscriptionInfo.lastPaymentAmount || "N/A"}
                    </p>
                    {subscriptionInfo.lastPaymentDate && (
                      <p className="text-muted-foreground text-sm">
                        {subscriptionInfo.lastPaymentDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Renewal Information Section */}
                {/* Only shown for active subscriptions that will auto-renew */}
                {/* Helps users understand when their next payment will occur */}
                {subscriptionInfo.renewalInfo &&
                  subscriptionInfo.isActive &&
                  !subscriptionInfo.cancelAtPeriodEnd && (
                    <div className="bg-primary/5 border-primary/20 mt-4 rounded-lg border p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 mt-0.5 rounded-full p-2">
                          <Calendar className="text-primary h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            Next Billing Date
                          </p>
                          {/* Shows next billing date with descriptive renewal text */}
                          <p className="font-semibold">
                            {subscriptionInfo.renewalInfo.nextBillingDate}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {subscriptionInfo.renewalInfo.renewalText}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Cancellation Notice Section */}
                {/* Warning banner for subscriptions set to cancel at period end */}
                {/* Uses yellow color scheme to indicate important information */}
                {subscriptionInfo.cancelAtPeriodEnd && (
                  <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                    <div className="flex items-start gap-3">
                      {/* Alert icon to draw attention to the cancellation notice */}
                      <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/50">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                          Subscription set to cancel
                        </p>
                        {/* Clear information about when the subscription will end */}
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Your subscription will end on{" "}
                          <span className="font-medium">
                            {subscriptionInfo.renewalInfo?.nextBillingDate}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Note: No free tier - platform operates with zero free users */}
            {/* Scholarships handled via Stripe coupons with early_bird tier */}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Management Actions Card */}
      {/* Only shown for paid subscribers who can manage their subscription */}
      {/* Note: No free tier - all users have paid subscriptions */}
      {/* Scholarships handled via Stripe coupons, still show management options */}
      {subscriptionInfo.tier && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="text-primary h-5 w-5" />
              <div>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>
                  Update your payment method, download invoices, or cancel your
                  subscription
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 space-y-4 rounded-lg p-6">
              {/* Main action button to access Stripe customer portal */}
              {/* Responsive width - full on mobile, auto on larger screens */}
              <Button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="w-full sm:w-auto"
              >
                {/* Credit card icon to indicate billing/payment functionality */}
                <CreditCard className="mr-2 h-4 w-4" />
                {/* Dynamic text based on loading state */}
                {isLoadingPortal ? "Loading..." : "Manage Subscription"}
                {/* External link icon to indicate navigation to external site */}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              {/* Informational text about the redirect to build user trust */}
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                You&apos;ll be redirected to our secure billing portal powered
                by Stripe
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments History Card */}
      {/* Only shown if user has payment history to display */}
      {/* Provides transparency about billing and payment status */}
      {subscriptionInfo.recentPayments &&
        subscriptionInfo.recentPayments.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Receipt className="text-primary h-5 w-5" />
                <CardTitle>Recent Payments</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Map through recent payments to display each transaction */}
                {subscriptionInfo.recentPayments.map(
                  (payment: {
                    id: string;
                    date: string;
                    amount: string;
                    status: string;
                    description: string;
                  }) => (
                    <div
                      key={payment.id}
                      className="bg-muted/50 hover:bg-muted/70 flex items-center justify-between rounded-lg px-4 py-3 transition-colors"
                    >
                      {/* Left side: Payment details with icon */}
                      <div className="flex items-center gap-3">
                        {/* Dollar icon for visual consistency */}
                        <div className="bg-background rounded-full p-2">
                          <DollarSign className="text-muted-foreground h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          {/* Payment amount in bold for emphasis */}
                          <p className="font-semibold">{payment.amount}</p>
                          {/* Payment date in muted color for hierarchy */}
                          <p className="text-muted-foreground text-sm">
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
                        {payment.status === "succeeded"
                          ? "Paid"
                          : payment.status}
                      </Badge>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
