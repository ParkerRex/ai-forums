import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration to remove imported placeholder members and transfer their activity
 * 
 * Removes members with @imported.com emails and transfers their posts/comments
 * to real members with matching names from the CSV
 */

export const removeImportedPlaceholders = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    
    console.log(`🔄 Starting imported placeholder removal (dryRun: ${dryRun})`);
    
    // Get all members
    const allMembers = await ctx.db.query("members").collect();
    console.log(`📊 Total members: ${allMembers.length}`);
    
    // Separate imported vs real members
    const importedMembers = allMembers.filter(m => m.email.includes('@imported.com'));
    const realMembers = allMembers.filter(m => !m.email.includes('@imported.com'));
    
    console.log(`📦 Imported placeholders: ${importedMembers.length}`);
    console.log(`👥 Real members: ${realMembers.length}`);
    
    let transferredCount = 0;
    let removedCount = 0;
    
    // Process each imported member
    for (const importedMember of importedMembers) {
      console.log(`\n🔍 Processing: ${importedMember.firstName} ${importedMember.lastName} (${importedMember.email})`);
      console.log(`   Stats: ${importedMember.postCount || 0} posts, ${importedMember.commentCount || 0} comments`);
      
      // Find matching real member by name
      const matchingReal = realMembers.find(real => 
        real.firstName.toLowerCase().trim() === importedMember.firstName.toLowerCase().trim() &&
        real.lastName.toLowerCase().trim() === importedMember.lastName.toLowerCase().trim()
      );
      
      if (matchingReal) {
        console.log(`✅ Found match: ${matchingReal.firstName} ${matchingReal.lastName} (${matchingReal.email})`);
        
        // Transfer activity from imported to real member
        if (!dryRun) {
          // Update posts
          const posts = await ctx.db
            .query("posts")
            .withIndex("by_authorId", (q) => q.eq("authorId", importedMember._id))
            .collect();
          
          for (const post of posts) {
            await ctx.db.patch(post._id, { authorId: matchingReal._id });
          }
          
          // Update comments  
          const comments = await ctx.db
            .query("comments")
            .withIndex("by_authorId", (q) => q.eq("authorId", importedMember._id))
            .collect();
            
          for (const comment of comments) {
            await ctx.db.patch(comment._id, { authorId: matchingReal._id });
          }
          
          // Update votes
          const votes = await ctx.db
            .query("votes")
            .withIndex("by_userId", (q) => q.eq("userId", importedMember._id))
            .collect();
            
          for (const vote of votes) {
            await ctx.db.patch(vote._id, { userId: matchingReal._id });
          }
          
          // Update real member stats
          const newPostCount = (matchingReal.postCount || 0) + (importedMember.postCount || 0);
          const newCommentCount = (matchingReal.commentCount || 0) + (importedMember.commentCount || 0);
          const newVoteCount = (matchingReal.netVoteCount || 0) + (importedMember.netVoteCount || 0);
          
          await ctx.db.patch(matchingReal._id, {
            postCount: newPostCount,
            commentCount: newCommentCount,
            netVoteCount: newVoteCount,
            status: "active" // Ensure they're active
          });
          
          // Delete the imported placeholder
          await ctx.db.delete(importedMember._id);
        }
        
        console.log(`   ${dryRun ? '[DRY RUN] ' : ''}Transferred ${importedMember.postCount || 0} posts, ${importedMember.commentCount || 0} comments`);
        console.log(`   ${dryRun ? '[DRY RUN] ' : ''}Updated ${matchingReal.firstName} ${matchingReal.lastName} stats`);
        console.log(`   ${dryRun ? '[DRY RUN] ' : ''}Removed imported placeholder`);
        
        transferredCount++;
      } else {
        console.log(`⚠️  No matching real member found for ${importedMember.firstName} ${importedMember.lastName}`);
        
        // If no match, just delete the imported member (they're placeholders)
        if (!dryRun) {
          await ctx.db.delete(importedMember._id);
        }
        console.log(`   ${dryRun ? '[DRY RUN] ' : ''}Removed orphaned imported placeholder`);
      }
      
      removedCount++;
    }
    
    const summary = {
      totalMembers: allMembers.length,
      importedPlaceholders: importedMembers.length,
      realMembers: realMembers.length,
      transferredToReal: transferredCount,
      placeholdersRemoved: removedCount,
      dryRun
    };
    
    console.log(`\n📋 Migration Summary:`, summary);
    return summary;
  },
}); 