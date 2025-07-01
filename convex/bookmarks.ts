import { query } from "./_generated/server";
import { v } from "convex/values";

export const isBookmarked = query({
  args: {
    targetId: v.string(),
    targetType: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    return false;
  },
});
