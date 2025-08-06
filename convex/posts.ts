import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;
		const posts = await ctx.db
			.query("blocks")
			.filter((q) => q.eq(q.field("type"), "post"))
			.order("desc")
			.take(limit);

		return posts;
	},
});

export const get = query({
	args: {
		id: v.id("blocks"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const create = mutation({
	args: {
		title: v.string(),
		body: v.optional(v.string()),
		url: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", identity.email!))
			.first();

		if (!user) {
			throw new Error("User not found");
		}

		const postId = await ctx.db.insert("blocks", {
			type: "post",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			createdBy: user._id,
			deleted: false,
			content: [],
			position: 0,
			properties: {
				title: args.title,
				body: args.body,
				url: args.url,
				votes: 0,
				upvotes: 0,
				downvotes: 0,
			},
		});

		return postId;
	},
});
