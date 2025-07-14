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
    <div className="w-full overflow-x-auto border rounded-lg">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b">
            <th className="text-left p-4 font-medium min-w-[200px]">
              Features
            </th>
            <th className="text-center p-4 font-medium min-w-[140px]">
              <div className="space-y-1">
                <div className="text-lg">Free</div>
                <div className="text-sm text-muted-foreground font-normal">
                  $0/month
                </div>
              </div>
            </th>
            <th className="text-center p-4 font-medium min-w-[140px]">
              <div className="space-y-1">
                <div className="text-lg">Member</div>
                <div className="text-sm text-muted-foreground font-normal">
                  $99/month
                </div>
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
              <td className="text-center p-4">
                {typeof feature.member === "boolean" ? (
                  feature.member ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-500 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground mx-auto" />
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

export function CompactPricingComparison({
  className,
}: CompactPricingComparisonProps) {
  const keyFeatures = features.slice(0, 6);

  return (
    <div className={cn("bg-card border rounded-lg p-6", className)}>
      <h3 className="text-lg font-semibold mb-4">Plan Comparison</h3>
      <div className="space-y-3">
        {keyFeatures.map((feature, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium">{feature.name}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center min-w-[50px]">
                <div className="text-xs text-muted-foreground mb-1">Free</div>
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
              {/* Removed Founding Member column */}
              <div className="text-center min-w-[50px]">
                <div className="text-xs text-muted-foreground mb-1">Member</div>
                {typeof feature.member === "boolean" ? (
                  feature.member ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-500 mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground mx-auto" />
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
