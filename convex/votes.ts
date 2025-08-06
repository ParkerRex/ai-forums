import { v } from "convex/values";
import { query } from "./_generated/server";

export const getUserVotesBatch = query({
	args: {
		targetIds: v.array(v.id("blocks")),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return {};
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", identity.email!))
			.first();

		if (!user) {
			return {};
		}

		const votes = await ctx.db
			.query("votes")
			.withIndex("userBlock", (q) => q.eq("userId", user._id))
			.collect();

		const voteMap: Record<string, number> = {};
		for (const vote of votes) {
			if (args.targetIds.includes(vote.blockId)) {
				voteMap[vote.blockId] = vote.value;
			}
		}

		return voteMap;
	},
});
