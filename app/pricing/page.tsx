"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Shield, Users, Code, Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { useAction } from "convex/react";

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const createDirectCheckout = useAction(api.stripe.directCheckout.createDirectCheckout);
  const subscriptionInfo = useQuery(api.stripe.getSubscriptionInfo.getSubscriptionInfo);

  const handleCheckout = async () => {
    // Check if already subscribed
    if (isSignedIn && subscriptionInfo?.isActive && subscriptionInfo?.tier !== "free") {
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Members Only Community
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            $99/month. That&apos;s it.
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the private community where engineers from OpenAI, Anthropic, Google, 
            and Meta share their AI workflows and implementation details.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={handleCheckout}
              disabled={isLoading}
              className="min-w-[200px]"
            >
              {isLoading ? "Loading..." : "Get Access Now"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Cancel anytime. No BS.
            </p>
          </div>
        </div>

        {/* Value Props Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-muted">
            <CardHeader className="pb-3">
              <Code className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Real Implementation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Production code, architectures, and prompts from engineers building at scale.
              </p>
            </CardContent>
          </Card>

          <Card className="border-muted">
            <CardHeader className="pb-3">
              <Shield className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Private & Unfiltered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Share freely without corporate PR. What works, what doesn&apos;t, and why.
              </p>
            </CardContent>
          </Card>

          <Card className="border-muted">
            <CardHeader className="pb-3">
              <Users className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Engineers Only</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No recruiters, no spam. Just engineers who build AI systems.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* What You Get */}
        <Card className="mb-16 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">What you get</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
              {[
                "Access to all AI workflows and implementations",
                "Direct conversations with engineers from top AI labs",
                "Production prompts and system architectures",
                "Weekly implementation deep-dives",
                "Private Discord with verified engineers",
                "Early access to new AI tools and techniques",
                "No ads, no tracking, no bullshit",
                "Cancel anytime, data export on request"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Quick answers</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Why $99/month?</h3>
              <p className="text-muted-foreground">
                It keeps the community small and signal high. We&apos;re not trying to be Reddit.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Who&apos;s actually in here?</h3>
              <p className="text-muted-foreground">
                Engineers from OpenAI, Anthropic, Google DeepMind, Meta, and similar. 
                Verified through work email or commits.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Can I expense this?</h3>
              <p className="text-muted-foreground">
                Yes. We provide invoices with all the right tax info. Most engineers expense it as &quot;professional development&quot; or &quot;technical resources&quot;.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">What if it sucks?</h3>
              <p className="text-muted-foreground">
                Cancel anytime from your account. No calls, no retention BS. 
                If you cancel in the first week, we&apos;ll refund you.
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