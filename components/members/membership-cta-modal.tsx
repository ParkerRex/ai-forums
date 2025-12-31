"use client";

import {
  BookOpen,
  CheckCircle,
  MessageCircle,
  Rocket,
  Shield,
  Star,
  Users,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { checkoutAnalytics } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import { SignInModal } from "../auth/sign-in-modal";
import { useAuth } from "@/components/providers/auth-provider";

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

  const { user: currentUser } = useAuth();
  const isSignedIn = !!currentUser;
  // Default to the single available tier.
  const [selectedTier] = useState<TierType>("member");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Track modal open
  React.useEffect(() => {
    if (open) {
      checkoutAnalytics.modalOpened(source);
    }
  }, [open, source]);

  // Pricing configuration (now handled server-side)
  const PRICING = {
    memberMonthlyPrice: 99,
    memberYearlyPrice: 990,
  };

  const features = [
    {
      icon: <BookOpen className="h-5 w-5" />,
      title: "Unlimited Premium Content",
      description: "Access all posts, tutorials, and exclusive AI insights",
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Elite Network Access",
      description: "Connect with AI engineers from Google, OpenAI, Anthropic & more",
    },
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: "Private Community",
      description: "Join exclusive discussions and get insider knowledge",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Priority Support",
      description: "Get fast responses and early access to new features",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Risk-Free Membership",
      description: "Cancel anytime with our 30-day money-back guarantee",
    },
    {
      icon: <Rocket className="h-5 w-5" />,
      title: "Career Acceleration",
      description: "Access job opportunities and career advancement resources",
    },
  ];

  // Pricing details for the active "Member" tier.
  const tiers = {
    member: {
      name: "VAI Pro",
      description: "Everything you need to excel in AI",
      monthlyPrice: PRICING.memberMonthlyPrice,
      yearlyPrice: PRICING.memberYearlyPrice,
      badge: "Most Popular",
      badgeVariant: "default" as const,
    },
  } as const;

  const selectedTierData = tiers[selectedTier];
  const monthlyPrice = selectedTierData.monthlyPrice;
  const yearlyPrice = selectedTierData.yearlyPrice;
  const yearlySavings = monthlyPrice * 12 - yearlyPrice;
  const yearlySavingsPercent = Math.round((yearlySavings / (monthlyPrice * 12)) * 100);

  const handleCheckout = async () => {
    if (!isSignedIn) {
      setShowSignInModal(true);
      return;
    }

    // Track checkout initiation
    const price = billingInterval === "monthly" ? monthlyPrice : yearlyPrice;
    checkoutAnalytics.checkoutInitiated(selectedTier, billingInterval, price);

    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
          billingInterval,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const result = await response.json();

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
        error instanceof Error ? error.message : "Payment setup failed. Please try again.";
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

        <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-4xl">
          {/* Premium Header with Gradient Background */}
          <div className="border-primary/20 relative -mx-6 -mt-6 mb-6 border-b bg-gradient-to-r px-6 pb-6 pt-6">
            <div className="absolute inset-0 bg-gradient-to-r to-transparent opacity-50" />
            <div className="relative">
              <DialogHeader className="space-y-3 text-center">
                <DialogTitle className="from-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mx-auto max-w-2xl text-base">
                  {description}
                </DialogDescription>
                <div className="text-muted-foreground flex items-center justify-center gap-4 text-sm">
                  <span>Members from</span>
                  <div className="flex items-center gap-3">
                    {/* Microsoft logo */}
                    <div className="flex items-center gap-1.5">
                      <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none">
                        <path d="M11 11V0H0v11h11z" fill="#f25022" />
                        <path d="M23 11V0H12v11h11z" fill="#7fba00" />
                        <path d="M11 23V12H0v11h11z" fill="#00a4ef" />
                        <path d="M23 23V12H12v11h11z" fill="#ffb900" />
                      </svg>
                      <span className="font-medium">Microsoft</span>
                    </div>
                    {/* Google logo */}
                    <div className="flex items-center gap-1.5">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
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
                <div className="bg-muted/50 border-border/50 rounded-full border p-1.5">
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
                      className="data-[state=on]:bg-background data-[state=on]:text-foreground rounded-full px-6 py-2 font-medium data-[state=on]:shadow-md"
                    >
                      Monthly
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="yearly"
                      className="data-[state=on]:bg-background data-[state=on]:text-foreground relative rounded-full px-6 py-2 font-medium data-[state=on]:shadow-md"
                    >
                      Yearly
                      {billingInterval === "yearly" && (
                        <Badge
                          variant="secondary"
                          className="absolute -right-2 -top-2 bg-green-500 px-2 py-0.5 text-xs text-white shadow-sm hover:bg-green-500"
                        >
                          Save {yearlySavingsPercent}%
                        </Badge>
                      )}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>

              {/* Pricing Card - Premium Design */}
              <div className="mx-auto max-w-sm">
                <div className="border-primary/20 from-background to-muted/10 relative rounded-xl border-2 bg-gradient-to-br p-6 shadow-xl">
                  {/* Premium Badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge
                      variant="default"
                      className="text-primary-foreground px-3 py-1 text-xs shadow-lg"
                    >
                      <Star className="mr-1 h-3 w-3" />
                      {selectedTierData.badge}
                    </Badge>
                  </div>

                  <div className="space-y-3 text-center">
                    <div>
                      <h3 className="text-foreground text-xl font-bold">{selectedTierData.name}</h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {selectedTierData.description}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-foreground text-4xl font-bold">
                          {formatCurrency(
                            billingInterval === "monthly" ? monthlyPrice : yearlyPrice,
                          )}
                        </span>
                        <span className="text-muted-foreground text-base">
                          {billingInterval === "monthly" ? "/month" : "/year"}
                        </span>
                      </div>
                      {billingInterval === "yearly" && (
                        <div className="text-muted-foreground text-xs">
                          Just {formatCurrency(yearlyPrice / 12)}/month when paid annually
                        </div>
                      )}
                    </div>

                    {billingInterval === "yearly" && (
                      <div className="rounded-none border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-900/20">
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
                <h4 className="text-foreground mb-1 text-lg font-semibold">
                  Everything You Need to Excel
                </h4>
                <p className="text-muted-foreground text-sm">
                  Join the most exclusive AI community
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="border-border/50 hover:border-primary/20 flex items-start gap-3 rounded-none border bg-gradient-to-br p-3 transition-all duration-300"
                  >
                    <div className="text-primary flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-none bg-gradient-to-br">
                      {feature.icon}
                    </div>
                    <div className="space-y-0.5">
                      <h5 className="text-foreground text-sm font-medium">{feature.title}</h5>
                      <p className="text-muted-foreground text-xs">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section - Premium Design */}
            <div className="border-border/50 space-y-4 border-t pt-4">
              <Button
                className="h-14 w-full text-lg font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
                onClick={handleCheckout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="border-primary-foreground mr-3 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Join VAI Pro Today
                    <span className="ml-2 opacity-90">
                      {billingInterval === "monthly"
                        ? `${formatCurrency(monthlyPrice)}/mo`
                        : `${formatCurrency(yearlyPrice)}/yr`}
                    </span>
                  </>
                )}
              </Button>

              <div className="text-muted-foreground flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>Secure payment via Stripe</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>30-day money-back guarantee</span>
                </div>
                <span>•</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} />
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
    MembershipCTAModal: (props: Omit<MembershipCTAModalProps, "isOpen" | "onClose">) => (
      <MembershipCTAModal {...props} isOpen={isOpen} onClose={closeModal} />
    ),
  };
}

export default MembershipCTAModal;
