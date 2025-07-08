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
    <div className="w-full bg-black dark:bg-[#272727] h-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-4 h-12 relative">
          <p className="text-sm font-medium text-white">
            Your Plan Pro has expired — <span className="underline">Reactivate Pro</span>
          </p>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-white hover:text-gray-300 hover:bg-gray-800 absolute right-0 cursor-pointer"
            aria-label="Dismiss reactivation banner"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
