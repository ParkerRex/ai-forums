import { v } from "convex/values";
import { query } from "./_generated/server";

// Query to get post history
export const getPostHistory = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    // Get the post to ensure it exists
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Get all versions for this post, ordered by version descending
    const versions = await ctx.db
      .query("post_versions")
      .withIndex("by_postId", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(20);

    // Get editor information for each version
    const versionsWithEditors = await Promise.all(
      versions.map(async (version) => {
        const editor = await ctx.db.get(version.editorId);
        return {
          ...version,
          editor: editor ? {
            _id: editor._id,
            firstName: editor.firstName,
            lastName: editor.lastName,
            avatarUrl: editor.avatarUrl,
          } : null,
        };
      })
    );

    return versionsWithEditors;
  },
});

// Query to get the next version number for a post
export const getNextVersionNumber = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("post_versions")
      .withIndex("by_post_and_version", (q) => q.eq("postId", args.postId))
      .order("desc")
      .first();

    return (versions?.version ?? 0) + 1;
  },
}); 