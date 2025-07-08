"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

/**
 * ReactivateBanner component displays a banner prompting users to reactivate their account.
 * This banner appears when a user's subscription has been cancelled or expired and they
 * need to take action to restore their access to premium content.
 *
 * The banner includes:
 * - A warning message about account status
 * - A call-to-action button to reactivate
 * - A dismiss button to hide the banner temporarily
 *
 * @returns JSX.Element - The reactivate banner component
 */
export function ReactivateBanner() {
  // State to control banner visibility - allows users to dismiss the banner
  // This could be enhanced to persist dismissal state in localStorage or user preferences
  const [isVisible, setIsVisible] = useState(true);

  /**
   * Handles the reactivation process when user clicks the "Reactivate Account" button.
   * This should redirect to the billing portal or checkout flow to restore subscription.
   * Currently placeholder - needs integration with Stripe customer portal or checkout.
   */
  const handleReactivate = () => {
    // TODO: Integrate with Stripe customer portal or checkout flow
    // This should redirect to billing management or subscription renewal
    console.log("Redirecting to reactivation flow...");
  };

  /**
   * Handles dismissing the banner when user clicks the X button.
   * Sets visibility to false to hide the banner from view.
   * In production, this might also track dismissal analytics or set user preferences.
   */
  const handleDismiss = () => {
    setIsVisible(false);
  };

  // Don't render anything if banner has been dismissed
  // This prevents the component from taking up space in the DOM
  if (!isVisible) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-8 rounded-12 p-12 light:bg-background-tertiary dark:bg-background-tertiary">
      {/* Main content container with message and CTA button */}
      {/* Uses flex layout to align message and button horizontally */}
      <div className="flex items-center gap-4">
        {/* Warning message text explaining the account status */}
        {/* Uses semantic text styling for accessibility and consistency */}
        <p className="text-sm font-medium text-foreground">
          Your account has been deactivated. Reactivate to continue accessing
          premium content.
        </p>

        {/* Primary call-to-action button for reactivation */}
        {/* Uses the design system's Button component for consistency */}
        <Button
          onClick={handleReactivate}
          size="sm"
          className="whitespace-nowrap"
        >
          Reactivate Account
        </Button>
      </div>

      {/* Dismiss button positioned on the right side */}
      {/* Allows users to temporarily hide the banner if they're not ready to act */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="h-6 w-6 p-0 hover:bg-background-secondary"
        aria-label="Dismiss banner"
      >
        {/* X icon for closing/dismissing the banner */}
        {/* Uses lucide-react icon for consistency with design system */}
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
