import { v } from "convex/values";
import { internalAction, internalMutation, mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Internal action to create a Clerk account for a guest member after Stripe checkout.
 * This uses Clerk's Backend API to create a user without requiring password/social auth.
 * The user will be prompted to set up authentication on their first login.
 */
export const createClerkAccount = internalAction({
  args: {
    email: v.string(),
    memberId: v.id("members"),
    checkoutSessionId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not configured");
    }

    try {
      // Create user in Clerk via Backend API
      const response = await fetch("https://api.clerk.com/v1/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_addresses: [args.email],
          first_name: args.firstName || "",
          last_name: args.lastName || "",
          skip_password_requirement: true,
          skip_password_checks: true,
          public_metadata: {
            checkoutSessionId: args.checkoutSessionId,
            createdFromCheckout: true,
            onboardingStatus: "pending",
          },
          private_metadata: {
            memberId: args.memberId,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Clerk API error:", error);
        
        // Check if user already exists
        if (response.status === 422) {
          const errorData = JSON.parse(error);
          if (errorData.errors?.some((e: any) => e.code === "form_identifier_exists")) {
            // User already exists, link to existing Clerk account
            const existingUserResponse = await fetch(
              `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.email)}`,
              {
                headers: {
                  Authorization: `Bearer ${clerkSecretKey}`,
                },
              }
            );
            
            if (existingUserResponse.ok) {
              const users = await existingUserResponse.json();
              if (users.data && users.data.length > 0) {
                const existingUser = users.data[0];
                const clerkUserId = existingUser.id;
                
                // Create sign-in token for existing user
                const signInTokenResponse = await fetch(
                  "https://api.clerk.com/v1/sign_in_tokens",
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${clerkSecretKey}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      user_id: clerkUserId,
                      expires_in_seconds: 300,
                    }),
                  }
                );

                let signInToken = null;
                if (signInTokenResponse.ok) {
                  const tokenData = await signInTokenResponse.json();
                  signInToken = tokenData.token;
                }
                
                // Update member with existing Clerk ID
                await ctx.runMutation(internal.auth.clerkAccounts.internalUpdateMemberWithClerkId, {
                  memberId: args.memberId,
                  clerkUserId,
                  signInToken,
                });
                
                return { clerkUserId, signInToken, existingUser: true };
              }
            }
          }
        }
        
        throw new Error(`Failed to create Clerk account: ${error}`);
      }

      const clerkUser = await response.json();
      const clerkUserId = clerkUser.id;

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
            user_id: clerkUserId,
            expires_in_seconds: 300, // 5 minutes
          }),
        }
      );

      let signInToken = null;
      if (signInTokenResponse.ok) {
        const tokenData = await signInTokenResponse.json();
        signInToken = tokenData.token;
      }

      // Update member with Clerk ID and sign-in token
      await ctx.runMutation(internal.auth.clerkAccounts.internalUpdateMemberWithClerkId, {
        memberId: args.memberId,
        clerkUserId,
        signInToken,
      });

      if (signInToken) {
        return { 
          clerkUserId, 
          signInToken,
          existingUser: false,
        };
      }

      return { clerkUserId, existingUser: false };
    } catch (error) {
      console.error("Error creating Clerk account:", error);
      // Don't fail the purchase flow if account creation fails
      // User can still create account manually later
      return null;
    }
  },
});

/**
 * Internal mutation to update member with Clerk ID and set onboarding status.
 */
export const internalUpdateMemberWithClerkId = internalMutation({
  args: {
    memberId: v.id("members"),
    clerkUserId: v.string(),
    signInToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Update member with Clerk external ID and pending onboarding status
    const updateData: any = {
      externalId: args.clerkUserId,
      status: "pending_onboarding" as const,
      updatedAt: Date.now(),
    };

    // Store sign-in token temporarily if provided
    if (args.signInToken) {
      updateData.signInToken = args.signInToken;
    }

    await ctx.db.patch(args.memberId, updateData);

    return { success: true };
  },
});

/**
 * Mutation to complete onboarding after user sets password or connects social auth.
 */
export const completeOnboarding = mutation({
  args: {
    memberId: v.id("members"),
    authMethod: v.union(
      v.literal("password"),
      v.literal("google"),
      v.literal("discord")
    ),
  },
  handler: async (ctx, args) => {
    // Verify the user is authenticated and owns this member record
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Verify this is the correct member
    if (member.externalId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Clear sign-in token and update member status to active
    await ctx.db.patch(args.memberId, {
      status: "active" as const,
      onboardingCompletedAt: Date.now(),
      authMethod: args.authMethod,
      signInToken: undefined, // Clear the temporary token
      updatedAt: Date.now(),
    });

    // Update Clerk metadata to reflect completed onboarding
    await ctx.scheduler.runAfter(0, internal.auth.updateClerkMetadata.updateClerkOnboardingStatus, {
      clerkUserId: member.externalId,
      status: "complete",
    });

    return { success: true };
  },
});