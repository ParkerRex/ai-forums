"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, ArrowRight, MessageSquare, BookOpen, User } from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";

export function SuccessPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // const sessionId = searchParams.get("session_id"); // Will be used for session validation in future
  const sourcePostId = searchParams.get("source_post_id");
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

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
          
          <h1 className="text-4xl font-bold">Welcome to VAI Pro!</h1>
          <p className="text-xl text-muted-foreground">
            Your payment was successful. You now have full access to all premium content.
          </p>
        </div>

        {/* Onboarding checklist */}
        <Card className="p-8">
          <h2 className="text-2xl font-semibold mb-6">What&apos;s Next?</h2>
          
          <div className="space-y-6">
            {/* Check item 1 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Payment Processed Successfully</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your subscription is now active and will renew automatically.
                </p>
              </div>
            </div>

            {/* Check item 2 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Full Access Unlocked</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You can now read all premium posts and access exclusive content.
                </p>
              </div>
            </div>

            {/* Action item 1 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Create Your Account (Optional)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign up to personalize your experience and join discussions.
                </p>
                <Link href="/sign-up" className="inline-flex items-center text-sm text-primary hover:underline mt-2">
                  Create account
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>

            {/* Action item 2 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Explore Premium Content</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Dive into our collection of AI engineering tutorials and insights.
                </p>
                <Link href="/" className="inline-flex items-center text-sm text-primary hover:underline mt-2">
                  Browse posts
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>

            {/* Action item 3 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Join the Community</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect with 2,000+ AI engineers in our Discord server.
                </p>
                <a 
                  href="https://discord.gg/vai-community" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:underline mt-2"
                >
                  Join Discord
                  <ArrowRight className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* Primary action button */}
        <div className="text-center">
          <Button size="lg" onClick={() => router.push(sourcePostId ? `/post/${sourcePostId}` : "/")}>
            {sourcePostId ? "Return to Post" : "Start Exploring Premium Content"}
          </Button>
        </div>
      </div>
    </div>
  );
}