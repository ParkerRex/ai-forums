import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration to merge members with same name but different emails
 * 
 * This handles cases where imported members (with @imported.com emails) 
 * have activity but real members (with real emails) should be the canonical records
 */

export const mergeNameDuplicates = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    
    console.log(`🔄 Starting name-based duplicate merge (dryRun: ${dryRun})`);
    
    // Get all members
    const allMembers = await ctx.db.query("members").collect();
    console.log(`📊 Total members: ${allMembers.length}`);
    
    // Group members by name (first + last)
    const membersByName = new Map<string, typeof allMembers>();
    allMembers.forEach(member => {
      const name = `${member.firstName.toLowerCase().trim()} ${member.lastName.toLowerCase().trim()}`;
      if (!membersByName.has(name)) {
        membersByName.set(name, []);
      }
      membersByName.get(name)!.push(member);
    });
    
    let mergedCount = 0;
    let duplicateGroupsFound = 0;
    
    // Find groups with duplicates
    for (const [name, members] of membersByName.entries()) {
      if (members.length <= 1) continue;
      
      duplicateGroupsFound++;
      console.log(`\n🔀 Found ${members.length} members named "${name}"`);
      
      // Sort members: prefer real emails over @imported.com
      members.sort((a, b) => {
        const aIsImported = a.email.includes('@imported.com');
        const bIsImported = b.email.includes('@imported.com');
        
        if (aIsImported && !bIsImported) return 1;  // b first (real email)
        if (!aIsImported && bIsImported) return -1; // a first (real email)
        
        // If both same type, prefer higher activity
        const aActivity = (a.postCount || 0) + (a.commentCount || 0);
        const bActivity = (b.postCount || 0) + (b.commentCount || 0);
        return bActivity - aActivity;
      });
      
      const canonicalMember = members[0];
      const duplicateMembers = members.slice(1);
      
      console.log(`✅ Canonical: ${canonicalMember.firstName} ${canonicalMember.lastName} (${canonicalMember.email})`);
      console.log(`   Stats: ${canonicalMember.postCount || 0} posts, ${canonicalMember.commentCount || 0} comments`);
      
      // Calculate total stats from all duplicates
      let totalPosts = canonicalMember.postCount || 0;
      let totalComments = canonicalMember.commentCount || 0;
      let totalVotes = canonicalMember.netVoteCount || 0;
      
      for (const duplicate of duplicateMembers) {
        console.log(`🔄 Duplicate: ${duplicate.firstName} ${duplicate.lastName} (${duplicate.email})`);
        console.log(`   Stats: ${duplicate.postCount || 0} posts, ${duplicate.commentCount || 0} comments`);
        
        totalPosts += duplicate.postCount || 0;
        totalComments += duplicate.commentCount || 0;
        totalVotes += duplicate.netVoteCount || 0;
        
        // Re-wire foreign keys from duplicate to canonical
        if (!dryRun) {
          // Update posts
          const posts = await ctx.db
            .query("posts")
            .withIndex("by_authorId", (q) => q.eq("authorId", duplicate._id))
            .collect();
          
          for (const post of posts) {
            await ctx.db.patch(post._id, { authorId: canonicalMember._id });
          }
          
          // Update comments  
          const comments = await ctx.db
            .query("comments")
            .withIndex("by_authorId", (q) => q.eq("authorId", duplicate._id))
            .collect();
            
          for (const comment of comments) {
            await ctx.db.patch(comment._id, { authorId: canonicalMember._id });
          }
          
          // Update votes
          const votes = await ctx.db
            .query("votes")
            .withIndex("by_userId", (q) => q.eq("userId", duplicate._id))
            .collect();
            
          for (const vote of votes) {
            await ctx.db.patch(vote._id, { userId: canonicalMember._id });
          }
          
          // Mark duplicate as merged
          await ctx.db.patch(duplicate._id, {
            status: "duplicate",
            mergedInto: canonicalMember._id
          });
        }
        
        console.log(`   ${dryRun ? '[DRY RUN] ' : ''}Re-wired ${duplicate.postCount || 0} posts, ${duplicate.commentCount || 0} comments`);
      }
      
      // Update canonical member with combined stats
      if (!dryRun) {
        await ctx.db.patch(canonicalMember._id, {
          postCount: totalPosts,
          commentCount: totalComments,
          netVoteCount: totalVotes,
          status: "active" // Ensure canonical member is active
        });
      }
      
      console.log(`   ${dryRun ? '[DRY RUN] ' : ''}Updated canonical member with combined stats: ${totalPosts} posts, ${totalComments} comments, ${totalVotes} votes`);
      mergedCount++;
    }
    
    const summary = {
      totalMembers: allMembers.length,
      duplicateGroupsFound,
      groupsMerged: mergedCount,
      dryRun
    };
    
    console.log(`\n📋 Migration Summary:`, summary);
    return summary;
  },
}); 