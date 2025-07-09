"use client";

import { useState } from "react";
import React from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CheckCircle, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignInModal } from "./sign-in-modal";
import { toast } from "sonner";
import { getStripeConfig, isStripeConfigured } from "@/lib/stripe-config";
import { formatCurrency } from "@/lib/format";
import { checkoutAnalytics } from "@/lib/analytics";

interface MembershipCTAModalProps {
  /**
   * Control whether the modal is open (controlled mode). If omitted, the modal
   * will manage its own open state internally (uncontrolled mode).
   */
  isOpen?: boolean;
  /**
   * Callback fired when the modal requests to be closed (controlled mode).
   * Ignored in uncontrolled mode.
   */
  onClose?: () => void;
  /**
   * Optional title displayed at the top of the modal dialog.
   */
  title?: string;
  /**
   * Optional description shown underneath the title.
   */
  description?: string;
  /**
   * Optional source string used for analytics to understand where the modal
   * was opened from.
   */
  source?: string;
  /**
   * Optional trigger element. When provided, it will be wrapped in a
   * DialogTrigger so clicking it opens the modal. This enables the component
   * to be used in the shorthand form:
   *
   * ```tsx
   * <MembershipCTAModal>
   *   <Button>Join</Button>
   * </MembershipCTAModal>
   * ```
   */
  children?: React.ReactNode;
}

type TierType = "founding_member" | "member";

export function MembershipCTAModal({
  /**
   * If the parent controls the open state, respect that; otherwise fall back
   * to internal state managed via the Dialog API.
   */
  isOpen: controlledOpen,
  onClose: controlledOnClose,
  title = "Choose Your VAI Pro Membership",
  description = "Get unlimited access to all posts and community features",
  source = "unknown",
  children,
}: MembershipCTAModalProps) {
  // Support both controlled and uncontrolled usage patterns
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (isControlled) {
      if (!next && controlledOnClose) controlledOnClose();
    } else {
      setInternalOpen(next);
    }
  };

  const { isSignedIn } = useAuth();
  const [selectedTier, setSelectedTier] = useState<TierType>("founding_member");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const createCheckoutSession = useMutation(
    api.stripe.checkout.createCheckoutSession,
  );

  // Track modal open
  React.useEffect(() => {
    if (open) {
      checkoutAnalytics.modalOpened(source);
    }
  }, [open, source]);

  // Get Stripe configuration with validation
  const stripeConfig = isStripeConfigured() ? getStripeConfig() : null;

  const features = [
    "Full access to all posts and discussions",
    "Connect with AI engineers from top companies",
    "Access exclusive tutorials and resources",
    "Direct messaging with community members",
    "Priority support and early access to features",
    "Cancel anytime, no questions asked",
  ];

  const tiers = {
    founding_member: {
      name: "Founding Member",
      description: "Early supporter pricing, locked forever",
      monthlyPrice: stripeConfig?.foundingMemberMonthlyPrice || 39,
      yearlyPrice: stripeConfig?.foundingMemberYearlyPrice || 375,
      badge: "Best Value",
      badgeVariant: "default" as const,
    },
    member: {
      name: "Member",
      description: "Standard membership pricing",
      monthlyPrice: stripeConfig?.memberMonthlyPrice || 99,
      yearlyPrice: stripeConfig?.memberYearlyPrice || 990,
      badge: null,
      badgeVariant: null,
    },
  };

  const selectedTierData = tiers[selectedTier];
  const monthlyPrice = selectedTierData.monthlyPrice;
  const yearlyPrice = selectedTierData.yearlyPrice;
  const yearlySavings = monthlyPrice * 12 - yearlyPrice;
  const yearlySavingsPercent = Math.round(
    (yearlySavings / (monthlyPrice * 12)) * 100,
  );

  const handleCheckout = async () => {
    if (!isSignedIn) {
      setShowSignInModal(true);
      return;
    }

    if (!stripeConfig) {
      console.error("Stripe configuration not found");
      toast.error(
        "Payment system is not properly configured. Please contact support.",
      );
      return;
    }

    // Track checkout initiation
    const price = billingInterval === "monthly" ? monthlyPrice : yearlyPrice;
    checkoutAnalytics.checkoutInitiated(selectedTier, billingInterval, price);

    setIsLoading(true);
    try {
      let priceId: string;
      if (selectedTier === "founding_member") {
        priceId =
          billingInterval === "monthly"
            ? stripeConfig.foundingMemberMonthlyPriceId
            : stripeConfig.foundingMemberYearlyPriceId;
      } else {
        priceId =
          billingInterval === "monthly"
            ? stripeConfig.memberMonthlyPriceId
            : stripeConfig.memberYearlyPriceId;
      }

      const result = await createCheckoutSession({
        priceId,
        tier: selectedTier,
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
      const message =
        error instanceof Error
          ? error.message
          : "Payment setup failed. Please try again.";
      checkoutAnalytics.checkoutFailed(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* Trigger (optional) */}
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}

        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-6">
            {/* Billing toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span
                  className={cn(
                    "text-sm font-medium",
                    billingInterval === "monthly"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Monthly
                </span>
                <ToggleGroup
                  type="single"
                  value={billingInterval}
                  onValueChange={(value) => {
                    if (value && value !== billingInterval) {
                      checkoutAnalytics.billingToggled(
                        billingInterval,
                        value as "monthly" | "yearly",
                      );
                      setBillingInterval(value as "monthly" | "yearly");
                    }
                  }}
                  className="bg-muted rounded-full p-1"
                  aria-label="Choose billing frequency"
                >
                  <ToggleGroupItem
                    value="monthly"
                    className="rounded-full px-3 py-1 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                  >
                    Monthly
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="yearly"
                    className="rounded-full px-3 py-1 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                  >
                    Yearly
                  </ToggleGroupItem>
                </ToggleGroup>
                <span
                  className={cn(
                    "text-sm font-medium",
                    billingInterval === "yearly"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Yearly
                </span>
                {billingInterval === "yearly" && (
                  <Badge
                    variant="secondary"
                    className="bg-green-600 text-background hover:bg-green-600"
                  >
                    Save {yearlySavingsPercent}%
                  </Badge>
                )}
              </div>

              {/* Tier selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(tiers).map(([tierKey, tier]) => {
                  const isSelected = selectedTier === tierKey;
                  const tierMonthlyPrice = tier.monthlyPrice;
                  const tierYearlyPrice = tier.yearlyPrice;

                  return (
                    <button
                      key={tierKey}
                      onClick={() => setSelectedTier(tierKey as TierType)}
                      className={cn(
                        "relative rounded-lg border-2 p-6 text-left transition-all",
                        "hover:border-primary/50 hover:shadow-md",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border",
                      )}
                    >
                      {tier.badge && (
                        <Badge
                          variant={tier.badgeVariant}
                          className="absolute -top-3 left-4 flex items-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          {tier.badge}
                        </Badge>
                      )}

                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg">{tier.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {tier.description}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="text-3xl font-bold">
                            {formatCurrency(
                              billingInterval === "monthly"
                                ? tierMonthlyPrice
                                : tierYearlyPrice,
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {billingInterval === "monthly"
                              ? "per month"
                              : `per year (${formatCurrency(tierYearlyPrice / 12)}/mo)`}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-4 right-4">
                            <CheckCircle className="w-5 h-5 text-primary" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {billingInterval === "yearly" && (
                <p className="text-sm text-center text-green-600 dark:text-green-500">
                  {selectedTier === "founding_member"
                    ? `Save ${formatCurrency(39 * 12 - 375)} per year with Founding Member`
                    : `Save ${formatCurrency(yearlySavings)} per year`}
                </p>
              )}
            </div>

            {/* Features list */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                WHAT&apos;S INCLUDED
              </h4>
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
                  Get {selectedTierData.name} Access
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
    MembershipCTAModal: (
      props: Omit<MembershipCTAModalProps, "isOpen" | "onClose">,
    ) => <MembershipCTAModal {...props} isOpen={isOpen} onClose={closeModal} />,
  };
}

export default MembershipCTAModal;
