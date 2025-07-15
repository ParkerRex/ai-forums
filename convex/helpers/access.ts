/**
 * Subscription-based access control for content and features.
 *
 * Rules:
 * - Active subscriptions with paid tiers get full access
 * - Cancelled subscriptions have grace period until end date
 * - All other statuses require upgrade
 */

import { Doc } from "../_generated/dataModel";
import { DatabaseReader } from "../_generated/server";

/**
 * Check if member can view full content.
 * @param member - Member document (can be null)
 * @returns true if member has full access
 */
export function canViewFullContent(member: Doc<"members"> | null | undefined): boolean {
  // Early return for unauthenticated users
  if (!member) return false;
  
  
  // Check subscription status first - active subscriptions get priority evaluation
  if (member.subscriptionStatus !== "active") {
    // Handle grace period for cancelled subscriptions
    // This allows users to maintain access until their paid period ends
    if (member.subscriptionStatus === "cancelled" && member.subscriptionEndDate) {
      const now = Date.now();
      // Compare timestamps to determine if still within grace period
      return member.subscriptionEndDate > now;
    }
    // All other non-active statuses (past_due, expired, null) deny access
    return false;
  }
  
  // For active subscriptions, verify the tier grants full access
  // Note: scholarships now handled via Stripe coupons, not tier-based
  const fullAccessTiers = ["founding_member", "early_bird", "member"];
  // Ensure tier exists and is in the allowed list
  // Guest members (no externalId) with valid subscriptions also get full access
  return member.tier ? fullAccessTiers.includes(member.tier) : false;
}

/**
 * Check if member needs to upgrade subscription.
 * @param member - Member document (can be null)
 * @returns true if upgrade needed
 */
export function needsSubscriptionUpgrade(member: Doc<"members"> | null | undefined): boolean {
  // Unauthenticated users always need to sign up/upgrade
  if (!member) return true;
  
  // No free tier - all members should have paid tiers or scholarships
  // if (member.tier === "free") return true;
  
  // Check if subscription is active - non-active means upgrade needed
  if (member.subscriptionStatus !== "active") {
    // Special handling for cancelled subscriptions with grace period
    if (member.subscriptionStatus === "cancelled" && member.subscriptionEndDate) {
      const now = Date.now();
      // If grace period has expired, upgrade is needed
      return member.subscriptionEndDate <= now;
    }
    // All other non-active statuses require upgrade
    return true;
  }
  
  // Active subscription with paid tier doesn't need upgrade
  return false;
}

/**
 * Get human-readable subscription status message.
 * @param member - Member document (required)
 * @returns Status message for UI display
 */
export function getSubscriptionStatusMessage(member: Doc<"members">): string {
  // Handle missing subscription status
  if (!member.subscriptionStatus) {
    return "No subscription - Upgrade to access full content";
  }

  // Active subscriptions - show tier information
  if (member.subscriptionStatus === "active") {
    // Format tier name for display (convert snake_case to Title Case)
    return `Active ${member.tier?.replace(/_/g, " ")} subscription`;
  }
  
  // Cancelled subscriptions - show grace period or expiration
  if (member.subscriptionStatus === "cancelled" && member.subscriptionEndDate) {
    // Calculate days remaining in grace period
    const daysRemaining = Math.ceil((member.subscriptionEndDate - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysRemaining > 0) {
      // Show countdown for active grace period
      return `Subscription ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
    }
    // Grace period has expired
    return "Subscription expired - Renew to continue access";
  }
  
  // Past due - payment issue that needs resolution
  if (member.subscriptionStatus === "past_due") {
    return "Payment past due - Update payment method to continue access";
  }
  
  // Default message for any other expired/invalid states
  return "Subscription expired - Renew to continue access";
}

/**
 * Check if user can view post preview (always true).
 */
export function canViewPreview(): boolean {
  return true;
}

/**
 * Check if user can view full post content.
 */
export function canViewPost(
  member: Doc<"members"> | null | undefined,
  post: { isFree?: boolean } | null | undefined
): boolean {
  // If post doesn't exist, deny access
  if (!post) return false;
  
  // If post is marked as free, everyone can view it
  if (post.isFree === true) return true;
  
  // Otherwise, use standard content access rules
  return canViewFullContent(member);
}

/**
 * Check if user can view resource.
 */
export function canViewResource(
  member: Doc<"members"> | null | undefined,
  resource: { isFree?: boolean } | null | undefined
): boolean {
  // If resource doesn't exist, deny access
  if (!resource) return false;
  
  // If resource is marked as free, everyone can view it
  if (resource.isFree === true) return true;
  
  // Otherwise, use standard content access rules
  return canViewFullContent(member);
}

/** Database context for member queries */
export type MemberLookupContext = {
  db: DatabaseReader;
};

/**
 * Find member by email (includes guest members).
 */
export async function findMemberByEmail(
  ctx: MemberLookupContext,
  email: string
): Promise<Doc<"members"> | null> {
  // Look for member with this email
  // Only include active members
  const members = await ctx.db
    .query("members")
    .filter((q) => 
      q.and(
        q.eq(q.field("email"), email),
        q.eq(q.field("status"), "active")
      )
    )
    .collect();
  
  if (members.length === 0) return null;
  
  // If multiple members found, prioritize authenticated over guest
  const authenticatedMember = members.find(m => m.externalId !== undefined);
  if (authenticatedMember) return authenticatedMember;
  
  // Return the first guest member found
  return members[0];
}

/**
 * Check if member is a guest (no externalId).
 */
export function isGuestMember(member: Doc<"members"> | null | undefined): boolean {
  if (!member) return false;
  
  // Guest members have no externalId but have email and subscription data
  return !member.externalId && 
         !!member.email && 
         !!member.stripeCustomerId &&
         member.status === "active";
}