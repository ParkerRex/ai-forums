import { query } from "./_generated/server";
import { v } from "convex/values";

export const getMembers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("members"),
      _creationTime: v.number(),
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      status: v.union(v.literal("active"), v.literal("churned"), v.literal("free")),
      joinedDate: v.number(),
      country: v.optional(v.string()),
      updatedAt: v.number(),
      bio: v.optional(v.string()),
      lastOnline: v.number(),
      linkGithub: v.optional(v.string()),
      linkX: v.optional(v.string()),
      linkYouTube: v.optional(v.string()),
      location: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const members = await ctx.db.query("members").collect();
    return members;
  },
});

export const getMemberById = query({
  args: {
    id: v.id("members"),
  },
  returns: v.union(
    v.object({
      _id: v.id("members"),
      _creationTime: v.number(),
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      status: v.union(v.literal("active"), v.literal("churned"), v.literal("free")),
      joinedDate: v.number(),
      country: v.optional(v.string()),
      updatedAt: v.number(),
      bio: v.optional(v.string()),
      lastOnline: v.number(),
      linkGithub: v.optional(v.string()),
      linkX: v.optional(v.string()),
      linkYouTube: v.optional(v.string()),
      location: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.id);
    return member;
  },
});