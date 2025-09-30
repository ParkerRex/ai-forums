/**
 * @fileoverview Membership checkout success page (client)
 *
 * This component handles **two** different post-checkout scenarios:
 * 1. Existing Clerk users that just upgraded their subscription.
 *    – Webhook activates their Convex member immediately.
 *    – No `signInToken` is required, we simply wait for `memberStatus` to
 *      show the subscription is active then redirect.
 * 2. Guest / password-less checkouts.
 *    – Convex creates a temporary member and stores a one-time Clerk
 *      `signInToken` when the webhook finishes.
 *    – When the query returns the token we render <AutoSignIn/> which
 *      exchanges the ticket with Clerk and redirects afterwards.
 *
 * NOTE: All of this logic should be replaced by a small **Edge/server route**
 * that validates the `session_id`, sets a Clerk ticket cookie (if needed)
 * and issues a 302 so users never get “stuck”.
 *
 * TODO(MVP-CLEANUP): Move success flow to an Edge handler once webhook
 * latency is <1s.
 */
"use client";

import confetti from "canvas-confetti";
import { useQuery } from "convex/react";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCheckoutSessionData } from "@/app/actions/checkout-session";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getPaywallVariant, type PaywallVariant, successCopy } from "@/lib/conversion-copy";
import { AutoSignIn } from "./auto-signin";

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

  // Added: router for redirects
  const router = useRouter();

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

      const interval: NodeJS.Timeout = setInterval(() => {
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

  // Redirect users who are already fully set up (have an active member record but no sign-in token required)
  // TODO(MVP-CLEANUP): This redirect logic becomes obsolete once we move the entire flow to the Edge handler.
  useEffect(() => {
    if (memberStatus && !memberStatus.signInToken) {
      // If we have the source post id, send the user back there, otherwise home
      const target = sourcePostId ? "/" : "/"; // TODO: map postId to URL when routing util is available
      router.replace(target);
    }
  }, [memberStatus, router, sourcePostId]);

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
          <p className="text-muted-foreground mt-2 text-base">{copy.celebration}</p>
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
            <h3 className="mb-2 text-lg font-semibold">Setting up your account...</h3>
            <p className="text-muted-foreground text-sm">
              Your account is being created. You&apos;ll be signed in automatically.
            </p>
            <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin" />
          </Card>
        )}

        {/* Additional info */}
        <div className="text-muted-foreground text-center text-sm">
          <p>{copy.nextSteps}</p>
          <p className="mt-2">Your subscription is now active and will renew automatically.</p>
        </div>
      </div>
    </div>
  );
}
