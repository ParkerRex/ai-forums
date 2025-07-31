/**
 * @fileoverview Preview Generation Module - AI-powered post preview generation
 *
 * This module handles automatic generation of post previews using OpenAI's API.
 * It creates concise 2-3 line summaries of posts for display to non-members
 * and in post listings.
 *
 * @author VAI Development Team
 * @version 1.0.0
 */

import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";
import { api, internal } from "./_generated/api";

/**
 * Generates a preview for a post using OpenAI's GPT-4o-mini model.
 *
 * Takes the post title and content, and generates a concise 2-3 line
 * preview that captures the essence of the post. The preview is designed
 * to be engaging and informative for users who don't have full access.
 *
 * @param title - The post title
 * @param content - The full post content (can include markdown)
 * @returns A 2-3 line preview of the post
 *
 * @example
 * ```typescript
 * const preview = await generatePostPreview({
 *   title: "Building AI Applications with Next.js",
 *   content: "In this guide, we'll explore how to integrate AI models..."
 * });
 * // Returns: "Learn how to integrate AI models into Next.js applications
 * // with practical examples and best practices. Covers API integration,
 * // streaming responses, and deployment strategies."
 * ```
 */
export const generatePostPreview = action({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { title, content }) => {
    return await generateSinglePreview(title, content);
  },
});

/**
 * Internal action for generating a single preview.
 * Separated to allow calling from batch operations.
 */
const generateSinglePreview = async (
  title: string,
  content: string,
): Promise<string> => {
  // Get OpenAI API key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey,
  });

  // Clean content by removing markdown formatting for better summarization
  const cleanContent = content
    .replace(/[#*_~`]/g, "") // Remove markdown formatting
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to plain text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Remove images
    .replace(/\n{3,}/g, "\n\n") // Normalize line breaks
    .trim();

  try {
    // Generate preview using GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that creates concise post previews for an engineering blog.
Generate a 1-2 line preview (maximum 180 characters) that captures the essence of the post.
The preview generate interest but not be overly excited, give readers a clear idea what the post is about. 75% spartan tone, 25% friend at a coffee shop.
Do not use quotes or mention that this is a preview.`,
        },
        {
          role: "user",
          content: `Generate a preview for this post:

Title: ${title}

Content: ${cleanContent.substring(0, 1000)}`, // Limit content length for API
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const preview = completion.choices[0]?.message?.content?.trim();

    if (!preview) {
      throw new Error("Failed to generate preview");
    }

    // Ensure preview is within character limit
    if (preview.length > 280) {
      // Truncate at last complete sentence within limit
      const sentences = preview.match(/[^.!?]+[.!?]+/g) || [];
      let truncated = "";
      for (const sentence of sentences) {
        if ((truncated + sentence).length <= 277) {
          // Leave room for "..."
          truncated += sentence;
        } else {
          break;
        }
      }
      return (
        truncated.trim() + (truncated.length < preview.length ? "..." : "")
      );
    }

    return preview;
  } catch (error) {
    console.error("Error generating preview:", error);

    // Fallback to simple content extraction if API fails
    const fallbackPreview = cleanContent
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .slice(0, 2)
      .join(" ")
      .substring(0, 280);

    return (
      fallbackPreview || `${title}. Read more to discover the full content.`
    );
  }
};

/**
 * Batch generates previews for multiple posts.
 *
 * Useful for migrations or bulk operations where many posts need
 * preview generation. Includes rate limiting to avoid API limits.
 *
 * @param posts - Array of posts with title and content
 * @returns Array of generated previews
 */
export const batchGeneratePreviews = action({
  args: {
    posts: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        content: v.string(),
      }),
    ),
  },
  handler: async (ctx, { posts }) => {
    const results: Array<{
      id: string;
      preview: string | null;
      success: boolean;
      error?: string;
    }> = [];
    
    const successfulUpdates: Array<{
      postId: Id<"posts">;
      preview: string;
    }> = [];

    // Process in batches with delay to respect rate limits
    for (const post of posts) {
      try {
        const preview = await generateSinglePreview(post.title, post.content);

        results.push({
          id: post.id,
          preview,
          success: true,
        });
        
        // Collect successful previews for batch update
        successfulUpdates.push({
          postId: post.id as Id<"posts">,
          preview,
        });

        // Add delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to generate preview for post ${post.id}:`, error);
        results.push({
          id: post.id,
          preview: null,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    
    // Update all successful previews in the database
    if (successfulUpdates.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.previewGeneration.updatePostPreviews,
        { updates: successfulUpdates }
      );
    }

    return results;
  },
});

/**
 * Internal mutation to process posts without previews in batches.
 * Called by cron job to gradually generate all missing previews.
 */
export const processMissingPreviews = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { batchSize = 5 }) => {
    // Find posts without previews
    const postsWithoutPreview = await ctx.db
      .query("posts")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "active"),
          q.or(
            q.eq(q.field("preview"), undefined),
            q.eq(q.field("preview"), ""),
          )
        )
      )
      .take(batchSize);

    if (postsWithoutPreview.length === 0) {
      console.log("No posts need preview generation");
      return { processed: 0, remaining: 0 };
    }

    // Generate previews for this batch
    const posts = postsWithoutPreview.map((post) => ({
      _id: post._id,
      title: post.title,
      content: post.content,
    }));

    console.log(`Processing ${posts.length} posts for preview generation`);

    // Generate previews for this batch
    const results: Array<{
      id: string;
      preview: string | null;
      success: boolean;
      error?: string;
    }> = [];
    const successfulUpdates: Array<{
      postId: Id<"posts">;
      preview: string;
    }> = [];
    
    // Process posts directly in this mutation
    for (const post of posts) {
      try {
        // For now, use a simple preview generation
        const preview = `${post.title}. ${post.content.substring(0, 150)}...`;
        
        results.push({
          id: post._id,
          preview,
          success: true,
        });
        
        successfulUpdates.push({
          postId: post._id,
          preview,
        });
      } catch (error) {
        console.error(`Failed to generate preview for post ${post._id}:`, error);
        results.push({
          id: post._id,
          preview: null,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    
    // Update all successful previews
    if (successfulUpdates.length > 0) {
      for (const update of successfulUpdates) {
        await ctx.db.patch(update.postId, {
          preview: update.preview,
          updatedAt: Date.now(),
        });
      }
    }

    // Count remaining posts
    const remainingCount = await ctx.db
      .query("posts")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "active"),
          q.or(
            q.eq(q.field("preview"), undefined),
            q.eq(q.field("preview"), ""),
          )
        )
      )
      .collect()
      .then((posts) => posts.length - postsWithoutPreview.length);

    return {
      processed: posts.length,
      remaining: Math.max(0, remainingCount),
    };
  },
});

/**
 * Internal action to update posts with generated previews.
 * Called after batch preview generation completes.
 */
export const updatePostPreviews = internalMutation({
  args: {
    updates: v.array(
      v.object({
        postId: v.id("posts"),
        preview: v.string(),
      })
    ),
  },
  handler: async (ctx, { updates }) => {
    for (const { postId, preview } of updates) {
      await ctx.db.patch(postId, { preview });
      console.log(`Updated preview for post ${postId}`);
    }
    
    return { updated: updates.length };
  },
});

/**
 * Manual trigger to start preview generation for all missing posts.
 * Useful for immediate processing without waiting for cron.
 */
export const triggerPreviewGeneration = action({
  args: {},
  handler: async (ctx): Promise<{
    message: string;
    stats: {
      totalPosts: number;
      postsWithPreview: number;
      postsWithoutPreview: number;
      activePosts: number;
      activePostsWithoutPreview: number;
    };
    firstBatch?: string;
  }> => {
    // Get count of posts needing previews
    const stats = await ctx.runQuery(internal.previewGeneration.getPreviewStats);
    
    if (stats.postsWithoutPreview === 0) {
      return { message: "All posts already have previews!", stats };
    }
    
    // Start the first batch
    const result = await ctx.scheduler.runAfter(
      0,
      internal.previewGeneration.processMissingPreviews,
      { batchSize: 5 }
    );
    
    return {
      message: `Started preview generation for ${stats.postsWithoutPreview} posts. Processing in batches of 5.`,
      stats,
      firstBatch: result,
    };
  },
});

/**
 * Internal query to get preview generation statistics.
 */
export const getPreviewStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    
    const stats = {
      totalPosts: posts.length,
      postsWithPreview: posts.filter(p => p.preview && p.preview.length > 0).length,
      postsWithoutPreview: posts.filter(p => !p.preview || p.preview.length === 0).length,
      activePosts: posts.filter(p => p.status === "active").length,
      activePostsWithoutPreview: posts.filter(
        p => p.status === "active" && (!p.preview || p.preview.length === 0)
      ).length,
    };
    
    return stats;
  },
});

/**
 * Internal action to generate and update a single post's preview.
 * Called automatically after post creation/update if no preview provided.
 */
export const generateAndUpdatePostPreview = action({
  args: {
    postId: v.id("posts"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { postId, title, content }) => {
    try {
      // Generate the preview
      const preview = await generateSinglePreview(title, content);
      
      // Update the post with the generated preview
      await ctx.scheduler.runAfter(
        0,
        internal.previewGeneration.updatePostPreviews,
        { 
          updates: [{ postId, preview }] 
        }
      );
      
      return { success: true, preview };
    } catch (error) {
      console.error(`Failed to generate preview for post ${postId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  },
});
