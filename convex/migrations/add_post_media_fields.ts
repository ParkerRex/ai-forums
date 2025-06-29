import { mutation } from "../_generated/server";

export const addPostMediaFields = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all posts that don't have a type field yet
    const posts = await ctx.db
      .query("posts")
      .collect();

    let migratedCount = 0;
    
    for (const post of posts) {
      if (!post.type) {
        // Backfill with type: "text" for existing posts
        await ctx.db.patch(post._id, {
          type: "text",
          // Initialize other fields as null (which is the default)
        });
        migratedCount++;
      }
    }

    console.log(`Migration complete: Added type field to ${migratedCount} posts`);
    return { migratedCount };
  },
}); 