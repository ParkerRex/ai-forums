import { v } from "convex/values";
import { mutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Emergency fix for payment flow issues
 * Manually updates member subscription status and generates sign-in token
 */

export const fixMemberSubscription = mutation({
  args: {
    email: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    tier: v.optional(v.union(
      v.literal("founding_member"),
      v.literal("early_bird"), 
      v.literal("member")
    )),
  },
  handler: async (ctx, args) => {
    // Find the member
    const member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!member) {
      throw new Error(`Member with email ${args.email} not found`);
    }

    console.log(`[FIX] Updating member ${member._id} subscription status`);

    // Update member with subscription info
    const updateData: any = {
      stripeCustomerId: args.stripeCustomerId,
      subscriptionStatus: "active" as const,
      lastPaymentDate: Date.now(),
      updatedAt: Date.now(),
    };

    if (args.stripeSubscriptionId) {
      updateData.stripeSubscriptionId = args.stripeSubscriptionId;
    }

    if (args.tier) {
      updateData.tier = args.tier;
    }

    await ctx.db.patch(member._id, updateData);

    // If they already have a Clerk account, generate a sign-in token
    if (member.externalId) {
      console.log(`[FIX] Member has Clerk account ${member.externalId}, generating sign-in token`);
      
      // Schedule sign-in token generation
      await ctx.scheduler.runAfter(0, internal.admin.fixPaymentFlow.generateSignInToken, {
        memberId: member._id,
        clerkUserId: member.externalId,
      });
    } else {
      console.log(`[FIX] Member has no Clerk account, creating one`);
      
      // Schedule Clerk account creation
      await ctx.scheduler.runAfter(0, internal.auth.clerkAccounts.createClerkAccount, {
        email: member.email,
        memberId: member._id,
        checkoutSessionId: "manual-fix",
        firstName: member.firstName,
        lastName: member.lastName,
      });
    }

    return {
      success: true,
      memberId: member._id,
      updatedFields: updateData,
      hasClerkAccount: !!member.externalId,
    };
  },
});

/**
 * Generate a sign-in token for an existing Clerk user
 */
export const generateSignInToken = internalAction({
  args: {
    memberId: v.id("members"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not configured");
    }

    try {
      console.log(`[FIX] Generating sign-in token for Clerk user ${args.clerkUserId}`);

      // Create a sign-in token for auto-login
      const signInTokenResponse = await fetch(
        "https://api.clerk.com/v1/sign_in_tokens",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: args.clerkUserId,
            expires_in_seconds: 300, // 5 minutes
          }),
        }
      );

      if (!signInTokenResponse.ok) {
        const error = await signInTokenResponse.text();
        console.error("Failed to create sign-in token:", error);
        throw new Error(`Failed to create sign-in token: ${error}`);
      }

      const tokenData = await signInTokenResponse.json();
      const signInToken = tokenData.token;

      console.log(`[FIX] Generated sign-in token for member ${args.memberId}`);

      // Update member with sign-in token
      await ctx.runMutation(internal.admin.fixPaymentFlow.updateMemberSignInToken, {
        memberId: args.memberId,
        signInToken,
      });

      return { success: true, signInToken };
    } catch (error) {
      console.error("Error generating sign-in token:", error);
      throw error;
    }
  },
});

/**
 * Update member with sign-in token
 */
export const updateMemberSignInToken = mutation({
  args: {
    memberId: v.id("members"),
    signInToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId, {
      signInToken: args.signInToken,
      updatedAt: Date.now(),
    });

    console.log(`[FIX] Updated member ${args.memberId} with sign-in token`);
    return { success: true };
  },
});

/**
 * Check member status after fix
 */
export const checkMemberStatus = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!member) {
      return { error: "Member not found" };
    }

    return {
      memberId: member._id,
      email: member.email,
      subscriptionStatus: member.subscriptionStatus,
      stripeCustomerId: member.stripeCustomerId,
      stripeSubscriptionId: member.stripeSubscriptionId,
      tier: member.tier,
      hasClerkAccount: !!member.externalId,
      clerkUserId: member.externalId,
      hasSignInToken: !!member.signInToken,
      signInTokenLength: member.signInToken?.length,
      lastUpdated: member.updatedAt,
    };
  },
});
