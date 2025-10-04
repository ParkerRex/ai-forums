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

import { ensureUniqueSlug, generateSlug } from "../lib/slug-utils";
import { internalMutation, type MutationCtx, type QueryCtx, query } from "./_generated/server";

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
  const isMutationContext = "patch" in ctx.db;

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
        q.eq(q.field("status"), "active"),
      ),
    )
    .first();

  if (guestMember) {
    // Link guest account to authenticated user
    console.log(`Linking guest member ${guestMember._id} to authenticated user ${externalId}`);

    // Get names from identity
    const firstName =
      (identity.given_name as string) ||
      identity.name?.split(" ")[0] ||
      guestMember.firstName ||
      "User";
    const lastName =
      (identity.family_name as string) ||
      identity.name?.split(" ").slice(1).join(" ") ||
      guestMember.lastName ||
      "";

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
  const lastName =
    (identity.family_name as string) || identity.name?.split(" ").slice(1).join(" ") || "";

  // Generate unique slug from name or email
  const fullName = `${firstName} ${lastName}`.trim();
  const baseSlug =
    fullName && fullName !== "User" ? generateSlug(fullName) : generateSlug(email.split("@")[0]);
  const existingMembers = await ctx.db.query("members").withIndex("by_slug").collect();
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
    status: "active" as const,
    joinedDate: now,
    slug,
    updatedAt: now,
    lastOnline: now,
    // Payment fields - new members start without a tier
    tier: undefined,
    subscriptionStatus: "none" as const,
    stripeCustomerId: `cus_temp_${email.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`, // TODO: Replace with Stripe API call
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

// ===================================================================
// Custom Authentication System (Replacing Clerk)
// ===================================================================

import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { hashPassword, validatePasswordComplexity } from "./lib/password";
import { generateSecureToken, hashToken } from "./lib/tokens";
import { checkRateLimit } from "./lib/rateLimit";

/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign up mutation - Create new user account with custom auth
 *
 * Creates a new member with email/password authentication.
 * Sends verification email and returns member ID + verification token.
 */
export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.object({
    memberId: v.id("members"),
    verificationToken: v.string(),
  }),
  handler: async (ctx, { email, password, firstName, lastName }) => {
    const now = Date.now();

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      throw new ConvexError("Invalid email format");
    }

    // Check email uniqueness
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first();

    if (existingMember) {
      throw new ConvexError("An account with this email already exists");
    }

    // Validate password complexity
    const validation = validatePasswordComplexity(password);
    if (!validation.valid) {
      throw new ConvexError({
        message: "Password does not meet complexity requirements",
        errors: validation.errors,
      });
    }

    // Hash password
    const passwordHashValue = await hashPassword(password);

    // Generate unique slug
    const fullName = `${firstName} ${lastName}`.trim();
    const baseSlug =
      fullName && fullName !== "User"
        ? generateSlug(fullName)
        : generateSlug(email.split("@")[0]);
    const existingMembers = await ctx.db.query("members").withIndex("by_slug").collect();
    const existingSlugs = existingMembers
      .map((m) => m.slug)
      .filter((slug): slug is string => slug !== undefined);
    const slug = ensureUniqueSlug(baseSlug, existingSlugs);

    // Create member record
    const memberId = await ctx.db.insert("members", {
      email: email.toLowerCase(),
      passwordHash: passwordHashValue,
      firstName,
      lastName,
      slug,
      status: "active",
      emailVerified: false,
      failedLoginAttempts: 0,
      joinedDate: now,
      updatedAt: now,
      lastOnline: now,
      authMethod: "password",
    });

    // Generate verification token
    const verificationToken = generateSecureToken();
    const tokenHash = await hashToken(verificationToken);

    // Store verification record (expires in 24 hours)
    await ctx.db.insert("email_verifications", {
      memberId,
      tokenHash,
      email: email.toLowerCase(),
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
      createdAt: now,
    });

    // TODO: Schedule email send action
    // await ctx.scheduler.runAfter(0, internal.emails.sendVerificationEmail, {
    //   email: email.toLowerCase(),
    //   token: verificationToken,
    //   firstName,
    // });

    return {
      memberId,
      verificationToken,
    };
  },
});

/**
 * Sign in mutation - Authenticate user with email/password
 *
 * Validates credentials, enforces rate limits and account locks,
 * and creates a new session with JWT token.
 */
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  returns: v.object({
    memberId: v.id("members"),
    sessionToken: v.string(),
    emailVerified: v.boolean(),
  }),
  handler: async (ctx, { email, password }) => {
    const now = Date.now();
    const normalizedEmail = email.toLowerCase();

    // Check rate limit: 5 attempts per 15 minutes
    const rateLimit = await checkRateLimit(
      ctx,
      `signin:${normalizedEmail}`,
      5,
      15 * 60 * 1000, // 15 minutes
    );

    if (!rateLimit.allowed) {
      const minutesRemaining = Math.ceil((rateLimit.resetAt - now) / 60000);
      throw new ConvexError(
        `Too many sign-in attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
      );
    }

    // Query member by email
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!member) {
      throw new ConvexError("Invalid email or password");
    }

    // Check if account is locked
    if (member.lockedUntil && member.lockedUntil > now) {
      const minutesRemaining = Math.ceil((member.lockedUntil - now) / 60000);
      throw new ConvexError(
        `Account is locked due to too many failed attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
      );
    }

    // Verify password
    if (!member.passwordHash) {
      throw new ConvexError("This account uses a different sign-in method");
    }

    const { verifyPassword } = await import("./lib/password");
    const isValid = await verifyPassword(password, member.passwordHash);

    if (!isValid) {
      // Increment failed login attempts
      const failedAttempts = (member.failedLoginAttempts || 0) + 1;
      const updates: any = {
        failedLoginAttempts: failedAttempts,
        updatedAt: now,
      };

      // Lock account after 10 failed attempts
      if (failedAttempts >= 10) {
        updates.lockedUntil = now + 60 * 60 * 1000; // 1 hour
        await ctx.db.patch(member._id, updates);
        throw new ConvexError(
          "Account locked due to too many failed attempts. Please try again in 1 hour.",
        );
      }

      await ctx.db.patch(member._id, updates);
      throw new ConvexError("Invalid email or password");
    }

    // Check email verification
    if (!member.emailVerified) {
      throw new ConvexError("Please verify your email address before signing in");
    }

    // Generate JWT
    const { generateJWT } = await import("./lib/jwt");
    const jwt = await generateJWT({
      memberId: member._id,
      email: member.email,
    });

    // Hash JWT and create session
    const sessionTokenHash = await hashToken(jwt);
    await ctx.db.insert("sessions", {
      memberId: member._id,
      tokenHash: sessionTokenHash,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: now,
      lastActiveAt: now,
    });

    // Reset failed login attempts and update lastLoginAt
    await ctx.db.patch(member._id, {
      failedLoginAttempts: 0,
      lastLoginAt: now,
      lastOnline: now,
      updatedAt: now,
      lockedUntil: undefined,
    });

    return {
      memberId: member._id,
      sessionToken: jwt,
      emailVerified: member.emailVerified ?? false,
    };
  },
});

/**
 * Verify email mutation - Verify user's email address with token
 *
 * Validates the verification token, marks email as verified,
 * and automatically signs the user in with a new session.
 */
export const verifyEmail = mutation({
  args: {
    token: v.string(),
  },
  returns: v.object({
    memberId: v.id("members"),
    sessionToken: v.string(),
  }),
  handler: async (ctx, { token }) => {
    const now = Date.now();

    // Hash token to match against DB
    const tokenHash = await hashToken(token);

    // Query verification record by token hash
    const verification = await ctx.db
      .query("email_verifications")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!verification) {
      throw new ConvexError("Invalid verification token");
    }

    // Check if token is expired
    if (verification.expiresAt < now) {
      throw new ConvexError("Verification token has expired");
    }

    // Get member
    const member = await ctx.db.get(verification.memberId);
    if (!member) {
      throw new ConvexError("Member not found");
    }

    // Update member email verification status
    await ctx.db.patch(member._id, {
      emailVerified: true,
      updatedAt: now,
    });

    // Generate JWT for auto sign-in
    const { generateJWT } = await import("./lib/jwt");
    const jwt = await generateJWT({
      memberId: member._id,
      email: member.email,
    });

    // Hash JWT and create session
    const sessionTokenHash = await hashToken(jwt);
    await ctx.db.insert("sessions", {
      memberId: member._id,
      tokenHash: sessionTokenHash,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: now,
      lastActiveAt: now,
    });

    // Update verification record with verifiedAt (audit trail)
    await ctx.db.patch(verification._id, {
      verifiedAt: now,
    });

    return {
      memberId: member._id,
      sessionToken: jwt,
    };
  },
});

/**
 * Request password reset mutation - Send password reset email
 *
 * Generates a secure reset token and sends reset email.
 * Always returns success to prevent email enumeration attacks.
 */
export const requestPasswordReset = mutation({
  args: {
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { email }) => {
    const now = Date.now();
    const normalizedEmail = email.toLowerCase();

    // Rate limit: 3 attempts per hour
    const rateLimit = await checkRateLimit(
      ctx,
      `reset:${normalizedEmail}`,
      3,
      60 * 60 * 1000, // 1 hour
    );

    if (!rateLimit.allowed) {
      const minutesRemaining = Math.ceil((rateLimit.resetAt - now) / 60000);
      throw new ConvexError(
        `Too many reset requests. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
      );
    }

    // Query member by email
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    // Always return success to prevent email enumeration
    if (!member) {
      return null;
    }

    // Generate secure reset token
    const resetToken = generateSecureToken();
    const tokenHash = await hashToken(resetToken);

    // Store reset record (expires in 1 hour)
    await ctx.db.insert("password_resets", {
      memberId: member._id,
      tokenHash,
      email: normalizedEmail,
      expiresAt: now + 60 * 60 * 1000, // 1 hour
      createdAt: now,
    });

    // TODO: Schedule email send action
    // await ctx.scheduler.runAfter(0, internal.emails.sendPasswordResetEmail, {
    //   email: normalizedEmail,
    //   token: resetToken,
    //   firstName: member.firstName,
    // });

    return null;
  },
});

/**
 * Reset password mutation - Reset user's password with token
 *
 * Validates reset token, checks password complexity and history,
 * updates password, invalidates all sessions, and signs user in.
 */
export const resetPassword = mutation({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  returns: v.object({
    memberId: v.id("members"),
    sessionToken: v.string(),
  }),
  handler: async (ctx, { token, newPassword }) => {
    const now = Date.now();

    // Hash token to match against DB
    const tokenHash = await hashToken(token);

    // Query reset record by token hash
    const resetRecord = await ctx.db
      .query("password_resets")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!resetRecord) {
      throw new ConvexError("Invalid reset token");
    }

    // Check if token is expired
    if (resetRecord.expiresAt < now) {
      throw new ConvexError("Reset token has expired");
    }

    // Check if token was already used
    if (resetRecord.usedAt) {
      throw new ConvexError("Reset token has already been used");
    }

    // Get member
    const member = await ctx.db.get(resetRecord.memberId);
    if (!member) {
      throw new ConvexError("Member not found");
    }

    // Validate password complexity
    const validation = validatePasswordComplexity(newPassword);
    if (!validation.valid) {
      throw new ConvexError({
        message: "Password does not meet complexity requirements",
        errors: validation.errors,
      });
    }

    // Query last 3 passwords from password_history
    const passwordHistory = await ctx.db
      .query("password_history")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .order("desc")
      .take(3);

    // Check if new password matches any recent passwords
    const { verifyPassword } = await import("./lib/password");
    for (const historyEntry of passwordHistory) {
      const isReused = await verifyPassword(newPassword, historyEntry.passwordHash);
      if (isReused) {
        throw new ConvexError("Cannot reuse any of your last 3 passwords");
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Store old password in history (if exists)
    if (member.passwordHash) {
      await ctx.db.insert("password_history", {
        memberId: member._id,
        passwordHash: member.passwordHash,
        createdAt: now,
      });
    }

    // Update member password
    await ctx.db.patch(member._id, {
      passwordHash: newPasswordHash,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      updatedAt: now,
    });

    // Delete all existing sessions (force re-login on all devices)
    const existingSessions = await ctx.db
      .query("sessions")
      .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
      .collect();

    for (const session of existingSessions) {
      await ctx.db.delete(session._id);
    }

    // Mark reset record as used
    await ctx.db.patch(resetRecord._id, {
      usedAt: now,
    });

    // Generate JWT for new session
    const { generateJWT } = await import("./lib/jwt");
    const jwt = await generateJWT({
      memberId: member._id,
      email: member.email,
    });

    // Hash JWT and create new session
    const sessionTokenHash = await hashToken(jwt);
    await ctx.db.insert("sessions", {
      memberId: member._id,
      tokenHash: sessionTokenHash,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: now,
      lastActiveAt: now,
    });

    return {
      memberId: member._id,
      sessionToken: jwt,
    };
  },
});

/**
 * Sign out mutation - Invalidate user session
 *
 * Deletes the session from the database. Idempotent operation.
 */
export const signOut = mutation({
  args: {
    sessionToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { sessionToken }) => {
    // Hash token to match against DB
    const tokenHash = await hashToken(sessionToken);

    // Query session by token hash
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();

    // If session exists, delete it
    if (session) {
      await ctx.db.delete(session._id);
    }

    // Idempotent: no error if session not found
    return null;
  },
});

/**
 * Get current user query - For custom auth system
 *
 * Validates JWT from request headers and returns user data.
 * Returns null if no valid JWT found (non-throwing).
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("members"),
      email: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      emailVerified: v.boolean(),
      avatarUrl: v.optional(v.string()),
      role: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    // TODO: Get JWT from request headers/context
    // For now, this will be implemented when middleware is ready
    // This is a placeholder implementation

    // In the future, middleware will add user info to headers
    // For now, return null
    return null;

    // Future implementation:
    // const jwt = ctx.auth.getJWT(); // from middleware
    // if (!jwt) return null;
    //
    // try {
    //   const { verifyJWT } = await import("./lib/jwt");
    //   const payload = await verifyJWT(jwt);
    //   const member = await ctx.db.get(payload.memberId);
    //   if (!member) return null;
    //
    //   return {
    //     _id: member._id,
    //     email: member.email,
    //     firstName: member.firstName,
    //     lastName: member.lastName,
    //     emailVerified: member.emailVerified ?? false,
    //     avatarUrl: member.avatarUrl,
    //     role: member.role,
    //   };
    // } catch {
    //   return null;
    // }
  },
});

/**
 * Resend verification email mutation
 *
 * Generates a new verification token and sends a new verification email.
 * Rate limited to prevent abuse.
 */
export const resendVerification = mutation({
  args: {
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { email }) => {
    const now = Date.now();
    const normalizedEmail = email.toLowerCase();

    // Rate limit: 3 attempts per hour
    const rateLimit = await checkRateLimit(
      ctx,
      `verify:${normalizedEmail}`,
      3,
      60 * 60 * 1000, // 1 hour
    );

    if (!rateLimit.allowed) {
      const minutesRemaining = Math.ceil((rateLimit.resetAt - now) / 60000);
      throw new ConvexError(
        `Too many verification requests. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
      );
    }

    // Query member by email
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!member) {
      throw new ConvexError("No account found with this email address");
    }

    // Check if already verified
    if (member.emailVerified) {
      throw new ConvexError("Email address is already verified");
    }

    // Generate new verification token
    const verificationToken = generateSecureToken();
    const tokenHash = await hashToken(verificationToken);

    // Store new verification record (old ones remain for audit)
    await ctx.db.insert("email_verifications", {
      memberId: member._id,
      tokenHash,
      email: normalizedEmail,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
      createdAt: now,
    });

    // TODO: Schedule email send action
    // await ctx.scheduler.runAfter(0, internal.emails.sendVerificationEmail, {
    //   email: normalizedEmail,
    //   token: verificationToken,
    //   firstName: member.firstName,
    // });

    return null;
  },
});

/**
 * Create migration token for Clerk → Custom Auth migration
 *
 * This mutation is called by the migration script to create a migration token
 * for existing Clerk users. The token allows them to set their password.
 */
export const createMigrationToken = mutation({
  args: {
    memberId: v.id("members"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.object({
    token: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, { memberId, email, firstName, lastName }) => {
    const now = Date.now();
    const normalizedEmail = email.toLowerCase();

    // Check if member exists
    const member = await ctx.db.get(memberId);
    if (!member) {
      throw new ConvexError("Member not found");
    }

    // Check if member already has a password (already migrated)
    if (member.passwordHash) {
      throw new ConvexError("Member already has a password set");
    }

    // Check if there's already a valid migration token
    const existingToken = await ctx.db
      .query("password_resets")
      .withIndex("by_memberId", (q) => q.eq("memberId", memberId))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .filter((q) => q.eq(q.field("usedAt"), undefined))
      .first();

    if (existingToken) {
      // Return existing token info (but not the actual token - it's hashed)
      return {
        token: "existing", // Placeholder - actual token was already sent
        expiresAt: existingToken.expiresAt,
      };
    }

    // Generate migration token (7-day expiry)
    const migrationToken = generateSecureToken();
    const tokenHash = await hashToken(migrationToken);

    // Store migration token in password_resets table
    await ctx.db.insert("password_resets", {
      memberId,
      tokenHash,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: now,
    });

    // Schedule migration email
    await ctx.scheduler.runAfter(0, internal.emails.sendMigrationEmail, {
      email: normalizedEmail,
      token: migrationToken,
      firstName,
    });

    return {
      token: migrationToken,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    };
  },
});

// ===================================================================
// Internal Cleanup Functions (Called by Cron Jobs)
// ===================================================================

/**
 * Clean up expired sessions
 *
 * Deletes all sessions where expiresAt < current time.
 * Called hourly by cron job.
 */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Query expired sessions
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // Delete each expired session
    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    console.log(`[Cleanup] Deleted ${expiredSessions.length} expired sessions`);
    return null;
  },
});

/**
 * Clean up expired tokens
 *
 * Deletes expired email_verifications and password_resets.
 * Called daily by cron job.
 */
export const cleanupExpiredTokens = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Clean up expired email verifications
    const expiredVerifications = await ctx.db
      .query("email_verifications")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const verification of expiredVerifications) {
      await ctx.db.delete(verification._id);
    }

    // Clean up expired password resets
    const expiredResets = await ctx.db
      .query("password_resets")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const reset of expiredResets) {
      await ctx.db.delete(reset._id);
    }

    console.log(
      `[Cleanup] Deleted ${expiredVerifications.length} expired verifications, ${expiredResets.length} expired resets`,
    );
    return null;
  },
});

/**
 * Clean up old password history
 *
 * Keeps only the last 3 passwords per member, deletes older ones.
 * Called daily by cron job.
 */
export const cleanupPasswordHistory = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Get all members
    const members = await ctx.db.query("members").collect();

    let totalDeleted = 0;

    for (const member of members) {
      // Get all password history entries for this member, ordered by creation time
      const history = await ctx.db
        .query("password_history")
        .withIndex("by_member", (q) => q.eq("memberId", member._id))
        .order("desc")
        .collect();

      // Keep first 3, delete the rest
      if (history.length > 3) {
        const toDelete = history.slice(3);
        for (const entry of toDelete) {
          await ctx.db.delete(entry._id);
          totalDeleted++;
        }
      }
    }

    console.log(`[Cleanup] Deleted ${totalDeleted} old password history entries`);
    return null;
  },
});
