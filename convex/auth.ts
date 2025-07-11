/**
 * @fileoverview Authentication Module - Unified user authentication and member management
 * 
 * This module provides the core authentication system that bridges Clerk authentication
 * with the internal member management system. It handles both legacy email-based
 * authentication and modern Clerk-based authentication with automatic migration.
 * 
 * Key features:
 * - Unified authentication flow supporting multiple auth providers
 * - Automatic member creation and profile updates
 * - Legacy auth system migration (email-based to Clerk)
 * - Real-time presence tracking (lastOnline updates)
 * - Context-aware behavior (query vs mutation operations)
 * - Unique slug generation for member profiles
 * - Error handling and authentication validation
 * 
 * The system is designed to be flexible and maintainable while providing
 * a consistent authentication experience across the entire application.
 * 
 * @author VAI Development Team
 * @version 1.0.0
 */

import { query, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { generateSlug, ensureUniqueSlug } from "../lib/slug-utils";

/**
 * Helper function to get the authenticated member from the current context.
 * This handles the unified auth flow:
 * 1. Gets the user identity from Clerk
 * 2. Looks up member by externalId (preferred) or email (legacy)
 * 3. In mutation context: Creates new member if not found and updates lastOnline
 * 4. In query context: Only performs lookups, no mutations
 * 
 * @param ctx - The Convex context with auth and database access
 * @returns The authenticated member document
 * @throws Error if no identity is found or member not found in query context
 */
export async function getAuthenticatedMember(ctx: QueryCtx | MutationCtx) {
  // Get the user identity from Clerk
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const now = Date.now();
  const externalId = identity.subject; // Clerk user ID
  const email = identity.email;

  if (!email) {
    throw new Error("User email not found in identity");
  }

  // Check if we're in a mutation context (has patch/insert methods)
  const isMutationContext = 'patch' in ctx.db;

  // First try to find by externalId (preferred for new auth system)
  let member = await ctx.db
    .query("members")
    .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
    .first();

  if (member) {
    // Found by externalId
    if (isMutationContext) {
      // Update lastOnline and return updated member in mutation context
      const mutationCtx = ctx as MutationCtx;
      const updates: any = {
        lastOnline: now,
        updatedAt: now,
      };
      
      // Update avatarUrl if available from Clerk
      if (identity.pictureUrl && member.avatarUrl !== identity.pictureUrl) {
        updates.avatarUrl = identity.pictureUrl;
      }
      
      await mutationCtx.db.patch(member._id, updates);
      const updatedMember = await ctx.db.get(member._id);
      return updatedMember!;
    } else {
      // In query context, just return the member as-is
      return member;
    }
  }

  // Fallback: try to find by email (legacy lookup)
  member = await ctx.db
    .query("members")
    .filter((q) => q.eq(q.field("email"), email))
    .first();

  if (member) {
    if (isMutationContext) {
      // Found legacy member - patch with externalId and update timestamps
      const mutationCtx = ctx as MutationCtx;
      const updates: any = {
        externalId,
        lastOnline: now,
        updatedAt: now,
      };
      
      // Update avatarUrl if available from Clerk
      if (identity.pictureUrl && member.avatarUrl !== identity.pictureUrl) {
        updates.avatarUrl = identity.pictureUrl;
      }
      
      await mutationCtx.db.patch(member._id, updates);
      const updatedMember = await ctx.db.get(member._id);
      return updatedMember!;
    } else {
      // In query context, just return the member as-is
      return member;
    }
  }

  // Member not found
  if (!isMutationContext) {
    // In query context, we can't create members, so throw error
    throw new Error("Member not found - please sign in again to create your profile");
  }

  // Before creating new member, check if there's a guest member with same email
  const mutationCtx = ctx as MutationCtx;
  const guestMember = await ctx.db
    .query("members")
    .filter((q) => 
      q.and(
        q.eq(q.field("email"), email),
        q.eq(q.field("externalId"), undefined),
        q.eq(q.field("status"), "active")
      )
    )
    .first();

  if (guestMember) {
    // Link guest account to authenticated user
    console.log(`Linking guest member ${guestMember._id} to authenticated user ${externalId}`);
    
    // Get names from identity
    const firstName = (identity.given_name as string) || identity.name?.split(" ")[0] || guestMember.firstName || "User";
    const lastName = (identity.family_name as string) || identity.name?.split(" ").slice(1).join(" ") || guestMember.lastName || "";
    
    // Update guest member with authentication info
    const guestUpdates: any = {
      externalId,
      firstName,
      lastName,
      lastOnline: now,
      updatedAt: now,
      // Keep existing subscription data
    };
    
    // Update avatarUrl if available from Clerk
    if (identity.pictureUrl) {
      guestUpdates.avatarUrl = identity.pictureUrl;
    }
    
    await mutationCtx.db.patch(guestMember._id, guestUpdates);
    
    const updatedMember = await ctx.db.get(guestMember._id);
    return updatedMember!;
  }

  // Create new member (only in mutation context)
  const firstName = (identity.given_name as string) || identity.name?.split(" ")[0] || "User";
  const lastName = (identity.family_name as string) || identity.name?.split(" ").slice(1).join(" ") || "";

  // Generate unique slug from name or email
  const fullName = `${firstName} ${lastName}`.trim();
  const baseSlug = fullName && fullName !== "User" ? generateSlug(fullName) : generateSlug(email.split("@")[0]);
  const existingMembers = await ctx.db
    .query("members")
    .withIndex("by_slug")
    .collect();
  const existingSlugs = existingMembers
    .map((m) => m.slug)
    .filter((slug): slug is string => slug !== undefined);
  const slug = ensureUniqueSlug(baseSlug, existingSlugs);

  // Create new member
  const newMemberData: any = {
    firstName,
    lastName,
    email,
    externalId,
    status: "free" as const,
    joinedDate: now,
    slug,
    updatedAt: now,
    lastOnline: now,
    // Payment fields - new members start as free tier
    tier: "free" as const,
    subscriptionStatus: "none" as const,
    stripeCustomerId: `cus_temp_${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`, // TODO: Replace with Stripe API call
  };
  
  // Add avatarUrl if available from Clerk
  if (identity.pictureUrl) {
    newMemberData.avatarUrl = identity.pictureUrl;
  }
  
  const memberId = await mutationCtx.db.insert("members", newMemberData);

  // Return the newly created member
  const newMember = await ctx.db.get(memberId);
  if (!newMember) {
    throw new Error("Failed to create member");
  }

  return newMember;
}

/**
 * Internal mutation to ensure a member exists for the current user.
 * This can be called from the client to lazily create/update member records.
 */
export const ensureMember = internalMutation({
  args: {},
  handler: async (ctx) => {
    const member = await getAuthenticatedMember(ctx);
    return member._id;
  },
});

/**
 * Query to get the current authenticated member.
 * This is useful for React components that need member data.
 * Note: This only performs lookups and doesn't update lastOnline.
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthenticatedMemberOrNull(ctx);
  },
});

/**
 * Helper function to get the authenticated member or null from the current context.
 * Unlike getAuthenticatedMember, this function returns null instead of throwing
 * when no identity is found. Useful for optional authentication scenarios.
 * 
 * @param ctx - The Convex context with auth and database access
 * @returns The authenticated member document or null if not authenticated
 */
export async function getAuthenticatedMemberOrNull(ctx: QueryCtx | MutationCtx) {
  try {
    return await getAuthenticatedMember(ctx);
  } catch {
    return null;
  }
} 