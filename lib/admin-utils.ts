/**
 * Admin Utilities
 *
 * Common utility functions for admin components
 */

type MemberLike = {
  firstName?: string;
  lastName?: string;
  email: string;
  status?: string;
  subscriptionStatus?: string;
  subscriptionEndDate?: number | null;
  amountCents?: number | null;
};

/**
 * Get display name for a member
 */
export function getMemberDisplayName(member: {
  firstName?: string;
  lastName?: string;
  email: string;
}): string {
  if (member.firstName && member.lastName) {
    return `${member.firstName} ${member.lastName}`;
  }
  return member.email.split("@")[0];
}

/**
 * Get initials for a member's avatar
 */
export function getMemberInitials(member: {
  firstName?: string;
  lastName?: string;
  email: string;
}): string {
  if (member.firstName && member.lastName) {
    return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  }
  return member.email[0].toUpperCase();
}

/**
 * Determine member status based on subscription data
 */
export function getMemberStatus(member: MemberLike): string {
  // If member has an explicit status field, use it
  if (member.status) {
    // Map "duplicate" to appropriate display status (no free tier)
    if (member.status === "duplicate") return "churned"; // Duplicates are churned
    return member.status;
  }

  // Otherwise, derive from subscription status
  if (member.subscriptionStatus === "cancelled") {
    // If there's a future end date, they're cancelled but still active
    if (member.subscriptionEndDate && member.subscriptionEndDate > Date.now()) {
      return "cancelled";
    }
    return "churned";
  }

  // Active status
  if (member.subscriptionStatus === "active") {
    return "active";
  }

  // Past due
  if (member.subscriptionStatus === "past_due") {
    return "past_due";
  }

  // Expired or no status
  return "churned";
}

/**
 * Check if member should show billing information
 */
export function shouldShowBilling(member: { tier?: string; billingInterval?: string }): boolean {
  return (
    member.tier !== undefined &&
    member.tier !== "free" &&
    member.tier !== "scholarship" &&
    member.billingInterval !== undefined
  );
}

/**
 * Format a price for display based on billing interval
 */
export function formatTierPrice(
  tier: string,
  billingInterval: "monthly" | "yearly",
  amountCents?: number,
): string {
  // If we have a specific amount, use it
  if (amountCents !== undefined) {
    const amount = amountCents / 100;
    return billingInterval === "yearly" ? `$${amount}/yr` : `$${amount}/mo`;
  }

  // Otherwise use default tier pricing
  const tierPricing: Record<string, { monthly: number; yearly: number }> = {
    founding_member: { monthly: 39, yearly: 375 },
    early_bird: { monthly: 50, yearly: 480 },
    member: { monthly: 99, yearly: 0 },
  };

  const pricing = tierPricing[tier];
  if (!pricing) return "";

  if (billingInterval === "yearly" && pricing.yearly > 0) {
    return `$${pricing.yearly}/yr`;
  }

  return `$${pricing.monthly}/mo`;
}

/**
 * Check if a member has a scholarship.
 * A member is considered to have a scholarship if their subscription is active
 * and their payment amount is zero.
 */
export function isScholarshipMember(member: MemberLike): boolean {
  return member.subscriptionStatus === "active" && member.amountCents === 0;
}
