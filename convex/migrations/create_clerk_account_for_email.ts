import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

/**
 * Migration to create a Clerk account for a specific member by email.
 * This is useful for helping individual members while on support calls.
 */
const createClerkAccountForEmail = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    memberId: string;
    email?: string;
    message?: string;
    externalId?: string;
    error?: string;
  }> => {
    console.log(`Creating Clerk account for member with email: ${args.email}`);

    // Find the member by email
    const members = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();

    if (members.length === 0) {
      throw new Error(`No member found with email: ${args.email}`);
    }

    const member = members[0];

    // Check if they already have a Clerk account
    if (member.externalId) {
      console.log(`Member ${args.email} already has a Clerk account with ID: ${member.externalId}`);
      return {
        success: false,
        message: "Member already has a Clerk account",
        memberId: member._id,
        externalId: member.externalId,
      };
    }

    console.log(`Found member: ${member.firstName} ${member.lastName} (${member._id})`);

    try {
      // Create the Clerk account
      await ctx.scheduler.runAfter(0, internal.auth.clerkAccounts.createClerkAccount, {
        email: member.email,
        memberId: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        checkoutSessionId: "migration-support", // Special identifier for support-created accounts
      });

      console.log(`✓ Successfully scheduled Clerk account creation for ${args.email}`);

      return {
        success: true,
        memberId: member._id,
        email: member.email,
        message: "Clerk account creation scheduled",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`✗ Failed to create account for ${args.email}:`, errorMessage);

      return {
        success: false,
        memberId: member._id,
        email: member.email,
        error: errorMessage,
      };
    }
  },
});

export default createClerkAccountForEmail;
