import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Mutation to import a single comment with auto-create for missing members
export const importCommentFixed = mutation({
  args: {
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    authorEmail: v.string(),
    postId: v.id("posts"),
    parentCommentId: v.optional(v.id("comments")),
    status: v.union(v.literal("active"), v.literal("deleted"), v.literal("hidden")),
    upvotes: v.number(),
    downvotes: v.number(),
    netVotes: v.number(),
    depth: v.number(),
    childCount: v.number(),
    skoolId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the author by email
    let author = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.authorEmail))
      .first();
    
    // If not found, create an inactive member
    if (!author) {
      const nameParts = args.authorEmail.split('@')[0].split('-');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1, -1).join(' ') || 'User';
      
      const authorId = await ctx.db.insert("members", {
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        email: args.authorEmail,
        status: "churned" as const,
        joinedDate: Date.now(),
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        bio: "Imported from Skool (inactive member)",
      });
      
      author = await ctx.db.get(authorId);
      console.log(`Created inactive member for comment author: ${args.authorEmail}`);
    }

    // Now we definitely have an author
    const commentId = await ctx.db.insert("comments", {
      content: args.content,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      authorId: author!._id,
      postId: args.postId,
      parentCommentId: args.parentCommentId,
      status: args.status,
      upvotes: args.upvotes,
      downvotes: args.downvotes,
      netVotes: args.netVotes,
      depth: args.depth,
      childCount: args.childCount,
    });

    return { commentId, skoolId: args.skoolId };
  },
});