"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
  description?: string;
}

const features: Feature[] = [
  {
    name: "Access to posts",
    free: "Preview only (50 chars)",
    pro: "Full access",
    description: "Read complete posts and discussions"
  },
  {
    name: "Community participation",
    free: false,
    pro: true,
    description: "Comment, vote, and engage with the community"
  },
  {
    name: "Direct messaging",
    free: false,
    pro: true,
    description: "Connect directly with other members"
  },
  {
    name: "Resource downloads",
    free: "Limited",
    pro: "Unlimited",
    description: "Download tutorials, templates, and guides"
  },
  {
    name: "Search & discovery",
    free: "Basic",
    pro: "Advanced",
    description: "Find relevant content and members"
  },
  {
    name: "Event access",
    free: "Public only",
    pro: "All events",
    description: "Join workshops, meetups, and AMAs"
  },
  {
    name: "Profile customization",
    free: true,
    pro: true,
    description: "Personalize your member profile"
  },
  {
    name: "Bookmarks",
    free: "5 max",
    pro: "Unlimited",
    description: "Save posts for later reference"
  },
  {
    name: "API access",
    free: false,
    pro: true,
    description: "Integrate with your tools and workflows"
  },
  {
    name: "Support",
    free: "Community",
    pro: "Priority",
    description: "Get help when you need it"
  },
];

export function PricingComparisonTable() {
  return (
    <div className="w-full overflow-x-auto border rounded-lg">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b">
            <th className="text-left p-4 font-medium min-w-[200px]">Features</th>
            <th className="text-center p-4 font-medium min-w-[120px]">
              <div className="space-y-1">
                <div className="text-lg">Free</div>
                <div className="text-sm text-muted-foreground font-normal">$0/month</div>
              </div>
            </th>
            <th className="text-center p-4 font-medium bg-accent/5 min-w-[120px]">
              <div className="space-y-1">
                <div className="text-lg">VAI Pro</div>
                <div className="text-sm text-muted-foreground font-normal">$99/month</div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr key={index} className="border-b">
              <td className="p-4">
                <div className="space-y-1">
                  <div className="font-medium">{feature.name}</div>
                  {feature.description && (
                    <div className="text-sm text-muted-foreground">
                      {feature.description}
                    </div>
                  )}
                </div>
              </td>
              <td className="text-center p-4">
                {typeof feature.free === "boolean" ? (
                  feature.free ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-500 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground mx-auto" />
                  )
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {feature.free}
                  </span>
                )}
              </td>
              <td className="text-center p-4 bg-accent/5">
                {typeof feature.pro === "boolean" ? (
                  feature.pro ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-500 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground mx-auto" />
                  )
                ) : (
                  <span className="text-sm font-medium">
                    {feature.pro}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CompactPricingComparisonProps {
  className?: string;
}

export function CompactPricingComparison({ className }: CompactPricingComparisonProps) {
  const keyFeatures = features.slice(0, 6); // Show only first 6 features in compact view

  return (
    <div className={cn("bg-card border rounded-lg p-6", className)}>
      <h3 className="text-lg font-semibold mb-4">Free vs Pro Comparison</h3>
      <div className="space-y-3">
        {keyFeatures.map((feature, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium">{feature.name}</div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center min-w-[60px]">
                {typeof feature.free === "boolean" ? (
                  feature.free ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-500 mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground mx-auto" />
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {feature.free}
                  </span>
                )}
              </div>
              <div className="text-center min-w-[60px]">
                {typeof feature.pro === "boolean" ? (
                  feature.pro ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-500 mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground mx-auto" />
                  )
                ) : (
                  <span className="text-xs font-medium">
                    {feature.pro}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}