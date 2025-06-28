import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Reusable validators following t3-schema.ts patterns
export const PostStatusValidator = v.union(
  v.literal("active"),
  v.literal("deleted"),
  v.literal("hidden"),
  v.literal("archived")
);

export const CommentStatusValidator = v.union(
  v.literal("active"),
  v.literal("deleted"),
  v.literal("hidden")
);

export const VoteTypeValidator = v.union(
  v.literal("upvote"),
  v.literal("downvote")
);

export const TargetTypeValidator = v.union(
  v.literal("post"),
  v.literal("comment")
);

export const CategoryStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("private")
);

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
  })
    .index("by_status", ["status"])
    .index("by_joinedDate", ["joinedDate"])
    .index("by_lastOnline", ["lastOnline"])
    .index("by_status_and_joinedDate", ["status", "joinedDate"])
    .searchIndex("search_members", {
      searchField: "firstName",
      filterFields: ["status"]
    }),
  categories: defineTable({
    name: v.string(),
    displayName: v.string(),
    description: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    postCount: v.number(),
    status: CategoryStatusValidator,
    creatorId: v.id("members"),
    rules: v.optional(v.string()),
    bannerImage: v.optional(v.string()),
    icon: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_status", ["status"])
    .index("by_postCount", ["postCount"])
    .searchIndex("search_categories", {
      searchField: "displayName",
      filterFields: ["status"]
    }),
  posts: defineTable({
    title: v.string(),
    content: v.string(),
    slug: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    authorId: v.id("members"),
    categoryId: v.id("categories"),
    status: PostStatusValidator,
    upvotes: v.number(),
    downvotes: v.number(),
    netVotes: v.number(),
    commentCount: v.number(),
    viewCount: v.number(),
    isPinned: v.optional(v.boolean()),
    isLocked: v.optional(v.boolean()),
    editedAt: v.optional(v.number()),
    editReason: v.optional(v.string()),
  })
    .index("by_categoryId", ["categoryId"])
    .index("by_authorId", ["authorId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"])
    .index("by_netVotes", ["netVotes"])
    .index("by_slug", ["slug"])
    .index("by_category_and_createdAt", ["categoryId", "createdAt"])
    .index("by_category_and_netVotes", ["categoryId", "netVotes"])
    .index("by_author_and_createdAt", ["authorId", "createdAt"])
    .searchIndex("search_posts", {
      searchField: "title",
      filterFields: ["categoryId", "status", "authorId"]
    }),
  comments: defineTable({
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    authorId: v.id("members"),
    postId: v.id("posts"),
    parentCommentId: v.optional(v.id("comments")),
    status: CommentStatusValidator,
    upvotes: v.number(),
    downvotes: v.number(),
    netVotes: v.number(),
    depth: v.number(),
    childCount: v.number(),
    editedAt: v.optional(v.number()),
    editReason: v.optional(v.string()),
  })
    .index("by_postId", ["postId"])
    .index("by_authorId", ["authorId"])
    .index("by_parentCommentId", ["parentCommentId"])
    .index("by_post_and_createdAt", ["postId", "createdAt"])
    .index("by_post_and_netVotes", ["postId", "netVotes"])
    .index("by_parent_and_createdAt", ["parentCommentId", "createdAt"])
    .index("by_status", ["status"])
    .index("by_post_author_createdAt", ["postId", "authorId", "createdAt"]),
  votes: defineTable({
    userId: v.id("members"),
    targetId: v.string(),
    targetType: TargetTypeValidator,
    voteType: VoteTypeValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_targetId", ["targetId"])
    .index("by_user_and_target", ["userId", "targetId", "targetType"])
    .index("by_target_and_type", ["targetId", "targetType"]),

  postViews: defineTable({
    postId: v.id("posts"),
    userId: v.optional(v.id("members")),
    viewedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_postId", ["postId"])
    .index("by_userId", ["userId"])
    .index("by_post_and_user", ["postId", "userId"])
    .index("by_viewedAt", ["viewedAt"]),
});
