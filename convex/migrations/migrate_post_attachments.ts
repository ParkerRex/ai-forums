import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Migration to convert legacy posts with mediaUrl to use the new attachments array
export const migratePostAttachments = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { batchSize = 100 }) => {
    let processedCount = 0;
    let hasMore = true;
    
    while (hasMore) {
      // Get posts that have mediaUrl but no attachments
      const posts = await ctx.db
        .query("posts")
        .filter((q) => 
          q.and(
            q.neq(q.field("mediaUrl"), undefined),
            q.eq(q.field("attachments"), undefined)
          )
        )
        .take(batchSize);
      
      if (posts.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process each post
      for (const post of posts) {
        const attachment = {
          id: `legacy-${post._id}`,
          type: post.type === "image" ? "image" as const : 
                post.type === "video" ? "video" as const : 
                "image" as const, // Default to image if type is unclear
          url: post.mediaUrl!,
          thumbnailUrl: post.thumbnailUrl,
          width: post.mediaWidth,
          height: post.mediaHeight,
          aspectRatio: post.aspectRatio,
          order: 0,
        };
        
        // Handle YouTube videos - check if mediaUrl is a YouTube URL
        const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/;
        const youtubeMatch = post.mediaUrl?.match(youtubeRegex);
        
        if (youtubeMatch) {
          // Don't modify the attachment inline, create a new one with youtube type
          const youtubeAttachment = {
            ...attachment,
            type: "youtube" as const,
            videoId: youtubeMatch[1],
          };
          
          // Update the post with the YouTube attachment
          await ctx.db.patch(post._id, {
            attachments: [youtubeAttachment],
          });
          
          processedCount++;
          continue; // Skip the regular update below
        }
        
        // Update the post with the attachment
        await ctx.db.patch(post._id, {
          attachments: [attachment],
        });
        
        processedCount++;
      }
      
      // If we processed fewer than batchSize, we're done
      if (posts.length < batchSize) {
        hasMore = false;
      }
    }
    
    console.log(`Migration completed. Processed ${processedCount} posts.`);
    return { processedCount };
  },
});

// Migration to also handle posts with linkUrl that might have media
export const migrateLinkedPostAttachments = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { batchSize = 100 }) => {
    let processedCount = 0;
    let hasMore = true;
    
    while (hasMore) {
      // Get posts that have linkImage but no attachments and no mediaUrl
      const posts = await ctx.db
        .query("posts")
        .filter((q) => 
          q.and(
            q.neq(q.field("linkImage"), undefined),
            q.eq(q.field("mediaUrl"), undefined),
            q.eq(q.field("attachments"), undefined)
          )
        )
        .take(batchSize);
      
      if (posts.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process each post
      for (const post of posts) {
        if (post.linkImage) {
          const attachment = {
            id: `legacy-link-${post._id}`,
            type: "image" as const,
            url: post.linkImage,
            order: 0,
          };
          
          // Update the post with the attachment
          await ctx.db.patch(post._id, {
            attachments: [attachment],
          });
          
          processedCount++;
        }
      }
      
      // If we processed fewer than batchSize, we're done
      if (posts.length < batchSize) {
        hasMore = false;
      }
    }
    
    console.log(`Link migration completed. Processed ${processedCount} posts.`);
    return { processedCount };
  },
});