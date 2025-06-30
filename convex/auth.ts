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
      await mutationCtx.db.patch(member._id, {
        lastOnline: now,
        updatedAt: now,
      });
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
      await mutationCtx.db.patch(member._id, {
        externalId,
        lastOnline: now,
        updatedAt: now,
      });
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
  const mutationCtx = ctx as MutationCtx;
  const memberId = await mutationCtx.db.insert("members", {
    firstName,
    lastName,
    email,
    externalId,
    status: "free" as const,
    joinedDate: now,
    slug,
    updatedAt: now,
    lastOnline: now,
  });

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
    return await getAuthenticatedMember(ctx);
  },
}); 