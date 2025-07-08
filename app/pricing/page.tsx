"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Building, GraduationCap } from "lucide-react";
import { useState } from "react";
import CurrentCustomersTicker from "@/components/current-customers-ticker";

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"yearly" | "monthly">("yearly");

  const monthlyPrice = 99;
  const yearlyPrice = 59;
  const savings = Math.round(((monthlyPrice * 12 - yearlyPrice * 12) / (monthlyPrice * 12)) * 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-foreground">
            Build like a Pro.
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get full access to all features and connect with AI engineers from top companies  Cancel anytime.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                billingPeriod === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Monthly
            </button>
          </div>
          
          {billingPeriod === "yearly" && (
            <p className="text-primary font-medium">
              Save {savings}% on a yearly subscription
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Pro Plan */}
          <Card className="relative border-2 border-primary/20 bg-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  Popular
                </Badge>
              </div>
              <p className="text-muted-foreground">For AI engineers</p>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${billingPeriod === "yearly" ? yearlyPrice : monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">
                    per month
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {billingPeriod === "yearly" ? "billed yearly" : "billed monthly"}
                </p>
              </div>
              
              <Button className="w-full mb-6" size="lg">
                Join VAI Pro
              </Button>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Access all AI engineering workflows</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Connect with top AI engineers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Unlimited knowledge sharing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Advanced search & discovery</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Real-time collaboration</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Priority support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Member analytics</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  ...and more
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Plan */}
          <Card className="border-2 border-border bg-card">
            <CardHeader>
              <CardTitle className="text-2xl">Team</CardTitle>
              <p className="text-muted-foreground">For AI teams & organizations</p>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${billingPeriod === "yearly" ? Math.round(yearlyPrice * 1.5) : Math.round(monthlyPrice * 1.5)}
                  </span>
                  <span className="text-muted-foreground">
                    per member/month
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {billingPeriod === "yearly" ? "billed yearly" : "billed monthly"}
                </p>
              </div>
              
              <Button variant="outline" className="w-full mb-6" size="lg">
                Create Team
              </Button>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">All Pro features</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Team knowledge base</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Advanced collaboration tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Admin dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Centralized billing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Team analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Priority support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Custom integrations</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enterprise & Student Sections */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Enterprise */}
          <div className="text-center p-8 border border-border rounded-lg">
            <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
            <p className="text-muted-foreground mb-4">
              Get advanced security, priority support, custom integrations & more.
            </p>
            <Button variant="outline">
              Contact Sales
            </Button>
          </div>

          {/* Student */}
          <div className="text-center p-8 border border-border rounded-lg">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Student or educator?</h3>
            <p className="text-muted-foreground mb-4">
              Discover VAI for Education and get a discount if you&apos;re eligible.
            </p>
            <Button variant="outline">
              Learn more
            </Button>
          </div>
        </div>
      </div>
      
      {/* Customer Ticker */}
      <CurrentCustomersTicker />
    </div>
  );
}