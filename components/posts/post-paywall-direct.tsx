"use client";

import { useAction } from "convex/react";
import { Lock, Shield, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { paywallAnalytics } from "@/lib/analytics";
import { getPaywallVariant, type PaywallVariant, paywallCopy } from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

interface PostPaywallDirectProps {
  className?: string;
  postId?: string;
  postTitle?: string;
  variant?: PaywallVariant;
}

export function PostPaywallDirect({
  className,
  postId,
  postTitle,
  variant,
}: PostPaywallDirectProps) {
  const createDirectCheckout = useAction(api.stripe.directCheckout.createDirectCheckout);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the copy variant for this paywall
  const selectedVariant = getPaywallVariant(variant);
  const copy = paywallCopy[selectedVariant];

  // Track paywall impression
  useEffect(() => {
    paywallAnalytics.shown(postId, postTitle, selectedVariant);
    paywallAnalytics.variantPerformance(selectedVariant, "shown");
  }, [postId, postTitle, selectedVariant]);

  const handleUpgradeClick = async () => {
    // Track upgrade click
    paywallAnalytics.upgradeClicked(postId, postTitle, selectedVariant);
    paywallAnalytics.variantPerformance(selectedVariant, "clicked");
    setError(null);
    setIsLoading(true);
    try {
      const { url } = await createDirectCheckout({
        sourcePostId: postId,
      });

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
      setError("Unable to start checkout. Please try again.");
      setIsLoading(false);
    }
  };
  return (
    <div className={cn("relative", className)}>
      {/* Gradient overlay that fades out the preview content */}
      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent" />

      {/* Paywall card */}
      <Card className="relative mt-8 border-2 p-8 text-center shadow-lg">
        {/* Lock icon */}
        <div className="mb-4 flex justify-center">
          <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-none">
            <Lock className="text-primary h-8 w-8" />
          </div>
        </div>

        {/* Headline */}
        <h3 className="mb-2 select-none text-2xl font-bold">{copy.headline}</h3>

        {/* Subheadline */}
        <p className="text-muted-foreground mx-auto mb-6 max-w-md select-none">
          {copy.subheadline}
        </p>

        {/* Value prop (if exists) */}
        {copy.valueProp && (
          <p className="text-muted-foreground mb-6 select-none text-sm italic">{copy.valueProp}</p>
        )}

        {/* Primary CTA button */}
        <Button className="mb-6 px-6 font-medium" onClick={handleUpgradeClick} disabled={isLoading}>
          {isLoading ? "Loading..." : copy.cta}
        </Button>

        {/* Error message */}
        {error && <p className="mb-4 select-none text-sm text-red-600">{error}</p>}

        {/* Value props */}
        <div className="mb-6 mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col items-center space-y-2">
            <Zap className="text-primary h-5 w-5" />
            <span className="select-none text-sm font-medium">Instant Access</span>
            <span className="text-muted-foreground select-none text-xs">All premium content</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Users className="text-primary h-5 w-5" />
            <span className="select-none text-sm font-medium">Active Community</span>
            <span className="text-muted-foreground select-none text-xs">
              Engineers from Google and Microsoft
            </span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Shield className="text-primary h-5 w-5" />
            <span className="select-none text-sm font-medium">Cancel Anytime</span>
            <span className="text-muted-foreground select-none text-xs">30-day guarantee</span>
          </div>
        </div>

        {/* Trust indicators */}
        <p className="text-muted-foreground select-none text-xs">{copy.trustSignals.join(" • ")}</p>
      </Card>
    </div>
  );
}
