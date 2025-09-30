import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Check the status of a member created from checkout
 * Returns the member data and any sign-in token if available
 */
export const getCheckoutMemberStatus = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the most recent member by email
    const member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.email))
      .order("desc") // Get the most recent member with this email
      .first();

    if (!member) {
      return null;
    }

    // Return member info regardless of status, as long as they have a valid subscription
    if (!member.stripeSubscriptionId || member.subscriptionStatus !== "active") {
      return null;
    }

    return {
      memberId: member._id,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      status: member.status,
      hasClerkAccount: !!member.externalId,
      signInToken: member.signInToken,
    };
  },
});
