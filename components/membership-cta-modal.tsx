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
import {
  CheckCircle,
  Star,
  Zap,
  Users,
  Shield,
  MessageCircle,
  BookOpen,
  Rocket,
} from "lucide-react";
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

// Only the currently available membership tier.
type TierType = "member";

export function MembershipCTAModal({
  /**
   * If the parent controls the open state, respect that; otherwise fall back
   * to internal state managed via the Dialog API.
   */
  isOpen: controlledOpen,
  onClose: controlledOnClose,
  title = "Join the Elite AI Community",
  description = "Access premium content from the world's top AI engineers",
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
  // Default to the single available tier.
  const [selectedTier] = useState<TierType>("member");
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
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: "Unlimited Premium Content",
      description: "Access all posts, tutorials, and exclusive AI insights",
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Elite Network Access",
      description:
        "Connect with AI engineers from Google, OpenAI, Anthropic & more",
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Private Community",
      description: "Join exclusive discussions and get insider knowledge",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Priority Support",
      description: "Get fast responses and early access to new features",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Risk-Free Membership",
      description: "Cancel anytime with our 30-day money-back guarantee",
    },
    {
      icon: <Rocket className="w-5 h-5" />,
      title: "Career Acceleration",
      description: "Access job opportunities and career advancement resources",
    },
  ];

  // Pricing details for the active "Member" tier.
  const tiers = {
    member: {
      name: "VAI Pro",
      description: "Everything you need to excel in AI",
      monthlyPrice: stripeConfig?.memberMonthlyPrice || 99,
      yearlyPrice: stripeConfig?.memberYearlyPrice || 990,
      badge: "Most Popular",
      badgeVariant: "default" as const,
    },
  } as const;

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
      const priceId =
        billingInterval === "monthly"
          ? stripeConfig.memberMonthlyPriceId
          : stripeConfig.memberYearlyPriceId;

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

        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
          {/* Premium Header with Gradient Background */}
          <div className="relative -mx-6 -mt-6 mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 px-6 pt-6 pb-6 border-b border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50" />
            <div className="relative">
              <DialogHeader className="text-center space-y-3">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-base text-muted-foreground max-w-2xl mx-auto">
                  {description}
                </DialogDescription>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span>Members from</span>
                  <div className="flex items-center gap-3">
                    {/* Microsoft logo */}
                    <div className="flex items-center gap-1.5">
                      <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
                        <path d="M11 11V0H0v11h11z" fill="#f25022" />
                        <path d="M23 11V0H12v11h11z" fill="#7fba00" />
                        <path d="M11 23V12H0v11h11z" fill="#00a4ef" />
                        <path d="M23 23V12H12v11h11z" fill="#ffb900" />
                      </svg>
                      <span className="font-medium">Microsoft</span>
                    </div>
                    {/* Google logo */}
                    <div className="flex items-center gap-1.5">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285f4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34a853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#fbbc05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#ea4335"
                        />
                      </svg>
                      <span className="font-medium">Google</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
            </div>
          </div>

          <div className="space-y-6">
            {/* Billing Toggle - Premium Design */}
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="bg-muted/50 rounded-full p-1.5 border border-border/50">
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
                    className="bg-transparent"
                    aria-label="Choose billing frequency"
                  >
                    <ToggleGroupItem
                      value="monthly"
                      className="rounded-full px-6 py-2 data-[state=on]:bg-background data-[state=on]:shadow-md data-[state=on]:text-foreground font-medium"
                    >
                      Monthly
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="yearly"
                      className="rounded-full px-6 py-2 data-[state=on]:bg-background data-[state=on]:shadow-md data-[state=on]:text-foreground font-medium relative"
                    >
                      Yearly
                      {billingInterval === "yearly" && (
                        <Badge
                          variant="secondary"
                          className="absolute -top-2 -right-2 bg-green-500 text-white hover:bg-green-500 text-xs px-2 py-0.5 shadow-sm"
                        >
                          Save {yearlySavingsPercent}%
                        </Badge>
                      )}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>

              {/* Pricing Card - Premium Design */}
              <div className="max-w-sm mx-auto">
                <div className="relative rounded-xl border-2 border-primary/20 bg-gradient-to-br from-background to-muted/10 p-6 shadow-xl">
                  {/* Premium Badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge
                      variant="default"
                      className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-1 shadow-lg text-xs"
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {selectedTierData.badge}
                    </Badge>
                  </div>

                  <div className="text-center space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {selectedTierData.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedTierData.description}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-4xl font-bold text-foreground">
                          {formatCurrency(
                            billingInterval === "monthly"
                              ? monthlyPrice
                              : yearlyPrice,
                          )}
                        </span>
                        <span className="text-base text-muted-foreground">
                          {billingInterval === "monthly" ? "/month" : "/year"}
                        </span>
                      </div>
                      {billingInterval === "yearly" && (
                        <div className="text-xs text-muted-foreground">
                          Just {formatCurrency(yearlyPrice / 12)}/month when
                          paid annually
                        </div>
                      )}
                    </div>

                    {billingInterval === "yearly" && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400">
                          💰 Save {formatCurrency(yearlySavings)} per year
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid - Compact Layout */}
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-foreground mb-1">
                  Everything You Need to Excel
                </h4>
                <p className="text-sm text-muted-foreground">
                  Join the most exclusive AI community
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-muted/20 to-muted/10 border border-border/50 hover:border-primary/20 transition-all duration-300"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center text-primary">
                      {feature.icon}
                    </div>
                    <div className="space-y-0.5">
                      <h5 className="font-medium text-foreground text-sm">
                        {feature.title}
                      </h5>
                      <p className="text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section - Premium Design */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <Button
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleCheckout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent mr-3" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Join VAI Pro Today
                    <span className="ml-2 opacity-90">
                      {billingInterval === "monthly"
                        ? `${formatCurrency(monthlyPrice)}/mo`
                        : `${formatCurrency(yearlyPrice)}/yr`}
                    </span>
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Secure payment via Stripe</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>30-day money-back guarantee</span>
                </div>
                <span>•</span>
                <span>Cancel anytime</span>
              </div>
            </div>
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
