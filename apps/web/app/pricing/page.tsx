"use client";

import { Button } from "@/web/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/web/components/ui/card";
import { Check, Zap, Shield, Users, Code, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { useAction } from "convex/react";

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const createDirectCheckout = useAction(
    api.stripe.directCheckout.createDirectCheckout,
  );
  const subscriptionInfo = useQuery(
    api.stripe.getSubscriptionInfo.getSubscriptionInfo,
  );

  const handleCheckout = async () => {
    // Check if already subscribed (no free tier - all subscriptions are paid)
    if (isSignedIn && subscriptionInfo?.isActive) {
      toast.info("You already have an active subscription");
      router.push("/settings/billing");
      return;
    }

    setIsLoading(true);
    try {
      // Use direct checkout that doesn't require authentication
      const { url } = await createDirectCheckout({});
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to create checkout session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto max-w-6xl px-4 py-16">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="text-foreground mb-6 text-5xl font-bold md:text-6xl">
            Where AI Engineers Hangout.
          </h1>

          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl">
            Join the private community where engineers from OpenAI, Anthropic,
            Google, and Meta share their AI workflows and implementation
            details.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={isLoading}
              className="min-w-[200px]"
            >
              {isLoading ? "Loading..." : "Get Access Now"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-muted-foreground text-sm">
              Cancel anytime. No BS.
            </p>
          </div>
        </div>

        {/* Value Props Grid */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          <Card className="border-muted">
            <CardHeader className="pb-3">
              <Code className="text-primary mb-2 h-8 w-8" />
              <CardTitle className="text-lg">
                Real Implementation Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Production code, architectures, and prompts from engineers
                building at scale.
              </p>
            </CardContent>
          </Card>

          <Card className="border-muted">
            <CardHeader className="pb-3">
              <Shield className="text-primary mb-2 h-8 w-8" />
              <CardTitle className="text-lg">Private & Unfiltered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Share freely without corporate PR. What works, what
                doesn&apos;t, and why.
              </p>
            </CardContent>
          </Card>

          <Card className="border-muted">
            <CardHeader className="pb-3">
              <Users className="text-primary mb-2 h-8 w-8" />
              <CardTitle className="text-lg">Engineers Only</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                No recruiters, no spam. Just engineers who build AI systems.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* What You Get */}
        <Card className="border-primary/20 mb-16">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Zap className="text-primary h-5 w-5" />
              <h2 className="text-2xl font-bold">What you get</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-12 gap-y-4 md:grid-cols-2">
              {[
                "Access to all AI workflows and implementations",
                "Direct conversations with engineers from top AI labs",
                "Production prompts and system architectures",
                "Weekly implementation deep-dives",
                "Private Discord with verified engineers",
                "Early access to new AI tools and techniques",
                "No ads, no tracking, no bs",
                "Cancel anytime, data export on request",
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Quick answers</h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold">Why $99/month?</h3>
              <p className="text-muted-foreground">
                It keeps the community small and signal high. We&apos;re not
                trying to be Reddit.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">
                Who&apos;s actually in here?
              </h3>
              <p className="text-muted-foreground">
                Engineers from Google, Microsoft, and high growth startups.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Can I expense this?</h3>
              <p className="text-muted-foreground">
                Yes. We provide invoices with all the right tax info. Most
                engineers expense it as &quot;professional development&quot; or
                &quot;technical resources&quot;.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">What if it sucks?</h3>
              <p className="text-muted-foreground">
                Cancel anytime from your account. No calls, no retention BS. If
                you cancel in the first week, we&apos;ll refund you.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={isLoading}
              className="min-w-[200px]"
            >
              {isLoading ? "Loading..." : "Join VAI Community"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
