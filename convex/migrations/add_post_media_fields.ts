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
        });
        migratedCount++;
      }
    }

    console.log(`Migration complete: Added type field to ${migratedCount} posts`);
    return { migratedCount };
  },
});

export const addPostAspectRatioFields = mutation({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .collect();

    let migratedCount = 0;
    
    for (const post of posts) {
      if (post.aspectRatio === undefined) {
        let aspectRatio = 16/9;
        let mediaWidth = 1600;
        let mediaHeight = 900;
        
        if (post.type === "image" || post.type === "video") {
          aspectRatio = 16/9;
          mediaWidth = 1600;
          mediaHeight = 900;
        }
        
        await ctx.db.patch(post._id, {
          aspectRatio,
          mediaWidth,
          mediaHeight,
        });
        migratedCount++;
      }
    }

    console.log(`Migration complete: Added aspect ratio fields to ${migratedCount} posts`);
    return { migratedCount };
  },
});   