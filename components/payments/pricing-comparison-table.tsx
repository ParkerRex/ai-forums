"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  name: string;
  free: boolean | string;
  foundingMember: boolean | string;
  member: boolean | string;
  description?: string;
}

const features: Feature[] = [
  {
    name: "Access to posts",
    free: "Preview only (50 chars)",
    foundingMember: "Full access",
    member: "Full access",
    description: "Read complete posts and discussions",
  },
  {
    name: "Community participation",
    free: false,
    foundingMember: true,
    member: true,
    description: "Comment, vote, and engage with the community",
  },
  {
    name: "Direct messaging",
    free: false,
    foundingMember: true,
    member: true,
    description: "Connect directly with other members",
  },
  {
    name: "Resource downloads",
    free: "Limited",
    foundingMember: "Unlimited",
    member: "Unlimited",
    description: "Download tutorials, templates, and guides",
  },
  {
    name: "Search & discovery",
    free: "Basic",
    foundingMember: "Advanced",
    member: "Advanced",
    description: "Find relevant content and members",
  },
  {
    name: "Event access",
    free: "Public only",
    foundingMember: "All events",
    member: "All events",
    description: "Join workshops, meetups, and AMAs",
  },
  {
    name: "Profile customization",
    free: true,
    foundingMember: true,
    member: true,
    description: "Personalize your member profile",
  },
  {
    name: "Bookmarks",
    free: "5 max",
    foundingMember: "Unlimited",
    member: "Unlimited",
    description: "Save posts for later reference",
  },
  {
    name: "API access",
    free: false,
    foundingMember: true,
    member: true,
    description: "Integrate with your tools and workflows",
  },
  {
    name: "Support",
    free: "Community",
    foundingMember: "Priority",
    member: "Priority",
    description: "Get help when you need it",
  },
  {
    name: "Price lock guarantee",
    free: false,
    foundingMember: "Forever",
    member: false,
    description: "Keep your pricing rate permanently",
  },
];

export function PricingComparisonTable() {
  return (
    <div className="w-full overflow-x-auto rounded-none border">
      <table className="w-full border-collapse">
        <thead className="bg-background sticky top-0 z-10">
          <tr className="border-b">
            <th className="min-w-[200px] p-4 text-left font-medium">Features</th>
            <th className="min-w-[140px] p-4 text-center font-medium">
              <div className="space-y-1">
                <div className="text-lg">Free</div>
                <div className="text-muted-foreground text-sm font-normal">$0/month</div>
              </div>
            </th>
            <th className="min-w-[140px] p-4 text-center font-medium">
              <div className="space-y-1">
                <div className="text-lg">Member</div>
                <div className="text-muted-foreground text-sm font-normal">$99/month</div>
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
                    <div className="text-muted-foreground text-sm">{feature.description}</div>
                  )}
                </div>
              </td>
              <td className="p-4 text-center">
                {typeof feature.free === "boolean" ? (
                  feature.free ? (
                    <Check className="mx-auto h-5 w-5 text-green-600 dark:text-green-500" />
                  ) : (
                    <X className="text-muted-foreground mx-auto h-5 w-5" />
                  )
                ) : (
                  <span className="text-muted-foreground text-sm">{feature.free}</span>
                )}
              </td>
              <td className="p-4 text-center">
                {typeof feature.member === "boolean" ? (
                  feature.member ? (
                    <Check className="mx-auto h-5 w-5 text-green-600 dark:text-green-500" />
                  ) : (
                    <X className="text-muted-foreground mx-auto h-5 w-5" />
                  )
                ) : (
                  <span className="text-sm font-medium">{feature.member}</span>
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
  const keyFeatures = features.slice(0, 6);

  return (
    <div className={cn("bg-card rounded-none border p-6", className)}>
      <h3 className="mb-4 text-lg font-semibold">Plan Comparison</h3>
      <div className="space-y-3">
        {keyFeatures.map((feature, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium">{feature.name}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="min-w-[50px] text-center">
                <div className="text-muted-foreground mb-1 text-xs">Free</div>
                {typeof feature.free === "boolean" ? (
                  feature.free ? (
                    <Check className="mx-auto h-4 w-4 text-green-600 dark:text-green-500" />
                  ) : (
                    <X className="text-muted-foreground mx-auto h-4 w-4" />
                  )
                ) : (
                  <span className="text-muted-foreground text-xs">{feature.free}</span>
                )}
              </div>
              {/* Removed Founding Member column */}
              <div className="min-w-[50px] text-center">
                <div className="text-muted-foreground mb-1 text-xs">Member</div>
                {typeof feature.member === "boolean" ? (
                  feature.member ? (
                    <Check className="mx-auto h-4 w-4 text-green-600 dark:text-green-500" />
                  ) : (
                    <X className="text-muted-foreground mx-auto h-4 w-4" />
                  )
                ) : (
                  <span className="text-xs font-medium">{feature.member}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
