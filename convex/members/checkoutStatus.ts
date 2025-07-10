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
    // Find member by email (guest member without externalId)
    const member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.email))
      .filter((q) => q.eq(q.field("status"), "pending_onboarding"))
      .first();

    if (!member) {
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