#!/usr/bin/env npx tsx
/**
 * Batch script to generate previews for all existing posts
 *
 * This script:
 * 1. Fetches all posts without previews
 * 2. Generates concise 2-3 line previews using OpenAI
 * 3. Updates the posts with the generated previews
 *
 * Usage: npx tsx scripts/generate-post-previews.ts
 */

import { ConvexHttpClient } from "convex/browser";
import OpenAI from "openai";
import { api } from "../convex/_generated/api";

// Initialize Convex client
const convexUrl = process.env.CONVEX_URL;
if (!convexUrl) {
  throw new Error("CONVEX_URL environment variable not set");
}
const client = new ConvexHttpClient(convexUrl);

// Initialize OpenAI client
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY environment variable not set");
}
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

/**
 * Generate a preview for a single post using OpenAI
 */
async function generatePreview(title: string, content: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a technical writer creating concise, compelling preview text for AI engineering blog posts. Create a 2-3 line preview that captures the essence of the post and entices readers to learn more. The preview should be informative and engaging, suitable for showing to free users as a teaser.",
        },
        {
          role: "user",
          content: `Generate a 2-3 line preview for this post:\n\nTitle: ${title}\n\nContent: ${content.substring(0, 1000)}...`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const preview = response.choices[0]?.message?.content?.trim();
    if (!preview) {
      throw new Error("No preview generated");
    }

    return preview;
  } catch (error) {
    console.error(`Failed to generate preview for "${title}":`, error);
    // Fallback to simple truncation
    const cleanContent = content.replace(/\n+/g, " ").trim();
    const truncated = cleanContent.substring(0, 150);
    return truncated + (cleanContent.length > 150 ? "..." : "");
  }
}

/**
 * Main function to process all posts
 */
async function main() {
  console.log("Starting preview generation...");

  // Get all posts
  const posts = await client.query(api.posts.getAllPostsForMigration);

  if (!posts) {
    console.error("Failed to fetch posts");
    return;
  }

  const postsNeedingPreviews = posts.filter((post) => !post.preview || post.preview === "");
  console.log(`Found ${postsNeedingPreviews.length} posts needing previews`);

  let successCount = 0;
  let errorCount = 0;

  // Process posts in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < postsNeedingPreviews.length; i += batchSize) {
    const batch = postsNeedingPreviews.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (post) => {
        try {
          console.log(`Generating preview for: ${post.title}`);
          const preview = await generatePreview(post.title, post.content);

          await client.mutation(api.posts.updatePostPreview, {
            postId: post._id,
            preview,
          });

          successCount++;
          console.log(`✓ Generated preview for: ${post.title}`);
        } catch (error) {
          errorCount++;
          console.error(`✗ Failed to process post "${post.title}":`, error);
        }
      }),
    );

    // Rate limit: wait 1 second between batches
    if (i + batchSize < postsNeedingPreviews.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`\nPreview generation complete!`);
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Errors: ${errorCount}`);
}

// Run the script
main().catch(console.error);
