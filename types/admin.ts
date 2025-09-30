import type { Doc, Id } from "@/convex/_generated/dataModel";

// Member with computed status
export type MemberWithStatus = Doc<"members"> & {
  status: "active" | "cancelled" | "churned";
  subscription?: Doc<"subscriptions"> | null;
};

// Payment with member info
export type PaymentWithMember = Doc<"payments"> & {
  member: {
    _id: Id<"members">;
    firstName?: string;
    lastName?: string;
    email: string;
    tier?: Doc<"members">["tier"];
  } | null;
};

// Member details response
export type MemberDetailsResponse = {
  member: Doc<"members">;
  status: "active" | "cancelled" | "churned";
  subscription: Doc<"subscriptions"> | null;
  payments: Doc<"payments">[];
  activity: {
    posts: Doc<"posts">[];
    comments: Doc<"comments">[];
    postCount: number;
    commentCount: number;
  };
};

// Payment details response
export type PaymentDetailsResponse = {
  payment: Doc<"payments">;
  member: Doc<"members"> | null;
  subscription: Doc<"subscriptions"> | null;
};

// Membership stats
// Note: No free tier - platform operates with zero free users
// Scholarships handled via Stripe coupons with early_bird tier
export type MembershipStats = {
  totalMembers: number;
  tierStats: {
    founding_member: number;
    early_bird: number;
    member: number;
  };
  statusStats: {
    active: number;
    cancelled: number;
    churned: number;
  };
  revenue: {
    mrr: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    formattedMrr: string;
    formattedMonthly: string;
    formattedYearly: string;
  };
};

// Payment stats
export type PaymentStats = {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  refundedPayments: number;
  revenue: {
    gross: number;
    refunds: number;
    fees: number;
    net: number;
    formattedGross: string;
    formattedRefunds: string;
    formattedFees: string;
    formattedNet: string;
  };
  averagePayment: number;
  formattedAveragePayment: string;
};

// Refund eligibility
export type RefundEligibility =
  | { eligible: false; reason: string }
  | {
      eligible: true;
      maxRefundAmount: number;
      alreadyRefunded: number;
      originalAmount: number;
    };
