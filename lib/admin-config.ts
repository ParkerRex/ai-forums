/**
 * Admin Configuration
 *
 * Centralized configuration for admin components to ensure
 * consistency and avoid duplication
 */

import { Calendar, CheckCircle, Clock, RefreshCw, User, UserX, XCircle } from "lucide-react";

/**
 * Tier configuration with display names, colors, and pricing
 * Note: No free tier - platform operates with zero free users
 * Scholarships handled via Stripe coupons with early_bird tier
 */
export const tierConfig = {
  founding_member: {
    label: "Founding",
    color: "bg-amber-100 text-amber-700",
    borderColor: "border-amber-200",
    price: "$39",
    priceMonthly: 39,
    priceYearly: 375,
  },
  early_bird: {
    label: "Early Bird",
    color: "bg-blue-100 text-blue-700",
    borderColor: "border-blue-200",
    price: "$50",
    priceMonthly: 50,
    priceYearly: 480,
  },
  member: {
    label: "Member",
    color: "bg-green-100 text-green-700",
    borderColor: "border-green-200",
    price: "$99",
    priceMonthly: 99,
    priceYearly: 0, // No yearly option
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
  cancelled: {
    label: "Cancelled",
    color: "bg-yellow-50 text-yellow-700",
    borderColor: "border-yellow-200",
    icon: Calendar,
  },
  churned: {
    label: "Churned",
    color: "bg-red-50 text-red-700",
    borderColor: "border-red-200",
    icon: UserX,
  },
  past_due: {
    label: "Past Due",
    color: "bg-orange-50 text-orange-700",
    borderColor: "border-orange-200",
    icon: Clock,
  },
  expired: {
    label: "Expired",
    color: "bg-red-50 text-red-700",
    borderColor: "border-red-200",
    icon: UserX,
  },
} as const;

/**
 * Payment status configuration
 */
export const paymentStatusConfig = {
  succeeded: {
    label: "Paid",
    color: "bg-green-50 text-green-700",
    borderColor: "border-green-200",
    icon: CheckCircle,
  },
  pending: {
    label: "Pending",
    color: "bg-yellow-50 text-yellow-700",
    borderColor: "border-yellow-200",
    icon: Clock,
  },
  failed: {
    label: "Failed",
    color: "bg-red-50 text-red-700",
    borderColor: "border-red-200",
    icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    color: "bg-gray-50 text-gray-700",
    borderColor: "border-gray-200",
    icon: RefreshCw,
  },
  partially_refunded: {
    label: "Partial Refund",
    color: "bg-orange-50 text-orange-700",
    borderColor: "border-orange-200",
    icon: RefreshCw,
  },
} as const;

// Type exports for type safety
export type TierType = keyof typeof tierConfig;
export type MemberStatusType = keyof typeof memberStatusConfig;
export type PaymentStatusType = keyof typeof paymentStatusConfig;
