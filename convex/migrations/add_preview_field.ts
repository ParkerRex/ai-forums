import { internalMutation } from "../_generated/server";

/**
 * Migration to add preview and isFree fields to existing posts
 * 
 * This migration:
 * 1. Adds a blank preview field to all existing posts
 * 2. Sets isFree to false for all existing posts (default to paywalled)
 * 
 * The preview field will be populated later by the batch preview generation script
 */
export const addPreviewFieldToPosts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    
    let updatedCount = 0;
    
    for (const post of posts) {
      // Only update if fields are missing
      if (post.preview === undefined || post.isFree === undefined) {
        await ctx.db.patch(post._id, {
          preview: post.preview || "",
          isFree: post.isFree || false,
        });
        updatedCount++;
      }
    }
    
    console.log(`Migration complete: Updated ${updatedCount} posts with preview and isFree fields`);
    
    return { updatedCount };
  },
});

/**
 * Migration to add isFree field to existing resources
 * 
 * Sets all existing resources to paywalled by default (isFree = false)
 */
export const addIsFreeFieldToResources = internalMutation({
  args: {},
  handler: async (ctx) => {
    const resources = await ctx.db.query("resources").collect();
    
    let updatedCount = 0;
    
    for (const resource of resources) {
      // Only update if field is missing
      if (resource.isFree === undefined) {
        await ctx.db.patch(resource._id, {
          isFree: false,
        });
        updatedCount++;
      }
    }
    
    console.log(`Migration complete: Updated ${updatedCount} resources with isFree field`);
    
    return { updatedCount };
  },
});