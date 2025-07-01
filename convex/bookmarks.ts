import { query } from "./_generated/server";
import { v } from "convex/values";

export const isBookmarked = query({
  args: {
    postId: v.id("posts"),
    memberId: v.id("members"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    return false;
  },
});
