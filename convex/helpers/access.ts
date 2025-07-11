/**
 * @fileoverview Access Control Module - Subscription and content access management
 * 
 * This module provides the core access control logic for determining member permissions
 * based on their subscription status and tier. It handles various subscription states
 * including active, cancelled (with grace period), past due, and expired subscriptions.
 * 
 * Key features:
 * - Content access validation based on subscription status and tier
 * - Grace period handling for cancelled subscriptions
 * - Upgrade requirement detection
 * - Human-readable subscription status messages
 * - Support for multiple subscription tiers (free, scholarship, founding_member, early_bird, member)
 * 
 * Business Rules:
 * - Free tier members have limited access and always need to upgrade
 * - Paid tiers (founding_member, early_bird, member) have full content access
 * - Scholarship tier has full access without payment requirement
 * - Cancelled subscriptions maintain access until the end date (grace period)
 * - Past due subscriptions lose access immediately
 * 
 * The module is designed to provide consistent access control across the application
 * while being flexible enough to handle edge cases and future tier additions.
 * 
 * @module helpers/access
 * @author VAI Development Team
 * @version 1.0.0
 */

import { Doc } from "../_generated/dataModel";
import { DatabaseReader } from "../_generated/server";

/**
 * Determines if a member has full access to view content based on their subscription
 * status and tier. This is the primary function for content gating throughout the app.
 * 
 * Access is granted when:
 * 1. Member has an active subscription with a paid tier
 * 2. Member has a cancelled subscription but is still within the grace period
 * 3. Member has a scholarship tier (regardless of payment status)
 * 4. Guest member (no externalId) with active subscription and paid tier
 * 
 * @param member - The member document from the database, can be null/undefined for unauthenticated users
 * @returns {boolean} True if the member can view full content, false otherwise
 * 
 * @example
 * // Check if current user can view premium content
 * const member = await ctx.db.get(memberId);
 * if (canViewFullContent(member)) {
 *   return fullArticleContent;
 * } else {
 *   return truncatedPreview;
 * }
 */
export function canViewFullContent(member: Doc<"members"> | null | undefined): boolean {
  // Early return for unauthenticated users
  if (!member) return false;
  
  // Block members who haven't completed onboarding
  if (member.status === "pending_onboarding") return false;
  
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
  // Note: scholarship tier is included here for full access without payment
  const fullAccessTiers = ["scholarship", "founding_member", "early_bird", "member"];
  // Ensure tier exists and is in the allowed list
  // Guest members (no externalId) with valid subscriptions also get full access
  return member.tier ? fullAccessTiers.includes(member.tier) : false;
}

/**
 * Determines if a member needs to upgrade their subscription to access full content.
 * This function is used to display upgrade prompts and CTAs throughout the application.
 * 
 * A member needs to upgrade when:
 * 1. They are not authenticated (no member record)
 * 2. They have a free tier subscription
 * 3. Their subscription is expired (past the grace period)
 * 4. Their subscription has any non-active status (except cancelled within grace period)
 * 
 * @param member - The member document from the database, can be null/undefined for unauthenticated users
 * @returns {boolean} True if the member needs to upgrade, false if they have valid access
 * 
 * @example
 * // Show upgrade CTA based on member status
 * const member = await ctx.db.get(memberId);
 * if (needsSubscriptionUpgrade(member)) {
 *   return <UpgradePrompt />;
 * }
 * 
 * @see canViewFullContent - Inverse logic for content access
 */
export function needsSubscriptionUpgrade(member: Doc<"members"> | null | undefined): boolean {
  // Unauthenticated users always need to sign up/upgrade
  if (!member) return true;
  
  // Free tier always needs upgrade to access premium content
  if (member.tier === "free") return true;
  
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
 * Generates a human-readable subscription status message for display in the UI.
 * This function provides contextual messages based on the member's current
 * subscription state, helping users understand their access level and any
 * required actions.
 * 
 * Message types:
 * - Free tier: Upgrade prompt
 * - Active subscription: Confirmation with tier name
 * - Scholarship: Special recognition of scholarship status
 * - Cancelled (grace period): Days remaining countdown
 * - Cancelled (expired): Renewal prompt
 * - Past due: Payment update required
 * - Other expired states: Generic renewal prompt
 * 
 * @param member - The member document from the database (required, not null)
 * @returns {string} A user-friendly status message describing their subscription state
 * 
 * @example
 * // Display subscription status in user profile
 * const member = await ctx.db.get(memberId);
 * const statusMessage = getSubscriptionStatusMessage(member);
 * // Renders: "Active founding member subscription"
 * 
 * @example
 * // Show grace period countdown
 * const cancelledMember = { 
 *   subscriptionStatus: "cancelled", 
 *   subscriptionEndDate: Date.now() + (3 * 24 * 60 * 60 * 1000) 
 * };
 * const message = getSubscriptionStatusMessage(cancelledMember);
 * // Renders: "Subscription ends in 3 days"
 */
export function getSubscriptionStatusMessage(member: Doc<"members">): string {
  // Handle free tier or missing subscription status
  if (!member.subscriptionStatus || member.tier === "free") {
    return "Free tier - Upgrade to access full content";
  }
  
  // Active subscriptions - show tier information
  if (member.subscriptionStatus === "active") {
    // Special message for scholarship recipients
    if (member.tier === "scholarship") {
      return "Scholarship member - Full access";
    }
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
 * Determines if a user can view the preview of a post.
 * Previews are always accessible to all users (authenticated or not).
 * This allows free users to see a teaser of the content before upgrading.
 * 
 * @param member - The member document (can be null for unauthenticated users)
 * @returns {boolean} Always returns true as previews are public
 */
export function canViewPreview(member: Doc<"members"> | null | undefined): boolean {
  // Previews are always available to encourage engagement
  return true;
}

/**
 * Determines if a user can view the full content of a specific post.
 * Takes into account both the user's subscription status and whether the post is free.
 * 
 * @param member - The member document (can be null for unauthenticated users)
 * @param post - The post document to check access for
 * @returns {boolean} True if the user can view the full post content
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
 * Determines if a user can view a resource based on their subscription and the resource's free status.
 * 
 * @param member - The member document (can be null for unauthenticated users)
 * @param resource - The resource document to check access for
 * @returns {boolean} True if the user can view the resource
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

/**
 * Helper type for member lookup context - used when we need to find guest members
 * This type represents the minimal database context needed for member queries
 */
export type MemberLookupContext = {
  db: DatabaseReader;
};

/**
 * Finds a member by email address, including guest members without externalId.
 * This is used for guest checkout scenarios where users purchase without authentication.
 * 
 * @param ctx - Database context for queries
 * @param email - Email address to search for
 * @returns {Promise<Doc<"members"> | null>} The member if found, null otherwise
 * 
 * @example
 * // Find guest member who purchased without signing up
 * const guestMember = await findMemberByEmail(ctx, "user@example.com");
 * if (guestMember && !guestMember.externalId) {
 *   // This is a guest member
 * }
 */
export async function findMemberByEmail(
  ctx: MemberLookupContext,
  email: string
): Promise<Doc<"members"> | null> {
  // Look for member with this email
  // Include both active and pending_onboarding members
  const members = await ctx.db
    .query("members")
    .filter((q) => 
      q.and(
        q.eq(q.field("email"), email),
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "pending_onboarding")
        )
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
 * Determines if a member is a guest (purchased without authentication).
 * Guest members have email and subscription but no externalId from Clerk.
 * 
 * @param member - The member document to check
 * @returns {boolean} True if the member is a guest, false otherwise
 */
export function isGuestMember(member: Doc<"members"> | null | undefined): boolean {
  if (!member) return false;
  
  // Guest members have no externalId but have email and subscription data
  return !member.externalId && 
         !!member.email && 
         !!member.stripeCustomerId &&
         (member.status === "active" || member.status === "pending_onboarding");
}