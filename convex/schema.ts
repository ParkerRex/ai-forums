import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Reusable validators following t3-schema.ts patterns
export const PostStatusValidator = v.union(
  v.literal("active"),
  v.literal("deleted"),
  v.literal("hidden"),
  v.literal("archived")
);

export const PostTypeValidator = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("video"),
  v.literal("link")
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
    externalId: v.optional(v.string()), // Clerk user ID for new auth system
    status: v.union(v.literal("active"), v.literal("churned"), v.literal("free"), v.literal("duplicate")),
    joinedDate: v.number(),
    country: v.optional(v.string()),
    slug: v.string(),
    mergedInto: v.optional(v.id("members")),
    updatedAt: v.number(),
    bio: v.optional(v.string()),
    lastOnline: v.number(),
    linkGithub: v.optional(v.string()),
    linkX: v.optional(v.string()),
    linkYouTube: v.optional(v.string()),
    location: v.optional(v.string()),
    // New fields for member upgrades
    avatarUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    // Cached stats fields
    postCount: v.optional(v.number()),
    commentCount: v.optional(v.number()),
    netVoteCount: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_joinedDate", ["joinedDate"])
    .index("by_lastOnline", ["lastOnline"])
    .index("by_status_and_joinedDate", ["status", "joinedDate"])
    .index("by_skills", ["skills"])
    .index("by_slug", ["slug"])
    .index("by_externalId", ["externalId"])
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
    memberId: v.id("members"),
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
    // New media and link fields
    type: v.optional(PostTypeValidator),
    mediaUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    linkDescription: v.optional(v.string()),
    linkImage: v.optional(v.string()),

    linkPreviews: v.optional(v.record(v.string(), v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
      url: v.string(),
    }))),

  })
    .index("by_categoryId", ["categoryId"])
    .index("by_memberId", ["memberId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"])
    .index("by_netVotes", ["netVotes"])
    .index("by_slug", ["slug"])
    .index("by_category_and_createdAt", ["categoryId", "createdAt"])
    .index("by_category_and_netVotes", ["categoryId", "netVotes"])
    .index("by_member_and_createdAt", ["memberId", "createdAt"])
    .searchIndex("search_posts", {
      searchField: "title",
      filterFields: ["categoryId", "status", "memberId"]
    })
    .searchIndex("search_posts_content", {
      searchField: "content",
      filterFields: ["categoryId", "status", "memberId"]
    }),
  comments: defineTable({
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    memberId: v.id("members"),
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
    .index("by_memberId", ["memberId"])
    .index("by_parentCommentId", ["parentCommentId"])
    .index("by_post_and_createdAt", ["postId", "createdAt"])
    .index("by_post_and_netVotes", ["postId", "netVotes"])
    .index("by_parent_and_createdAt", ["parentCommentId", "createdAt"])
    .index("by_status", ["status"])
    .index("by_post_member_createdAt", ["postId", "memberId", "createdAt"])
    .searchIndex("search_comments", {
      searchField: "content",
      filterFields: ["postId", "status", "memberId"]
    }),
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

  post_versions: defineTable({
    postId: v.id("posts"),
    version: v.number(),
    title: v.string(),
    content: v.string(),
    editorId: v.id("members"),
    editedAt: v.number(),
    editReason: v.optional(v.string()),
    // Store the full post state at time of edit
    type: v.optional(PostTypeValidator),
    mediaUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    linkDescription: v.optional(v.string()),
    linkImage: v.optional(v.string()),
  })
    .index("by_postId", ["postId"])
    .index("by_post_and_version", ["postId", "version"])
    .index("by_editorId", ["editorId"])
    .index("by_editedAt", ["editedAt"]),

  bookmarks: defineTable({
    memberId: v.id("members"),
    targetId: v.string(),
    targetType: v.union(v.literal("post"), v.literal("resource")),
    createdAt: v.number(),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_memberId", ["memberId"])
    .index("by_member_and_target", ["memberId", "targetId", "targetType"])
    .index("by_member_and_type", ["memberId", "targetType"])
    .index("by_member_and_createdAt", ["memberId", "createdAt"])
    .index("by_targetId", ["targetId"]),
});
