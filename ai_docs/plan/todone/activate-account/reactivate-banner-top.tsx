"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

/**
 * ReactivateBannerTop component displays a prominent banner at the top of the page
 * prompting users to reactivate their deactivated account. This banner is designed
 * to be highly visible and encourage immediate action from users whose subscriptions
 * have been cancelled or expired.
 *
 * The banner features:
 * - Full-width layout that spans the entire top of the page
 * - Warning message about account deactivation
 * - Prominent call-to-action button for reactivation
 * - Dismiss functionality to temporarily hide the banner
 *
 * @returns JSX.Element - The top reactivate banner component
 */
export function ReactivateBannerTop() {
  // State to control banner visibility - allows users to dismiss the banner
  // This provides a way for users to hide the banner if they're not ready to reactivate
  // In a production environment, this dismissal state could be persisted
  const [isVisible, setIsVisible] = useState(true);

  /**
   * Handles the account reactivation process when user clicks the main CTA button.
   * This function should redirect users to the appropriate billing flow to restore
   * their subscription and regain access to premium content and features.
   * Currently contains placeholder logic that needs Stripe integration.
   */
  const handleReactivate = () => {
    // TODO: Integrate with Stripe customer portal or checkout session
    // This should redirect to the billing management interface or subscription renewal flow
    // Consider tracking this action for analytics and conversion optimization
    console.log("Initiating account reactivation flow...");
  };

  /**
   * Handles dismissing the banner when user clicks the close button.
   * Sets the visibility state to false, effectively hiding the banner from view.
   * This provides users with control over their interface while still maintaining
   * the urgency of the reactivation message through other UI elements.
   */
  const handleDismiss = () => {
    // Hide the banner by updating state
    // Consider adding analytics tracking for dismissal rates
    setIsVisible(false);
  };

  // Early return if banner has been dismissed to prevent rendering
  // This keeps the DOM clean and prevents layout shifts
  if (!isVisible) {
    return null;
  }

  return (
    // Full-width container that spans the entire top of the page
    // Uses a warning color scheme to indicate the urgent nature of the message
    <div className="w-full bg-orange-50 border-b border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/30">
      {/* Inner container with max width and padding for content alignment */}
      {/* Centers content and provides consistent spacing across different screen sizes */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Flex container for banner content with proper spacing and alignment */}
        {/* Uses responsive padding and gap for optimal display on all devices */}
        <div className="flex items-center justify-between gap-4 py-3">
          {/* Left side content container with message and action button */}
          {/* Groups related elements together for better visual hierarchy */}
          <div className="flex items-center gap-6">
            {/* Main warning message with appropriate styling for urgency */}
            {/* Uses semantic text colors that work in both light and dark themes */}
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              ⚠️ Your account has been deactivated. Reactivate now to restore
              access to all premium features.
            </p>

            {/* Primary call-to-action button with prominent styling */}
            {/* Uses design system button component for consistency and accessibility */}
            <Button
              onClick={handleReactivate}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap"
            >
              Reactivate Account
            </Button>
          </div>

          {/* Dismiss button positioned on the far right */}
          {/* Provides users with option to temporarily hide the banner */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20"
            aria-label="Dismiss reactivation banner"
          >
            {/* Close icon using consistent icon library */}
            {/* Sized appropriately for the button container */}
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
