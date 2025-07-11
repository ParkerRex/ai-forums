import { internalMutation } from "../_generated/server";

/**
 * Internal mutation to clean up expired sign-in tokens.
 * Sign-in tokens are only valid for 5 minutes, so we can safely
 * clear them after an hour to keep the database clean.
 */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    // Find all members with sign-in tokens
    const membersWithTokens = await ctx.db
      .query("members")
      .filter((q) => q.neq(q.field("signInToken"), undefined))
      .collect();

    let cleaned = 0;
    for (const member of membersWithTokens) {
      // If the member was updated more than an hour ago, clear the token
      if (member.updatedAt < oneHourAgo) {
        await ctx.db.patch(member._id, {
          signInToken: undefined,
        });
        cleaned++;
      }
    }

    console.log(`Cleaned up ${cleaned} expired sign-in tokens`);
    return { cleaned };
  },
});