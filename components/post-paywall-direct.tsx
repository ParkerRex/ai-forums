"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Zap, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

interface PostPaywallDirectProps {
  className?: string;
  postId?: string;
}

export function PostPaywallDirect({
  className,
  postId,
}: PostPaywallDirectProps) {
  const createDirectCheckout = useAction(api.stripe.directCheckout.createDirectCheckout);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgradeClick = async () => {
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
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      
      {/* Paywall card */}
      <Card className="relative mt-8 p-8 text-center border-2 shadow-lg">
        {/* Lock icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        {/* Headline */}
        <h3 className="text-2xl font-bold mb-2">
          This is a Premium Post
        </h3>
        
        {/* Subheadline */}
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Join 2,000+ AI engineers getting exclusive insights, tutorials, and community discussions.
        </p>
        
        {/* Primary CTA button */}
        <Button 
          size="lg" 
          className="mb-6 text-lg px-8"
          onClick={handleUpgradeClick}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Upgrade to VAI Pro - $99/mo"}
        </Button>
        
        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        
        {/* Value props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-6">
          <div className="flex flex-col items-center space-y-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Instant Access</span>
            <span className="text-xs text-muted-foreground">All premium content</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Active Community</span>
            <span className="text-xs text-muted-foreground">2,000+ AI engineers</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Cancel Anytime</span>
            <span className="text-xs text-muted-foreground">30-day guarantee</span>
          </div>
        </div>
        
        {/* Trust indicators */}
        <p className="text-xs text-muted-foreground">
          No commitment • Cancel anytime • 30-day money-back guarantee
        </p>
      </Card>
    </div>
  );
}