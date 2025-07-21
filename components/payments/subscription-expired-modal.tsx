// DEFERRED: Subscription reactivation modal implementation
// This component is part of Phase 6 (Subscription Lifecycle Management) which has been deferred.
// When ready to implement, uncomment the code below and fix the createCheckoutSession parameters.
//
// Known issues to fix:
// 1. createCheckoutSession requires: priceId, tier, billingInterval, optional couponCode
// 2. Currently passing incorrect metadata parameter
// 3. Need to determine correct priceId based on user's previous subscription
// 4. Consider creating a dedicated createReactivationCheckoutSession mutation

/*
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SubscriptionExpiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: {
    _id: Id<"members">;
    slug: string;
    email?: string;
    displayName?: string;
    stripeCustomerId?: string;
    membershipTier?: string;
  };
  returnPath?: string;
}

export function SubscriptionExpiredModal({
  open,
  onOpenChange,
  member,
  returnPath,
}: SubscriptionExpiredModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showSpecialOffer, setShowSpecialOffer] = useState(false);
  const createCheckoutSession = useMutation(api.stripe.createCheckoutSession);

  useEffect(() => {
    // Check if user qualifies for win-back pricing
    const checkWinBackEligibility = async () => {
      if (member?.stripeCustomerId) {
        // In the future, we could check subscription history
        // For now, show special offer to all expired users
        setShowSpecialOffer(true);
      }
    };
    
    if (open && member) {
      checkWinBackEligibility();
    }
  }, [open, member]);

  const handleReactivate = async () => {
    if (!member) return;

    setIsLoading(true);
    try {
      // TODO: Fix this implementation
      // createCheckoutSession expects: priceId, tier, billingInterval, optional couponCode
      // Not the metadata object being passed here
      
      // Need to:
      // 1. Determine the correct priceId based on tier and billing interval
      // 2. Pass the required parameters correctly
      // 3. Consider creating a separate createReactivationCheckoutSession mutation
      //    that handles the special metadata tracking for win-back campaigns
      
      const session = await createCheckoutSession({
        tier: member.membershipTier || "member",
        metadata: {
          reactivation: "true",
          previousCustomer: member.stripeCustomerId || "",
          returnPath: returnPath || "/",
        },
      });

      if (session?.url) {
        router.push(session.url);
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error) {
      console.error("Reactivation error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaybeLater = () => {
    onOpenChange(false);
  };

  const memberName = member?.displayName || member?.email?.split("@")[0] || "there";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            Welcome back, {memberName}!
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-4">
            <p className="text-base">
              Your VAI Pro access has expired, but we&apos;d love to have you back.
            </p>
            
            {showSpecialOffer && (
              <div className="rounded-none border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-semibold">Special welcome back offer!</span>
                </div>
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  Get your first month back at 20% off - just $79 instead of $99
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">What you&apos;ll get back:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Access to all premium content instantly</li>
                <li>• Your {member?.membershipTier === "founding" ? "founding member benefits" : "member benefits"}</li>
                <li>• All your saved bookmarks and progress</li>
                <li>• Direct messaging with other engineers</li>
                <li>• Cancel anytime, no questions asked</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleReactivate}
                disabled={isLoading}
                size="lg"
                className={cn(
                  "w-full",
                  showSpecialOffer && "bg-green-600 hover:bg-green-700"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting things up...
                  </>
                ) : (
                  <>
                    {showSpecialOffer ? "Get 20% off - $79/mo" : "Reactivate Pro - $99/mo"}
                  </>
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleMaybeLater}
                disabled={isLoading}
                className="w-full"
              >
                Maybe later
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              No commitment • Cancel anytime • Instant access
            </p>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
*/

// Temporary placeholder export to prevent import errors
export function SubscriptionExpiredModal() {
  return null;
}
