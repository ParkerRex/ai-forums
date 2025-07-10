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
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get post routing information if we have a source post
  // TODO: Use this to redirect back to the original post after onboarding
  useQuery(
    api.posts.getPostRouting,
    sourcePostId ? { postId: sourcePostId as Id<"posts"> } : "skip"
  );

  // Get member status from checkout
  const memberStatus = useQuery(
    api.members.checkoutStatus.getCheckoutMemberStatus,
    sessionData?.email ? { email: sessionData.email } : "skip"
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

      const interval: NodeJS.Timeout = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);
    }
  }, [hasTriggeredConfetti]);

  if (isLoading || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Processing your payment...</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Please wait while we set up your account.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        {/* Success message */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold">Payment Successful!</h1>
          <p className="text-xl text-muted-foreground">
            Welcome to VAI Pro, {sessionData.customerName?.split(' ')[0] || 'there'}!
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
            <h3 className="text-lg font-semibold mb-2">Setting up your account...</h3>
            <p className="text-sm text-muted-foreground">
              Your account is being created. You&apos;ll be signed in automatically.
            </p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto mt-4" />
          </Card>
        )}

        {/* Additional info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Your subscription is now active and will renew automatically.</p>
          <p>You&apos;ll be redirected to complete your account setup in a moment.</p>
        </div>
      </div>
    </div>
  );
}