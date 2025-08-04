import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const blockTypes = v.union(
  v.literal("post"),
  v.literal("comment"),
  v.literal("message"),
  v.literal("text"),
  v.literal("image"),
  v.literal("list"),
  v.literal("toggle"),
  v.literal("embed"),
  v.literal("table"),
  v.literal("page")
);

export default defineSchema({
 users: defineTable({
    bio: v.optional(v.string()),
    email: v.string(),
    name: v.optional(v.string()),
    updatedAt: v.number(),
    subscriptionId: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    endsOn: v.optional(v.number()),
    onboardingCompleted: v.boolean(),
  })
    .index('by_email', ['email'])
    .index('by_subscriptionId', ['subscriptionId']),
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    expires: v.number(),
  }).index('by_key', ['key']),


  blocks: defineTable({
    type: blockTypes,
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"), // Reference to user who created this block
    deleted: v.boolean(),
    
    parentId: v.optional(v.id("blocks")), // For permissions inheritance (upward pointer)
    content: v.array(v.id("blocks")), // Child blocks for rich composition (downward pointers)
    position: v.number(), // Order within parent's content array
    
    properties: v.object({
      title: v.optional(v.string()), // Text content, post titles, subreddit names, etc.
      body: v.optional(v.string()), // Longer text content
      url: v.optional(v.string()), // Links, images, embeds
      description: v.optional(v.string()), // Subreddit descriptions, etc.
      
      votes: v.optional(v.number()), // Upvotes minus downvotes
      upvotes: v.optional(v.number()),
      downvotes: v.optional(v.number()),
      
      // Rich content properties
      checked: v.optional(v.boolean()), // For todo items
      color: v.optional(v.string()), // For styling
      size: v.optional(v.string()), // For images, embeds
      
      metadata: v.optional(v.any()), // Catch-all for type-specific data
    }),
  })
    .index("type", ["type"])
    .index("createdBy", ["createdBy"])
    .index("parentId", ["parentId"])
    .index("createdAt", ["createdAt"])
    .index("position", ["position"])
    .index("title", ["properties.title"]), // Index common properties

  // Votes table - tracks individual user votes on blocks
  votes: defineTable({
    userId: v.id("users"),
    blockId: v.id("blocks"),
    value: v.number(), // 1 for upvote, -1 for downvote
    createdAt: v.number(),
  }).index("userBlock", ["userId", "blockId"]),

  // Optional: Cache table for materialized views of common queries
  cache: defineTable({
    key: v.string(),
    value: v.any(),
    expiresAt: v.number(),
  }).index("key", ["key"]),

});



