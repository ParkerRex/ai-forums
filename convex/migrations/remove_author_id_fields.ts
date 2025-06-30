import { internalMutation } from "../_generated/server";

export const removeAuthorIdFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting migration: Remove authorId fields");

    // Remove authorId from posts
    const posts = await ctx.db.query("posts").collect();
    console.log(`Processing ${posts.length} posts...`);
    
    let postsUpdated = 0;
    for (const post of posts) {
      if ("authorId" in post) {
        const { authorId, ...postWithoutAuthorId } = post;
        await ctx.db.patch(post._id, postWithoutAuthorId);
        postsUpdated++;
      }
    }
    console.log(`Updated ${postsUpdated} posts`);

    // Remove authorId from comments
    const comments = await ctx.db.query("comments").collect();
    console.log(`Processing ${comments.length} comments...`);
    
    let commentsUpdated = 0;
    for (const comment of comments) {
      if ("authorId" in comment) {
        const { authorId, ...commentWithoutAuthorId } = comment;
        await ctx.db.patch(comment._id, commentWithoutAuthorId);
        commentsUpdated++;
      }
    }
    console.log(`Updated ${commentsUpdated} comments`);

    // Remove authorId from postVersions
    const postVersions = await ctx.db.query("postVersions").collect();
    console.log(`Processing ${postVersions.length} post versions...`);
    
    let versionsUpdated = 0;
    for (const version of postVersions) {
      if ("authorId" in version) {
        const { authorId, ...versionWithoutAuthorId } = version;
        await ctx.db.patch(version._id, versionWithoutAuthorId);
        versionsUpdated++;
      }
    }
    console.log(`Updated ${versionsUpdated} post versions`);

    console.log("Migration completed: authorId fields removed");
    
    return {
      postsUpdated,
      commentsUpdated,
      versionsUpdated,
      total: postsUpdated + commentsUpdated + versionsUpdated
    };
  },
});