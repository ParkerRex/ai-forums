import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedMember } from "./auth";

export const toggleBookmark = mutation({
  args: {
    targetId: v.string(),
    targetType: v.union(v.literal("post"), v.literal("resource")),
  },
  handler: async (ctx, args) => {
    const member = await getAuthenticatedMember(ctx);
    
    const existingBookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_member_and_target", (q) =>
        q.eq("memberId", member._id)
         .eq("targetId", args.targetId)
         .eq("targetType", args.targetType)
      )
      .first();

    const now = Date.now();

    if (existingBookmark) {
      await ctx.db.delete(existingBookmark._id);
      return { bookmarked: false };
    } else {
      await ctx.db.insert("bookmarks", {
        memberId: member._id,
        targetId: args.targetId,
        targetType: args.targetType,
        createdAt: now,
      });
      return { bookmarked: true };
    }
  },
});

export const isBookmarked = query({
  args: {
    targetId: v.string(),
    targetType: v.union(v.literal("post"), v.literal("resource")),
  },
  handler: async (ctx, args) => {
    let member;
    try {
      member = await getAuthenticatedMember(ctx);
    } catch {
      return false;
    }

    const bookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_member_and_target", (q) =>
        q.eq("memberId", member._id)
         .eq("targetId", args.targetId)
         .eq("targetType", args.targetType)
      )
      .first();

    return !!bookmark;
  },
});

export const getUserBookmarks = query({
  args: {
    targetType: v.optional(v.union(v.literal("post"), v.literal("resource"))),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const member = await getAuthenticatedMember(ctx);
    
    let query;
    if (args.targetType) {
      const targetType = args.targetType;
      query = ctx.db
        .query("bookmarks")
        .withIndex("by_member_and_type", (q) => 
          q.eq("memberId", member._id).eq("targetType", targetType)
        );
    } else {
      query = ctx.db
        .query("bookmarks")
        .withIndex("by_memberId", (q) => q.eq("memberId", member._id));
    }

    const result = await query
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      result.page.map(async (bookmark) => {
        if (bookmark.targetType === "post") {
          const post = await ctx.db.get(bookmark.targetId as Id<"posts">);
          if (post) {
            const [postMember, category] = await Promise.all([
              ctx.db.get(post.memberId),
              ctx.db.get(post.categoryId),
            ]);
            return {
              ...bookmark,
              target: {
                ...post,
                member: postMember ? {
                  _id: postMember._id,
                  firstName: postMember.firstName,
                  lastName: postMember.lastName,
                  email: postMember.email,
                  username: `${postMember.firstName.toLowerCase()}-${postMember.lastName.toLowerCase()}`,
                  slug: postMember.slug,
                } : null,
                category: category ? {
                  _id: category._id,
                  name: category.name,
                  displayName: category.displayName,
                  icon: category.icon,
                } : null,
              },
            };
          }
        }
        return { ...bookmark, target: null };
      })
    );

    return {
      ...result,
      page: enrichedPage.filter(item => item.target !== null),
    };
  },
});
