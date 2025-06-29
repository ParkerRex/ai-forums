import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration to merge duplicate members with the same email
 * 
 * This addresses the bug where comment imports created multiple member docs
 * for the same email, causing stats to be split across different records.
 * 
 * Strategy:
 * 1. Group members by email
 * 2. For each email group with duplicates, pick the one with highest activity
 * 3. Re-wire all foreign keys (posts, comments, votes) to point to the keeper
 * 4. Mark duplicates with status "duplicate" and set mergedInto field
 */
export const mergeDuplicateMembers = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const results = {
      emailsWithDuplicates: 0,
      totalDuplicatesFound: 0,
      duplicatesMarked: 0,
      postsRelinked: 0,
      commentsRelinked: 0,
      votesRelinked: 0,
    };

    console.log(`Starting duplicate member merge (dryRun: ${dryRun})`);

    // Get all members
    const allMembers = await ctx.db.query("members").collect();
    
    // Group by email
    const membersByEmail = new Map<string, typeof allMembers>();
    for (const member of allMembers) {
      const email = member.email.toLowerCase();
      if (!membersByEmail.has(email)) {
        membersByEmail.set(email, []);
      }
      membersByEmail.get(email)!.push(member);
    }

    // Process emails with duplicates
    for (const [email, members] of membersByEmail.entries()) {
      if (members.length <= 1) continue;

      results.emailsWithDuplicates++;
      results.totalDuplicatesFound += members.length - 1;

      console.log(`Processing ${members.length} duplicates for email: ${email}`);

      // Calculate activity score for each member to pick the best keeper
      const membersWithActivity = await Promise.all(
        members.map(async (member) => {
          const [posts, comments, votes] = await Promise.all([
            ctx.db
              .query("posts")
              .withIndex("by_authorId", (q) => q.eq("authorId", member._id))
              .collect(),
            ctx.db
              .query("comments")
              .withIndex("by_authorId", (q) => q.eq("authorId", member._id))
              .collect(),
            ctx.db
              .query("votes")
              .withIndex("by_userId", (q) => q.eq("userId", member._id))
              .collect(),
          ]);

          const activityScore = posts.length + comments.length + votes.length;
          return {
            member,
            posts,
            comments,
            votes,
            activityScore,
          };
        })
      );

      // Sort by activity score (highest first), then by joinedDate (earliest first)
      membersWithActivity.sort((a, b) => {
        if (a.activityScore !== b.activityScore) {
          return b.activityScore - a.activityScore;
        }
        return a.member.joinedDate - b.member.joinedDate;
      });

      const keeper = membersWithActivity[0];
      const duplicates = membersWithActivity.slice(1);

      console.log(
        `  Keeping member ${keeper.member._id} (activity: ${keeper.activityScore})`
      );

      // Re-wire foreign keys for each duplicate
      for (const duplicate of duplicates) {
        console.log(
          `  Processing duplicate ${duplicate.member._id} (activity: ${duplicate.activityScore})`
        );

        // Update posts authored by this duplicate
        for (const post of duplicate.posts) {
          if (!dryRun) {
            await ctx.db.patch(post._id, { authorId: keeper.member._id });
          }
          results.postsRelinked++;
        }

        // Update comments authored by this duplicate
        for (const comment of duplicate.comments) {
          if (!dryRun) {
            await ctx.db.patch(comment._id, { authorId: keeper.member._id });
          }
          results.commentsRelinked++;
        }

        // Update votes by this duplicate
        for (const vote of duplicate.votes) {
          if (!dryRun) {
            await ctx.db.patch(vote._id, { userId: keeper.member._id });
          }
          results.votesRelinked++;
        }

        // Mark duplicate member as merged
        if (!dryRun) {
          await ctx.db.patch(duplicate.member._id, {
            status: "duplicate" as const,
            mergedInto: keeper.member._id,
            updatedAt: Date.now(),
          });
        }
        results.duplicatesMarked++;
      }
    }

    console.log("Migration completed:", results);
    return results;
  },
});

/**
 * Query to check for duplicate members (for debugging)
 */
export const checkDuplicateMembers = internalMutation({
  handler: async (ctx) => {
    const allMembers = await ctx.db.query("members").collect();
    
    const membersByEmail = new Map<string, number>();
    const duplicates: Array<{ email: string; count: number; memberIds: string[] }> = [];

    for (const member of allMembers) {
      const email = member.email.toLowerCase();
      const count = (membersByEmail.get(email) || 0) + 1;
      membersByEmail.set(email, count);
    }

    for (const [email, count] of membersByEmail.entries()) {
      if (count > 1) {
        const memberIds = allMembers
          .filter(m => m.email.toLowerCase() === email)
          .map(m => m._id);
        duplicates.push({ email, count, memberIds });
      }
    }

    return {
      totalMembers: allMembers.length,
      uniqueEmails: membersByEmail.size,
      duplicateEmails: duplicates.length,
      duplicates: duplicates.slice(0, 10), // First 10 for debugging
    };
  },
}); 