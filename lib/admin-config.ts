/**
 * Admin Configuration
 *
 * Centralized configuration for admin components to ensure
 * consistency and avoid duplication
 */

import { User, UserX } from "lucide-react";

/**
 * Tier configuration with display names and colors (legacy display only)
 */
export const tierConfig = {
  founding_member: {
    label: "Founding",
    color: "bg-amber-100 text-amber-700",
    borderColor: "border-amber-200",
  },
  early_bird: {
    label: "Early Bird",
    color: "bg-blue-100 text-blue-700",
    borderColor: "border-blue-200",
  },
  member: {
    label: "Member",
    color: "bg-green-100 text-green-700",
    borderColor: "border-green-200",
  },
} as const;

/**
 * Member status configuration
 */
export const memberStatusConfig = {
  active: {
    label: "Active",
    color: "bg-green-50 text-green-700",
    borderColor: "border-green-200",
    icon: User,
  },
  churned: {
    label: "Churned",
    color: "bg-red-50 text-red-700",
    borderColor: "border-red-200",
    icon: UserX,
  },
} as const;

// Type exports for type safety
export type TierType = keyof typeof tierConfig;
export type MemberStatusType = keyof typeof memberStatusConfig;
