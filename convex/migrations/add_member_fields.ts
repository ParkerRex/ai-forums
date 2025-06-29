import { internalMutation } from "../_generated/server";

/**
 * Migration to add new member fields:
 * - avatarUrl, websiteUrl, linkedinUrl (optional URLs)
 * - skills (empty array by default)
 * - postCount, commentCount, netVoteCount (null initially, will be computed)
 */
export const addMemberFields = internalMutation({
  handler: async (ctx) => {
    const members = await ctx.db.query("members").collect();
    
    let updateCount = 0;
    
    for (const member of members) {
      // Check if member already has the new fields to avoid re-running
      if (member.skills !== undefined) {
        continue; // Skip if already migrated
      }
      
      await ctx.db.patch(member._id, {
        avatarUrl: undefined, // Will use Clerk image or fallback to initials
        websiteUrl: undefined,
        linkedinUrl: undefined,
        skills: [], // Empty array by default
        postCount: undefined, // Will be computed by stats job
        commentCount: undefined,
        netVoteCount: undefined,
      });
      
      updateCount++;
    }
    
    console.log(`Migration completed: updated ${updateCount} members`);
    return { updatedMembers: updateCount };
  },
}); 