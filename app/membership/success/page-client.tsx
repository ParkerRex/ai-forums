"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AutoSignIn } from "./auto-signin";
import { getCheckoutSessionData } from "@/app/actions/checkout-session";
import {
  successCopy,
  getPaywallVariant,
  type PaywallVariant,
} from "@/lib/conversion-copy";

interface SessionData {
  email: string;
  customerId: string;
  subscriptionId: string;
  customerName?: string;
  signInToken?: string;
}

export function SuccessPageClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const sourcePostId = searchParams.get("source_post_id");
  const variantParam = searchParams.get("variant") as PaywallVariant | null;
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get the messaging variant
  const variant = getPaywallVariant(variantParam || undefined);
  const copy = successCopy[variant];

  // Get post routing information if we have a source post
  // TODO: Use this to redirect back to the original post after onboarding
  useQuery(
    api.posts.getPostRouting,
    sourcePostId ? { postId: sourcePostId as Id<"posts"> } : "skip",
  );

  // Get member status from checkout
  const memberStatus = useQuery(
    api.members.checkoutStatus.getCheckoutMemberStatus,
    sessionData?.email ? { email: sessionData.email } : "skip",
  );

  // Fetch checkout session data
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getCheckoutSessionData(sessionId);
        setSessionData(data);
      } catch (error) {
        console.error("Error fetching session data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  // Trigger confetti animation on mount
  useEffect(() => {
    if (!hasTriggeredConfetti) {
      setHasTriggeredConfetti(true);

      // Fire confetti
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: NodeJS.Timeout = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);
    }
  }, [hasTriggeredConfetti]);

  if (isLoading || !sessionData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <h3 className="text-lg font-semibold">Processing your payment...</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Please wait while we set up your account.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Success message */}
        <div className="space-y-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <h1 className="text-4xl font-bold">{copy.headline}</h1>
          <p className="text-muted-foreground text-xl">
            {copy.welcome(sessionData.customerName?.split(" ")[0])}
          </p>
          <p className="text-muted-foreground mt-2 text-base">
            {copy.celebration}
          </p>
        </div>

        {/* Auto sign-in component */}
        {memberStatus?.signInToken ? (
          <AutoSignIn
            signInToken={memberStatus.signInToken}
            email={sessionData.email}
            sourcePostId={sourcePostId || undefined}
          />
        ) : (
          <Card className="p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold">
              Setting up your account...
            </h3>
            <p className="text-muted-foreground text-sm">
              Your account is being created. You&apos;ll be signed in
              automatically.
            </p>
            <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin" />
          </Card>
        )}

        {/* Additional info */}
        <div className="text-muted-foreground text-center text-sm">
          <p>{copy.nextSteps}</p>
          <p className="mt-2">
            Your subscription is now active and will renew automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
