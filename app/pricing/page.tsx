"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Building, GraduationCap } from "lucide-react";
import { useState } from "react";
import CurrentCustomersTicker from "@/components/current-customers-ticker";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

/**
 * PricingPage Component
 *
 * Main pricing page that displays subscription plans and handles checkout flow.
 * Features a responsive design with Pro and Team tiers, billing period toggle,
 * and integrated Stripe checkout functionality.
 *
 * Key Features:
 * - Monthly/yearly billing toggle with savings calculation
 * - Stripe checkout integration for subscription creation
 * - Authentication-aware checkout flow with redirects
 * - Subscription status checking to prevent duplicate subscriptions
 * - Enterprise and student plan information sections
 * - Customer ticker component for social proof
 *
 * @returns {JSX.Element} The complete pricing page with all subscription options
 */
export default function PricingPage() {
  // State to track whether user has selected monthly or yearly billing
  // Defaults to yearly to encourage longer-term subscriptions
  const [billingPeriod, setBillingPeriod] = useState<"yearly" | "monthly">(
    "yearly",
  );

  // Loading state for checkout button to prevent double-clicks during processing
  const [isLoading, setIsLoading] = useState(false);

  // Next.js router for programmatic navigation during auth flow
  const router = useRouter();

  // Clerk authentication hook to check if user is signed in
  const { isSignedIn } = useAuth();

  // Convex mutation to create Stripe checkout sessions
  // This handles the server-side Stripe integration
  const createCheckoutSession = useMutation(
    api.stripe.checkout.createCheckoutSession,
  );

  // Query to get current user's subscription information
  // Used to prevent duplicate subscriptions and show appropriate UI
  const subscriptionInfo = useQuery(
    api.stripe.getSubscriptionInfo.getSubscriptionInfo,
  );

  // Pricing configuration from environment variables
  // Default to standard pricing if env vars not set
  const monthlyPrice = parseInt(process.env.NEXT_PUBLIC_MEMBER_MONTHLY_PRICE || "99");
  const yearlyPrice = parseInt(process.env.NEXT_PUBLIC_MEMBER_YEARLY_PRICE || "950");
  const yearlyMonthlyEquivalent = parseInt(process.env.NEXT_PUBLIC_MEMBER_YEARLY_MONTHLY_EQUIVALENT || "79");

  // Calculate percentage savings for yearly billing
  // Formula: ((monthly * 12 - yearly) / (monthly * 12)) * 100
  const savings = Math.round(
    ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100,
  );

  /**
   * Handles the checkout process for Pro plan subscription
   *
   * This function manages the complete checkout flow including:
   * - Authentication checking and redirect handling
   * - Existing subscription validation
   * - Stripe checkout session creation
   * - Error handling and user feedback
   *
   * @returns {Promise<void>} Resolves when checkout is complete or fails
   */
  const handleCheckout = async () => {
    // Redirect unauthenticated users to sign-in with return URL
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/pricing");
      return;
    }

    // Prevent duplicate subscriptions by checking current status
    // Active non-free subscriptions should be managed in billing settings
    if (subscriptionInfo?.isActive && subscriptionInfo?.tier !== "free") {
      toast.info("You already have an active subscription");
      router.push("/settings/billing");
      return;
    }

    // Set loading state to disable button and show feedback
    setIsLoading(true);

    try {
      // Get the appropriate Stripe price ID based on billing period
      // These environment variables should be set in deployment config
      const priceId =
        billingPeriod === "yearly"
          ? process.env.NEXT_PUBLIC_STRIPE_MEMBER_YEARLY_PRICE_ID
          : process.env.NEXT_PUBLIC_STRIPE_MEMBER_MONTHLY_PRICE_ID;

      // Validate that price configuration exists
      if (!priceId) {
        throw new Error("Price configuration not found");
      }

      // Create Stripe checkout session via Convex mutation
      // This handles customer creation, subscription setup, and payment processing
      const { checkoutUrl } = await createCheckoutSession({
        priceId,
        tier: "member",
        billingInterval: billingPeriod,
      });

      // Redirect to Stripe checkout if session was created successfully
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      // Log error for debugging and show user-friendly message
      console.error("Checkout error:", error);
      toast.error("Failed to create checkout session");
    } finally {
      // Always reset loading state regardless of success/failure
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section - Main value proposition and billing toggle */}
        <div className="text-center mb-16">
          {/* Primary headline emphasizing professional development */}
          <h1 className="text-5xl font-bold mb-6 text-foreground">
            Build like a Pro.
          </h1>

          {/* Supporting copy explaining value and flexibility */}
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get full access to all features and connect with AI engineers from
            top companies Cancel anytime.
          </p>

          {/* Billing Period Toggle - allows switching between monthly/yearly */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* Yearly billing button - highlighted by default for better conversion */}
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                billingPeriod === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Yearly
            </button>

            {/* Monthly billing button - secondary option */}
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Savings indicator - only shown for yearly billing to encourage selection */}
          {billingPeriod === "yearly" && (
            <p className="text-primary font-medium">
              Save {savings}% on a yearly subscription
            </p>
          )}
        </div>

        {/* Pricing Cards Section - Main subscription tiers */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Pro Plan Card - Primary offering for individual users */}
          <Card className="relative border-2 border-primary/20 bg-card">
            <CardHeader>
              {/* Plan title with popular badge for social proof */}
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-primary text-primary-foreground"
                >
                  Popular
                </Badge>
              </div>

              {/* Target audience description */}
              <p className="text-muted-foreground">For AI engineers</p>
            </CardHeader>

            <CardContent>
              {/* Pricing display with dynamic billing period */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  {/* Main price - changes based on billing period selection */}
                  <span className="text-4xl font-bold">
                    ${billingPeriod === "yearly" ? yearlyMonthlyEquivalent : monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">per month</span>
                </div>

                {/* Billing frequency clarification */}
                <p className="text-sm text-muted-foreground">
                  {billingPeriod === "yearly"
                    ? `$${yearlyPrice} billed yearly`
                    : "billed monthly"}
                </p>
              </div>

              {/* Primary CTA button with loading state management */}
              <Button
                className="w-full mb-6"
                size="lg"
                onClick={handleCheckout}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Join VAI Pro"}
              </Button>

              {/* Feature list - highlights key benefits of Pro plan */}
              <div className="space-y-3">
                {/* Core workflow access */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Access all AI engineering workflows
                  </span>
                </div>

                {/* Community networking benefit */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Connect with top AI engineers</span>
                </div>

                {/* Knowledge sharing capability */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Unlimited knowledge sharing</span>
                </div>

                {/* Advanced search functionality */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Advanced search & discovery</span>
                </div>

                {/* Real-time collaboration tools */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Real-time collaboration</span>
                </div>

                {/* Support tier indication */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Priority support</span>
                </div>

                {/* Analytics and insights */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Member analytics</span>
                </div>

                {/* Indicates additional unlisted features */}
                <div className="text-sm text-muted-foreground">...and more</div>
              </div>
            </CardContent>
          </Card>

          {/* Team Plan Card - Higher tier for organizations */}
          <Card className="border-2 border-border bg-card">
            <CardHeader>
              <CardTitle className="text-2xl">Team</CardTitle>

              {/* Target audience for team plan */}
              <p className="text-muted-foreground">
                For AI teams & organizations
              </p>
            </CardHeader>

            <CardContent>
              {/* Team pricing - calculated as 1.5x Pro price per member */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    $
                    {billingPeriod === "yearly"
                      ? Math.round(yearlyMonthlyEquivalent * 1.5)
                      : Math.round(monthlyPrice * 1.5)}
                  </span>

                  {/* Per-member pricing clarification */}
                  <span className="text-muted-foreground">
                    per member/month
                  </span>
                </div>

                {/* Billing frequency for team plan */}
                <p className="text-sm text-muted-foreground">
                  {billingPeriod === "yearly"
                    ? `$${Math.round(yearlyPrice * 1.5)} per member billed yearly`
                    : "billed monthly"}
                </p>
              </div>

              {/* Team plan CTA - currently placeholder for future implementation */}
              <Button variant="outline" className="w-full mb-6" size="lg">
                Create Team
              </Button>

              {/* Team plan features - builds on Pro features */}
              <div className="space-y-3">
                {/* Includes all Pro features */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">All Pro features</span>
                </div>

                {/* Team-specific knowledge management */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Team knowledge base</span>
                </div>

                {/* Enhanced collaboration for teams */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Advanced collaboration tools</span>
                </div>

                {/* Administrative capabilities */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Admin dashboard</span>
                </div>

                {/* Simplified billing management */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Centralized billing</span>
                </div>

                {/* Team-level analytics and insights */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Team analytics</span>
                </div>

                {/* Enhanced support for team customers */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Priority support</span>
                </div>

                {/* Custom integration capabilities */}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Custom integrations</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enterprise & Student Sections - Additional plan options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Enterprise Plan - Custom pricing for large organizations */}
          <div className="text-center p-8 border border-border rounded-lg">
            {/* Building icon represents enterprise/corporate customers */}
            <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />

            <h3 className="text-xl font-semibold mb-2">Enterprise</h3>

            {/* Enterprise value proposition focusing on advanced features */}
            <p className="text-muted-foreground mb-4">
              Get advanced security, priority support, custom integrations &
              more.
            </p>

            {/* Contact-based sales process for enterprise */}
            <Button variant="outline">Contact Sales</Button>
          </div>

          {/* Student/Education Plan - Discounted access for educational use */}
          <div className="text-center p-8 border border-border rounded-lg">
            {/* Graduation cap icon represents educational customers */}
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />

            <h3 className="text-xl font-semibold mb-2">Student or educator?</h3>

            {/* Educational discount information */}
            <p className="text-muted-foreground mb-4">
              Discover VAI for Education and get a discount if you&apos;re
              eligible.
            </p>

            {/* Link to educational program information */}
            <Button variant="outline">Learn more</Button>
          </div>
        </div>
      </div>

      {/* Customer Ticker - Social proof component showing current customers */}
      {/* This builds trust by displaying real customer logos/names */}
      <CurrentCustomersTicker />
    </div>
  );
}
