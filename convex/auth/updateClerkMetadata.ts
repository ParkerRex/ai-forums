import { v } from "convex/values";
import { internalAction } from "../_generated/server";

/**
 * Internal action to update Clerk user metadata after onboarding completion.
 * This ensures the middleware can properly check onboarding status.
 */
export const updateClerkOnboardingStatus = internalAction({
  args: {
    clerkUserId: v.string(),
    status: v.union(v.literal("pending"), v.literal("complete")),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not configured");
    }

    try {
      // Update user metadata in Clerk
      const response = await fetch(
        `https://api.clerk.com/v1/users/${args.clerkUserId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public_metadata: {
              onboardingStatus: args.status === "complete" ? undefined : args.status,
              onboardingCompletedAt: args.status === "complete" ? new Date().toISOString() : undefined,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to update Clerk metadata:", error);
        throw new Error("Failed to update onboarding status in Clerk");
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating Clerk metadata:", error);
      throw error;
    }
  },
});