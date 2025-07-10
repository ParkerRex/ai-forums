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

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

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
const generateSinglePreview = async (title: string, content: string): Promise<string> => {
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
    .replace(/[#*_~`]/g, '') // Remove markdown formatting
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to plain text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
    .trim();

  try {
    // Generate preview using GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that creates concise post previews. 
Generate a 2-3 line preview (maximum 280 characters) that captures the essence of the post. 
The preview should be engaging and informative, giving readers a clear idea of what the post is about.
Do not use quotes or mention that this is a preview. Write in a natural, descriptive style.`
        },
        {
          role: "user",
          content: `Generate a preview for this post:

Title: ${title}

Content: ${cleanContent.substring(0, 1000)}` // Limit content length for API
        }
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
      let truncated = '';
      for (const sentence of sentences) {
        if ((truncated + sentence).length <= 277) { // Leave room for "..."
          truncated += sentence;
        } else {
          break;
        }
      }
      return truncated.trim() + (truncated.length < preview.length ? '...' : '');
    }

    return preview;
  } catch (error) {
    console.error("Error generating preview:", error);
    
    // Fallback to simple content extraction if API fails
    const fallbackPreview = cleanContent
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 2)
      .join(' ')
      .substring(0, 280);
    
    return fallbackPreview || `${title}. Read more to discover the full content.`;
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
    posts: v.array(v.object({
      id: v.string(),
      title: v.string(),
      content: v.string(),
    })),
  },
  handler: async (ctx, { posts }) => {
    const results: Array<{
      id: string;
      preview: string | null;
      success: boolean;
      error?: string;
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
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
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
    
    return results;
  },
});