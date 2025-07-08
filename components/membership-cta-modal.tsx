"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignInModal } from "./sign-in-modal";
import { toast } from "sonner";
import { getStripeConfig, isStripeConfigured } from "@/lib/stripe-config";
import { formatCurrency } from "@/lib/format";
import { checkoutAnalytics } from "@/lib/analytics";

interface MembershipCTAModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  source?: string; // Track where the modal was opened from
}

export function MembershipCTAModal({
  isOpen,
  onClose,
  title = "Upgrade to VAI Pro",
  description = "Get unlimited access to all posts and community features",
  source = "unknown"
}: MembershipCTAModalProps) {
  const { isSignedIn } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const createCheckoutSession = useMutation(api.stripe.checkout.createCheckoutSession);

  // Track modal open
  React.useEffect(() => {
    if (isOpen) {
      checkoutAnalytics.modalOpened(source);
    }
  }, [isOpen, source]);

  // Get Stripe configuration with validation
  const stripeConfig = isStripeConfigured() ? getStripeConfig() : null;

  const features = [
    "Full access to all posts and discussions",
    "Connect with AI engineers from top companies",
    "Access exclusive tutorials and resources",
    "Direct messaging with community members",
    "Priority support and early access to features",
    "Cancel anytime, no questions asked"
  ];

  const handleCheckout = async () => {
    if (!isSignedIn) {
      setShowSignInModal(true);
      return;
    }

    if (!stripeConfig) {
      console.error("Stripe configuration not found");
      toast.error("Payment system is not properly configured. Please contact support.");
      return;
    }

    // Track checkout initiation
    const price = billingInterval === "monthly" ? monthlyPrice : yearlyPrice;
    checkoutAnalytics.checkoutInitiated("member", billingInterval, price);

    setIsLoading(true);
    try {
      const priceId = billingInterval === "monthly" 
        ? stripeConfig.memberMonthlyPriceId 
        : stripeConfig.memberYearlyPriceId;
      const result = await createCheckoutSession({
        priceId,
        tier: "member",
        billingInterval,
      });

      if (result.checkoutUrl) {
        checkoutAnalytics.checkoutSessionCreated(result.sessionId || "unknown");
        window.location.href = result.checkoutUrl;
      } else {
        checkoutAnalytics.checkoutFailed("No checkout URL returned");
        toast.error("Unable to create checkout session. Please try again.");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      const message = error instanceof Error ? error.message : "Payment setup failed. Please try again.";
      checkoutAnalytics.checkoutFailed(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const monthlyPrice = stripeConfig?.monthlyPrice || 99;
  const yearlyPrice = stripeConfig?.yearlyPrice || 990;
  const yearlySavings = (monthlyPrice * 12) - yearlyPrice;
  const yearlySavingsPercent = Math.round((yearlySavings / (monthlyPrice * 12)) * 100);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-bold">
              {title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-6">
            {/* Billing toggle */}
            <div className="space-y-3">
              <ToggleGroup
                type="single"
                value={billingInterval}
                onValueChange={(value) => {
                  if (value && value !== billingInterval) {
                    checkoutAnalytics.billingToggled(billingInterval, value as "monthly" | "yearly");
                    setBillingInterval(value as "monthly" | "yearly");
                  }
                }}
                className="grid grid-cols-2 gap-2"
                aria-label="Choose billing frequency"
              >
                <ToggleGroupItem
                  value="monthly"
                  className={cn(
                    "relative h-auto py-3 px-4",
                    "data-[state=on]:bg-accent data-[state=on]:border-foreground"
                  )}
                >
                  <div className="space-y-1">
                    <div className="font-medium">Monthly</div>
                    <div className="text-2xl font-bold">{formatCurrency(monthlyPrice)}</div>
                    <div className="text-xs text-muted-foreground">per month</div>
                  </div>
                </ToggleGroupItem>

                <ToggleGroupItem
                  value="yearly"
                  className={cn(
                    "relative h-auto py-3 px-4",
                    "data-[state=on]:bg-accent data-[state=on]:border-foreground"
                  )}
                >
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 bg-green-600 text-white hover:bg-green-600"
                  >
                    Save {yearlySavingsPercent}%
                  </Badge>
                  <div className="space-y-1">
                    <div className="font-medium">Yearly</div>
                    <div className="text-2xl font-bold">{formatCurrency(yearlyPrice)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(yearlyPrice / 12)}/month
                    </div>
                  </div>
                </ToggleGroupItem>
              </ToggleGroup>

              {billingInterval === "yearly" && (
                <p className="text-sm text-center text-green-600 dark:text-green-500">
                  Save {formatCurrency(yearlySavings)} per year
                </p>
              )}
            </div>

            {/* Features list */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">WHAT'S INCLUDED</h4>
              <ul className="space-y-2.5">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  Upgrade to VAI Pro
                  {billingInterval === "monthly" 
                    ? ` - ${formatCurrency(monthlyPrice)}/mo` 
                    : ` - ${formatCurrency(yearlyPrice)}/yr`}
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Secure payment via Stripe • Cancel anytime
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        redirectTo="/membership"
      />
    </>
  );
}

// Hook for easy integration
export function useMembershipCTA() {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return {
    isOpen,
    openModal,
    closeModal,
    MembershipCTAModal: (props: Omit<MembershipCTAModalProps, 'isOpen' | 'onClose'>) => (
      <MembershipCTAModal {...props} isOpen={isOpen} onClose={closeModal} />
    )
  };
}

export default MembershipCTAModal;