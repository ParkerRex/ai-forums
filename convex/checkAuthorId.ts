import { query } from "./_generated/server";

export const checkAuthorIdFields = query({
  args: {},
  handler: async (ctx) => {
    // Check a few posts
    const posts = await ctx.db.query("posts").take(3);
    const postsWithAuthorId = posts.filter(p => 'authorId' in p);
    
    // Check a few comments
    const comments = await ctx.db.query("comments").take(3);
    const commentsWithAuthorId = comments.filter(c => 'authorId' in c);
    
    return {
      samplePost: posts[0],
      postsChecked: posts.length,
      postsWithAuthorId: postsWithAuthorId.length,
      commentsChecked: comments.length,
      commentsWithAuthorId: commentsWithAuthorId.length,
    };
  },
});