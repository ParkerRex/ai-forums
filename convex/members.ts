import { v } from "convex/values";
import { query } from "./_generated/server";

export const getMembersWithStats = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;
		const users = await ctx.db.query("users").take(limit);

		// Add basic stats for each user
		const membersWithStats = await Promise.all(
			users.map(async (user) => {
				const posts = await ctx.db
					.query("blocks")
					.withIndex("createdBy", (q) => q.eq("createdBy", user._id))
					.filter((q) => q.eq(q.field("type"), "post"))
					.collect();

				return {
					...user,
					postCount: posts.length,
					joinedAt: user.updatedAt,
				};
			}),
		);

		return membersWithStats;
	},
});

export const searchMembersWithStats = query({
	args: {
		searchTerm: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;
		const users = await ctx.db.query("users").collect();

		// Filter users by search term
		const filteredUsers = users
			.filter((user) => {
				const searchLower = args.searchTerm.toLowerCase();
				return (
					user.name?.toLowerCase().includes(searchLower) ||
					user.email.toLowerCase().includes(searchLower) ||
					user.bio?.toLowerCase().includes(searchLower)
				);
			})
			.slice(0, limit);

		// Add basic stats for each user
		const membersWithStats = await Promise.all(
			filteredUsers.map(async (user) => {
				const posts = await ctx.db
					.query("blocks")
					.withIndex("createdBy", (q) => q.eq("createdBy", user._id))
					.filter((q) => q.eq(q.field("type"), "post"))
					.collect();

				return {
					...user,
					postCount: posts.length,
					joinedAt: user.updatedAt,
				};
			}),
		);

		return membersWithStats;
	},
});

export const getMemberBySlug = query({
	args: {
		slug: v.string(),
	},
	handler: async (ctx, args) => {
		// Try to find by email first (slug might be email-based)
		const userByEmail = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", args.slug))
			.first();

		if (userByEmail) {
			return userByEmail;
		}

		// Otherwise search by name
		const users = await ctx.db.query("users").collect();
		return users.find(
			(user) =>
				user.name?.toLowerCase().replace(/\s+/g, "-") ===
				args.slug.toLowerCase(),
		);
	},
});

export const getMemberPosts = query({
	args: {
		memberId: v.id("users"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 10;
		const posts = await ctx.db
			.query("blocks")
			.withIndex("createdBy", (q) => q.eq("createdBy", args.memberId))
			.filter((q) => q.eq(q.field("type"), "post"))
			.order("desc")
			.take(limit);

		return posts;
	},
});

export const getMemberActivity = query({
	args: {
		memberId: v.id("users"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 20;
		const activities = await ctx.db
			.query("blocks")
			.withIndex("createdBy", (q) => q.eq("createdBy", args.memberId))
			.order("desc")
			.take(limit);

		return activities;
	},
});

export const getCurrentMember = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		return await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", identity.email!))
			.first();
	},
});
