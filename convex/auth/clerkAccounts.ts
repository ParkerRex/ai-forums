import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";

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
          email_address: [args.email],
          first_name: args.firstName || "",
          last_name: args.lastName || "",
          skip_password_requirement: true,
          skip_password_checks: true,
          public_metadata: {
            checkoutSessionId: args.checkoutSessionId,
            createdFromCheckout: true,
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
          if (
            errorData.errors?.some((e: { code: string }) => e.code === "form_identifier_exists")
          ) {
            // User already exists, link to existing Clerk account
            const existingUserResponse = await fetch(
              `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.email)}`,
              {
                headers: {
                  Authorization: `Bearer ${clerkSecretKey}`,
                },
              },
            );

            if (existingUserResponse.ok) {
              const users = await existingUserResponse.json();
              if (users.data && users.data.length > 0) {
                const existingUser = users.data[0];
                const clerkUserId = existingUser.id;

                // Create sign-in token for existing user
                const signInTokenResponse = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${clerkSecretKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    user_id: clerkUserId,
                    expires_in_seconds: 300,
                  }),
                });

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
      const signInTokenResponse = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: clerkUserId,
          expires_in_seconds: 300, // 5 minutes
        }),
      });

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
 * Internal mutation to update member with Clerk ID.
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

    // Update member with Clerk external ID
    const updateData: {
      externalId: string;
      updatedAt: number;
      signInToken?: string;
    } = {
      externalId: args.clerkUserId,
      // Keep status as "active" - no onboarding needed
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
