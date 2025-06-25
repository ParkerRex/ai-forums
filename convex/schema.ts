import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  members: defineTable({
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
  categories: defineTable({
    name: v.string(),
    hotScore: v.number(),
    defaultRank: v.number(),
  })
    .index("by_hotScore", ["hotScore"])
    .index("by_defaultRank", ["defaultRank"]),
  posts: defineTable({
    name: v.string(),
    content: v.string(),
    updatedAt: v.number(),
    userId: v.id("members"),
    categoryId: v.id("categories"),
    votes: v.number(),
  }).index("by_categoryId", ["categoryId"]),
});
