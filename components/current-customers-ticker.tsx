"use client";

import { useEffect, useState } from "react";

const companies = [
  "Google",
  "Microsoft", 
  "OpenAI",
  "Anthropic",
  "Meta",
  "Apple",
  "Amazon",
  "Netflix",
  "Spotify",
  "Uber",
  "Airbnb",
  "Stripe",
  "GitHub",
  "Figma",
  "Slack",
  "Discord",
  "Notion",
  "Linear"
];

export default function CurrentCustomersTicker() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Used by leading AI engineering teams
          </h2>
          <p className="text-muted-foreground">
            Join thousands of AI engineers from top companies
          </p>
        </div>
        
        <div className="relative overflow-hidden">
          {/* Gradient overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background/80 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background/80 to-transparent z-10" />
          
          {/* Scrolling container */}
          <div className="flex animate-scroll space-x-8 py-8">
            {/* First set of logos */}
            {companies.map((company, index) => (
              <div
                key={`first-${index}`}
                className="flex-shrink-0 flex items-center justify-center min-w-[120px] h-16 px-6 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {company}
                </span>
              </div>
            ))}
            
            {/* Duplicate set for seamless loop */}
            {companies.map((company, index) => (
              <div
                key={`second-${index}`}
                className="flex-shrink-0 flex items-center justify-center min-w-[120px] h-16 px-6 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {company}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}