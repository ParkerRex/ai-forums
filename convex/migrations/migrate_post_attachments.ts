/**
 * @fileoverview Post Attachments Migration
 *
 * This migration converts legacy post media storage from individual fields to a unified
 * attachments array structure. This modernization enables support for multiple media
 * attachments per post and provides better type safety for media handling.
 *
 * **Database Schema Changes:**
 * - Converts `mediaUrl` field to `attachments` array structure
 * - Migrates `thumbnailUrl`, `mediaWidth`, `mediaHeight`, `aspectRatio` to attachment objects
 * - Handles `linkImage` field for link preview attachments
 * - Preserves existing media data while restructuring storage format
 *
 * **Data Transformation:**
 * - Legacy single media → Array of attachment objects
 * - YouTube URLs → Specialized youtube attachment type with videoId extraction
 * - Link images → Dedicated link preview attachments
 * - Maintains all existing media metadata and dimensions
 *
 * **Migration Safety:**
 * - Batch processing with configurable batch sizes
 * - Filters prevent re-processing of already migrated posts
 * - Preserves original media URLs and metadata
 * - Graceful handling of malformed media URLs
 *
 * **Risks:**
 * - Medium risk - restructures core media data
 * - Potential data loss if migration fails mid-process
 * - YouTube URL parsing could fail on edge cases
 * - Large batch operations may impact performance
 *
 * **Attachment Structure:**
 * ```typescript
 * {
 *   id: string,           // Unique identifier for attachment
 *   type: 'image' | 'video' | 'youtube',
 *   url: string,          // Media URL
 *   thumbnailUrl?: string, // Thumbnail for videos
 *   width?: number,       // Media width
 *   height?: number,      // Media height
 *   aspectRatio?: number, // Width/height ratio
 *   videoId?: string,     // YouTube video ID
 *   order: number         // Display order
 * }
 * ```
 *
 * @author VAI Development Team
 * @version 1.0.0
 * @since 2024-04-01
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Migration to convert legacy posts with mediaUrl to use the new attachments array
/**
 * Migration to convert legacy post media fields to unified attachments array.
 *
 * This migration processes posts with legacy `mediaUrl` fields and converts them
 * to the new attachments array structure. The migration handles various media types
 * including images, videos, and YouTube embeds with proper type detection.
 *
 * **Process:**
 * 1. Queries posts with mediaUrl but no attachments (prevents re-processing)
 * 2. Processes posts in configurable batches for performance
 * 3. Creates attachment objects with proper type classification
 * 4. Handles YouTube URLs with video ID extraction
 * 5. Preserves all existing media metadata and dimensions
 *
 * **Media Type Detection:**
 * - YouTube URLs: Converts to 'youtube' type with videoId extraction
 * - Video posts: Creates 'video' type attachments
 * - Image posts: Creates 'image' type attachments
 * - Default: Falls back to 'image' type for safety
 *
 * **YouTube URL Patterns:**
 * - youtube.com/watch?v=VIDEO_ID
 * - youtu.be/VIDEO_ID
 * - youtube.com/embed/VIDEO_ID
 *
 * @param {number} [batchSize=100] - Number of posts to process per batch
 * @returns {Promise<{processedCount: number}>} Total number of posts migrated
 * @throws {Error} If database operations fail
 *
 * @example
 * ```typescript
 * // Migrate with default batch size
 * const result = await ctx.runMutation(api.migrations.migrate_post_attachments.migratePostAttachments);
 *
 * // Migrate with custom batch size
 * const result = await ctx.runMutation(api.migrations.migrate_post_attachments.migratePostAttachments, {
 *   batchSize: 50
 * });
 * ```
 */
export const migratePostAttachments = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { batchSize = 100 }) => {
    let processedCount = 0;
    let hasMore = true;

    // Process posts in batches to avoid memory issues and enable resumable migration
    while (hasMore) {
      // Query posts that have legacy mediaUrl but no modern attachments array
      // This filter ensures we only process posts that need migration
      const posts = await ctx.db
        .query("posts")
        .filter((q) =>
          q.and(q.neq(q.field("mediaUrl"), undefined), q.eq(q.field("attachments"), undefined)),
        )
        .take(batchSize);

      // Exit loop when no more posts need processing
      if (posts.length === 0) {
        hasMore = false;
        break;
      }

      // Process each post in the current batch
      for (const post of posts) {
        // Create base attachment object from legacy media fields
        // Generate unique ID using post ID to prevent conflicts
        const attachment = {
          id: `legacy-${post._id}`,
          type:
            post.type === "image"
              ? ("image" as const)
              : post.type === "video"
                ? ("video" as const)
                : ("image" as const), // Default to image if type is unclear
          url: post.mediaUrl!,
          thumbnailUrl: post.thumbnailUrl,
          width: post.mediaWidth,
          height: post.mediaHeight,
          aspectRatio: post.aspectRatio,
          order: 0, // First attachment gets order 0
        };

        // Check if mediaUrl is a YouTube URL and handle specially
        // YouTube URLs need special handling with videoId extraction
        const youtubeRegex =
          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/;
        const youtubeMatch = post.mediaUrl?.match(youtubeRegex);

        if (youtubeMatch) {
          // Create specialized YouTube attachment with extracted video ID
          const youtubeAttachment = {
            ...attachment,
            type: "youtube" as const,
            videoId: youtubeMatch[1], // Extract video ID from URL
          };

          // Update the post with the YouTube-specific attachment
          await ctx.db.patch(post._id, {
            attachments: [youtubeAttachment],
          });

          processedCount++;
          continue; // Skip the regular update below
        }

        // Update the post with the standard media attachment
        await ctx.db.patch(post._id, {
          attachments: [attachment],
        });

        processedCount++;
      }

      // Check if we've processed all available posts
      // If batch is smaller than requested size, we've reached the end
      if (posts.length < batchSize) {
        hasMore = false;
      }
    }

    // Log completion summary for monitoring and debugging
    console.log(`Migration completed. Processed ${processedCount} posts.`);
    return { processedCount };
  },
});

/**
 * Migration to convert legacy link preview images to attachments array.
 *
 * This migration handles posts with `linkImage` fields that represent preview images
 * for linked content. These images are converted to attachment objects to maintain
 * consistency with the new media attachment system.
 *
 * **Process:**
 * 1. Queries posts with linkImage but no mediaUrl or attachments
 * 2. Processes posts in configurable batches for performance
 * 3. Creates image-type attachment objects for link previews
 * 4. Preserves link preview functionality in new structure
 *
 * **Link Preview Handling:**
 * - Only processes posts with linkImage but no existing media
 * - Creates image-type attachments for link previews
 * - Maintains existing link preview display logic
 * - Preserves all link metadata and URLs
 *
 * @param {number} [batchSize=100] - Number of posts to process per batch
 * @returns {Promise<{processedCount: number}>} Total number of posts migrated
 * @throws {Error} If database operations fail
 *
 * @example
 * ```typescript
 * // Migrate link preview images
 * const result = await ctx.runMutation(api.migrations.migrate_post_attachments.migrateLinkedPostAttachments);
 * console.log(`Processed ${result.processedCount} link preview posts`);
 * ```
 */
// Migration to also handle posts with linkUrl that might have media
export const migrateLinkedPostAttachments = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { batchSize = 100 }) => {
    let processedCount = 0;
    let hasMore = true;

    // Process posts with link preview images in batches
    while (hasMore) {
      // Query posts that have linkImage but no other media attachments
      // This ensures we only process link previews, not posts with actual media
      const posts = await ctx.db
        .query("posts")
        .filter((q) =>
          q.and(
            q.neq(q.field("linkImage"), undefined),
            q.eq(q.field("mediaUrl"), undefined),
            q.eq(q.field("attachments"), undefined),
          ),
        )
        .take(batchSize);

      // Exit loop when no more posts need processing
      if (posts.length === 0) {
        hasMore = false;
        break;
      }

      // Process each post in the current batch
      for (const post of posts) {
        // Only process posts that actually have linkImage data
        if (post.linkImage) {
          // Create attachment object for link preview image
          // Use unique ID to distinguish from regular media attachments
          const attachment = {
            id: `legacy-link-${post._id}`,
            type: "image" as const,
            url: post.linkImage,
            order: 0, // Link preview images are typically the first attachment
          };

          // Update the post with the link preview attachment
          await ctx.db.patch(post._id, {
            attachments: [attachment],
          });

          processedCount++;
        }
      }

      // Check if we've processed all available posts
      // If batch is smaller than requested size, we've reached the end
      if (posts.length < batchSize) {
        hasMore = false;
      }
    }

    // Log completion summary for monitoring and debugging
    console.log(`Link migration completed. Processed ${processedCount} posts.`);
    return { processedCount };
  },
});
