"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, Zap, Crown, Star } from "lucide-react";
import { useState } from "react";

/**
 * JoinVaiProModal component displays a comprehensive modal for upgrading to VAI Pro subscription.
 * This modal presents the premium features, pricing, and benefits of the VAI Pro tier in an
 * engaging and visually appealing format designed to drive conversions.
 *
 * The modal includes:
 * - Scrollable content area for detailed feature listings
 * - Premium branding with gradient backgrounds and icons
 * - Feature comparison highlighting Pro benefits
 * - Clear pricing information and call-to-action
 * - Professional styling that conveys value and exclusivity
 *
 * This component is typically triggered from upgrade prompts throughout the application
 * and serves as the primary conversion point for premium subscriptions.
 *
 * @param isOpen - Boolean controlling modal visibility state
 * @param onClose - Callback function to handle modal closing
 * @returns JSX.Element - The VAI Pro upgrade modal component
 */
interface JoinVaiProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinVaiProModal({ isOpen, onClose }: JoinVaiProModalProps) {
  // State to track loading state during checkout process
  // This provides user feedback while payment processing is in progress
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles the upgrade process when user clicks the "Upgrade to VAI Pro" button.
   * This function should initiate the Stripe checkout flow or redirect to billing
   * management interface for subscription upgrade. Currently contains placeholder
   * logic that needs integration with payment processing.
   */
  const handleUpgrade = async () => {
    // Set loading state to provide user feedback during checkout
    setIsLoading(true);

    try {
      // TODO: Integrate with Stripe checkout session creation
      // This should create a checkout session for VAI Pro subscription
      // and redirect user to Stripe's hosted checkout page
      console.log("Initiating VAI Pro upgrade checkout...");

      // Simulate API call delay for demonstration
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Replace with actual Stripe checkout redirect
      // window.location.href = checkoutUrl;
    } catch (error) {
      // TODO: Implement proper error handling and user notification
      console.error("Upgrade failed:", error);
    } finally {
      // Reset loading state regardless of outcome
      setIsLoading(false);
    }
  };

  /**
   * Array of premium features available with VAI Pro subscription.
   * Each feature includes an icon, title, and description to clearly
   * communicate the value proposition to potential subscribers.
   */
  const proFeatures = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Full Community Access",
      description: "Unlimited access to all posts, discussions, and resources",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Exclusive Content",
      description: "Member-only posts, tutorials, and insider updates",
    },
    {
      icon: <Crown className="h-5 w-5" />,
      title: "Direct Messaging",
      description: "Connect directly with other VAI community members",
    },
    {
      icon: <Star className="h-5 w-5" />,
      title: "Priority Support",
      description: "Get help faster with priority community support",
    },
  ];

  /**
   * Array of features comparing Free vs Pro tiers.
   * This comparison table helps users understand what they gain
   * by upgrading and creates urgency around the limitations of free tier.
   */
  const featureComparison = [
    {
      feature: "Post Access",
      free: "Preview only",
      pro: "Full content",
      highlight: true,
    },
    {
      feature: "Community Features",
      free: "Read only",
      pro: "Full participation",
      highlight: true,
    },
    {
      feature: "Direct Messages",
      free: "Not available",
      pro: "Unlimited",
      highlight: true,
    },
    {
      feature: "Resource Downloads",
      free: "Limited",
      pro: "Unlimited",
      highlight: false,
    },
    {
      feature: "Event Access",
      free: "Public only",
      pro: "All events",
      highlight: false,
    },
    {
      feature: "Support Priority",
      free: "Standard",
      pro: "Priority",
      highlight: true,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {/* Modal header with premium branding and close button */}
        {/* Monochromatic design with subtle depth */}
        <DialogHeader className="relative bg-muted/50 border-b p-6">
          {/* Close button positioned absolutely for better visual hierarchy */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4 h-8 w-8 p-0 hover:bg-accent"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Main header content with title and premium badge */}
          <div className="flex items-center gap-3">
            {/* Crown icon with subtle styling */}
            <div className="p-2 rounded-lg bg-foreground/5">
              <Crown className="h-6 w-6 text-foreground" />
            </div>

            {/* Modal title with clean typography */}
            <DialogTitle className="text-2xl font-bold">
              Upgrade to VAI Pro
            </DialogTitle>

            {/* Premium badge with monochromatic styling */}
            <Badge variant="secondary" className="bg-foreground text-background">
              PRO
            </Badge>
          </div>

          {/* Subtitle explaining the value proposition */}
          <p className="text-muted-foreground mt-2">
            Unlock the full power of AI with unlimited access and premium features
          </p>
        </DialogHeader>

        {/* Scrollable content area for detailed feature information */}
        {/* Uses ScrollArea component for consistent scrolling behavior */}
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-6 space-y-8">
            {/* Premium features section highlighting key benefits */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                What you get with VAI Pro
              </h3>

              {/* Grid layout for feature cards on larger screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {/* Feature icon with monochromatic styling */}
                    <div className="flex-shrink-0 p-2 rounded-lg bg-accent">
                      {feature.icon}
                    </div>

                    {/* Feature content with title and description */}
                    <div className="space-y-1">
                      <h4 className="font-medium text-foreground">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature comparison table showing Free vs Pro differences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Free vs Pro Comparison
              </h3>

              {/* Comparison table with responsive design */}
              <div className="border rounded-lg overflow-hidden">
                {/* Table header with tier labels */}
                <div className="grid grid-cols-3 bg-muted/50">
                  <div className="p-3 font-medium text-sm">Feature</div>
                  <div className="p-3 font-medium text-sm text-center border-l">
                    Free
                  </div>
                  <div className="p-3 font-medium text-sm text-center border-l bg-muted">
                    VAI Pro
                  </div>
                </div>

                {/* Feature comparison rows */}
                {featureComparison.map((item, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-3 border-t ${
                      item.highlight
                        ? "bg-muted/30"
                        : ""
                    }`}
                  >
                    {/* Feature name column */}
                    <div className="p-3 text-sm font-medium">
                      {item.feature}
                    </div>

                    {/* Free tier value with X icon for limitations */}
                    <div className="p-3 text-sm text-center border-l text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        {item.highlight && (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                        {item.free}
                      </div>
                    </div>

                    {/* Pro tier value with check icon for benefits */}
                    <div className="p-3 text-sm text-center border-l bg-muted/50">
                      <div className="flex items-center justify-center gap-1 font-medium">
                        <Check className="h-3 w-3 text-green-600 dark:text-green-500" />
                        {item.pro}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing section with clear cost and billing information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Simple, Transparent Pricing
              </h3>

              {/* Pricing card with clean monochromatic styling */}
              <div className="p-6 rounded-lg border-2 border-border bg-muted/30">
                <div className="text-center space-y-2">
                  {/* Price display with large, prominent styling */}
                  <div className="text-3xl font-bold">
                    $99
                    <span className="text-lg font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>

                  {/* Billing information and money-back guarantee */}
                  <p className="text-sm text-muted-foreground">
                    Billed monthly • Cancel anytime • 30-day money-back
                    guarantee
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Modal footer with upgrade button and additional information */}
        {/* Fixed at bottom to ensure call-to-action is always visible */}
        <div className="p-6 border-t bg-background">
          <div className="space-y-4">
            {/* Primary upgrade button with monochromatic styling and subtle green accent on hover */}
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium py-6 transition-all hover:shadow-lg"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to VAI Pro
                </>
              )}
            </Button>

            {/* Additional reassurance text */}
            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Stripe • Upgrade or downgrade anytime
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
