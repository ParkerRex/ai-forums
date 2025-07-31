/**
 * @fileoverview Post Media Fields Migration
 * 
 * This migration adds essential media-related fields to existing post records that lack them.
 * The fields support the enhanced post system with proper media type classification and
 * aspect ratio handling for optimal display rendering.
 * 
 * **Database Schema Changes:**
 * - Adds `type` field to posts table ("text" | "image" | "video" | "link")
 * - Adds `aspectRatio` field for media dimension calculations
 * - Adds `mediaWidth` and `mediaHeight` fields for responsive rendering
 * 
 * **Data Transformation:**
 * - Backfills existing posts with type: "text" as the default
 * - Sets standard 16:9 aspect ratio (1600x900) for image/video posts
 * - Preserves existing data while adding new structured fields
 * 
 * **Migration Safety:**
 * - Only adds new fields, doesn't modify existing data
 * - Idempotent operations - safe to run multiple times
 * - Graceful handling of posts that already have the fields
 * 
 * **Risks:**
 * - Very low risk - purely additive schema changes
 * - Default values are safe and non-breaking
 * - No data loss or corruption possible
 * 
 * @author VAI Development Team
 * @version 1.0.0
 * @since 2024-02-01
 */

import { mutation } from "../_generated/server";

/**
 * Migration to add media type classification to existing posts.
 * 
 * This migration processes all posts in the database and adds the `type` field
 * to those that don't have it. The type field is essential for proper rendering
 * and filtering of different post types in the UI.
 * 
 * **Process:**
 * 1. Queries all posts from the database
 * 2. Identifies posts without the `type` field
 * 3. Backfills with "text" as the default type
 * 4. Updates each post record with the new field
 * 
 * **Type Classification:**
 * - "text" - Text-only posts (default for existing posts)
 * - "image" - Posts with image attachments
 * - "video" - Posts with video content
 * - "link" - Posts with external links
 * 
 * @returns {Promise<{migratedCount: number}>} Number of posts updated
 * @throws {Error} If database operations fail
 * 
 * @example
 * ```typescript
 * // Running the migration
 * const result = await ctx.runMutation(api.migrations.add_post_media_fields.addPostMediaFields);
 * console.log(`Added type field to ${result.migratedCount} posts`);
 * ```
 */
export const addPostMediaFields = mutation({
  args: {},
  handler: async (ctx) => {
    // Fetch all posts from the database for type field processing
    // We collect all posts to ensure we don't miss any during iteration
    const posts = await ctx.db
      .query("posts")
      .collect();

    let migratedCount = 0;
    
    // Process each post to add missing type field
    for (const post of posts) {
      // Check if post already has type field (idempotent operation)
      if (!post.type) {
        // Backfill with "text" as the safe default for existing posts
        // This assumes existing posts were primarily text-based
        await ctx.db.patch(post._id, {
          type: "text",
        });
        migratedCount++;
      }
    }

    // Log completion summary for monitoring and debugging
    console.log(`Migration complete: Added type field to ${migratedCount} posts`);
    return { migratedCount };
  },
});

/**
 * Migration to add aspect ratio and media dimension fields to existing posts.
 * 
 * This migration adds essential media dimension fields that enable proper
 * responsive rendering and aspect ratio calculations for posts with media content.
 * These fields are crucial for maintaining consistent layouts and optimal
 * display across different screen sizes.
 * 
 * **Process:**
 * 1. Queries all posts from the database
 * 2. Identifies posts without aspect ratio fields
 * 3. Applies standard 16:9 aspect ratio with 1600x900 dimensions
 * 4. Updates each post record with the new media fields
 * 
 * **Fields Added:**
 * - `aspectRatio` - Decimal ratio for responsive calculations (16/9 = 1.777...)
 * - `mediaWidth` - Standard width in pixels (1600px)
 * - `mediaHeight` - Standard height in pixels (900px)
 * 
 * **Aspect Ratio Logic:**
 * - Applies 16:9 ratio regardless of actual post type
 * - Provides consistent baseline for media rendering
 * - Can be overridden later with actual media dimensions
 * 
 * @returns {Promise<{migratedCount: number}>} Number of posts updated
 * @throws {Error} If database operations fail
 * 
 * @example
 * ```typescript
 * // Running the migration
 * const result = await ctx.runMutation(api.migrations.add_post_media_fields.addPostAspectRatioFields);
 * console.log(`Added aspect ratio fields to ${result.migratedCount} posts`);
 * ```
 */
export const addPostAspectRatioFields = mutation({
  args: {},
  handler: async (ctx) => {
    // Fetch all posts from the database for aspect ratio processing
    const posts = await ctx.db
      .query("posts")
      .collect();

    let migratedCount = 0;
    
    // Process each post to add missing aspect ratio fields
    for (const post of posts) {
      // Check if post already has aspectRatio field (idempotent operation)
      if (post.aspectRatio === undefined) {
        // Set standard aspect ratio and dimensions for all posts
        // Using 16:9 as the default ratio for consistent layouts
        let aspectRatio = 16/9;
        let mediaWidth = 1600;
        let mediaHeight = 900;
        
        // Apply same dimensions regardless of post type
        // This provides a consistent baseline that can be overridden later
        // with actual media dimensions when available
        if (post.type === "image" || post.type === "video") {
          aspectRatio = 16/9;
          mediaWidth = 1600;
          mediaHeight = 900;
        }
        
        // Update post with standardized media dimension fields
        await ctx.db.patch(post._id, {
          aspectRatio,
          mediaWidth,
          mediaHeight,
        });
        migratedCount++;
      }
    }

    // Log completion summary for monitoring and debugging
    console.log(`Migration complete: Added aspect ratio fields to ${migratedCount} posts`);
    return { migratedCount };
  },
});   