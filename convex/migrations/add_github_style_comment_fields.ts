/**
 * Migration: Add GitHub-style comment fields
 * 
 * This migration adds new fields to support GitHub-style flat comment display:
 * - replyToMemberId: Member being replied to (for flat display)
 * - replyToCommentId: Comment being replied to (for context)
 * 
 * These fields enable displaying comments in a flat chronological list
 * while still showing reply context, similar to GitHub's comment system.
 */

import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const addGitHubStyleCommentFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const comments = await ctx.db.query("comments").collect();
    
    let updated = 0;
    let skipped = 0;
    
    for (const comment of comments) {
      // Skip if fields already exist
      if ('replyToMemberId' in comment && 'replyToCommentId' in comment) {
        skipped++;
        continue;
      }
      
      // If this comment has a parent, get the parent's author info
      let replyToMemberId: Id<"members"> | undefined = undefined;
      let replyToCommentId: Id<"comments"> | undefined = undefined;
      
      if (comment.parentCommentId) {
        const parentComment = await ctx.db.get(comment.parentCommentId);
        if (parentComment) {
          replyToMemberId = parentComment.memberId;
          replyToCommentId = comment.parentCommentId;
        }
      }
      
      // Update the comment with new fields
      await ctx.db.patch(comment._id, {
        replyToMemberId,
        replyToCommentId,
      });
      
      updated++;
    }
    
    console.log(`Migration complete: ${updated} comments updated, ${skipped} skipped`);
    
    return {
      success: true,
      updated,
      skipped,
      total: comments.length,
    };
  },
});