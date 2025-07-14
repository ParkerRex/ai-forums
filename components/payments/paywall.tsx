/**
 * Paywall Component
 *
 * A premium content gating component that restricts access to VAI Pro members.
 * Handles both authenticated and unauthenticated user flows, providing appropriate
 * CTAs for upgrading to premium tiers or signing in.
 *
 * @module components/paywall
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { MembershipCTAModal } from "../members/membership-cta-modal";
import { useAuth } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { paywallAnalytics } from "@/lib/analytics";

/**
 * Props for the Paywall component
 *
 * @interface PaywallProps
 */
interface PaywallProps {
  /** Optional preview text to show before the paywall blur effect */
  previewContent?: string;

  /** The required membership tier - either "member" or "founding_member" */
  tier?: string;

  /** Custom message to display explaining the content restriction */
  message?: string;

  /** Optional post ID for analytics */
  postId?: string;

  /** Optional post title for analytics */
  postTitle?: string;
}

/**
 * Paywall component that gates premium content behind membership tiers.
 *
 * User Flow:
 * 1. Unauthenticated users -> Sign in modal -> Join Pro modal
 * 2. Authenticated free users -> Join Pro modal directly
 *
 * @param {PaywallProps} props - Component props
 * @param {string} [props.previewContent] - Preview text shown with fade effect
 * @param {string} [props.tier="member"] - Required membership level
 * @param {string} [props.message] - Custom restriction message
 * @returns {JSX.Element} Rendered paywall with appropriate CTAs
 */
export function Paywall({
  previewContent,
  message = "This content is available exclusively to VAI Pro members.",
  postId,
  postTitle,
}: PaywallProps) {
  // Check authentication status to determine which modal flow to show
  const { isSignedIn } = useAuth();

  // Modal state management for upgrade and sign-in flows
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Track paywall shown
  useEffect(() => {
    paywallAnalytics.shown(postId, postTitle);
  }, [postId, postTitle]);

  /**
   * Handles the upgrade button click based on authentication status.
   * Routes unauthenticated users to sign in first, then upgrade.
   * Authenticated users go directly to the upgrade modal.
   */
  const handleUpgradeClick = () => {
    paywallAnalytics.upgradeClicked(postId, postTitle);

    if (!isSignedIn) {
      // Unauthenticated path: Sign in -> then upgrade
      setShowSignInModal(true);
    } else {
      // Authenticated path: Direct to upgrade modal
      setShowJoinModal(true);
    }
  };

  return (
    <>
      {/* Main paywall card with dashed border to indicate gated content */}
      <Card className="relative overflow-hidden border-dashed">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            {/* Lock icon and title communicate restricted access */}
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" />
              Premium Content
            </CardTitle>
            {/* PRO badge reinforces premium tier requirement */}
            <Badge variant="secondary">PRO</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview section: Shows a teaser of the gated content */}
          {previewContent && (
            <div className="rounded-lg bg-muted/50 p-4">
              {/* line-clamp-3 limits preview to 3 lines for consistent height */}
              <p className="text-sm text-muted-foreground line-clamp-3">
                {previewContent}
              </p>
              {/* Gradient overlay creates a "fade out" effect to indicate more content exists */}
              <div className="mt-2 bg-gradient-to-b from-transparent to-muted/50 h-8 -mb-4 -mx-4 relative">
                {/* Additional subtle gradient for smooth visual transition */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-t from-background to-transparent" />
              </div>
            </div>
          )}

          {/* CTA section: Message and upgrade button */}
          <div className="space-y-3">
            {/* Custom message explaining the content restriction */}
            <p className="text-sm text-muted-foreground">{message}</p>

            <div className="space-y-2">
              {/* Primary CTA button - text changes based on auth status */}
              <Button onClick={handleUpgradeClick} className="w-full" size="lg">
                {/* Dynamic button text: "Sign In" for guests, "Upgrade" for authenticated users */}
                {isSignedIn ? "Upgrade to VAI Pro" : "Sign In to Continue"}
              </Button>

              {/* Helper text for unauthenticated users who might already have accounts */}
              {!isSignedIn && (
                <p className="text-xs text-center text-muted-foreground">
                  Already a member? Sign in to access this content.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal for authenticated users to upgrade their membership */}
      <MembershipCTAModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        source="paywall"
      />

      {/* Modal for unauthenticated users to sign in */}
      <Dialog open={showSignInModal} onOpenChange={setShowSignInModal}>
        <DialogContent className="sm:max-w-md">
          <SignIn
            // Custom styling to integrate with our design system
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none",
              },
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
