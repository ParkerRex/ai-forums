import { query } from "./_generated/server";

export const verifyAuthorIdRemoval = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").take(3);
    const postsWithAuthorId = posts.filter(p => 'authorId' in p);
    
    const comments = await ctx.db.query("comments").take(3);
    const commentsWithAuthorId = comments.filter(c => 'authorId' in c);
    
    return {
      samplePost: posts[0],
      postsChecked: posts.length,
      postsWithAuthorId: postsWithAuthorId.length,
      commentsChecked: comments.length,
      commentsWithAuthorId: commentsWithAuthorId.length,
      schemaCleanupComplete: postsWithAuthorId.length === 0 && commentsWithAuthorId.length === 0,
    };
  },
});
