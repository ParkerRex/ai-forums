import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

/**
 * Migration to create Clerk accounts for legacy members without externalId.
 * This processes members who joined before the Clerk integration.
 *
 * Implements rate limiting to respect Clerk's API limits (20 req/10s).
 * Processes in chunks of 10 with delays between batches.
 */
export default internalMutation({
  args: {
    limit: v.optional(v.number()), // Number of members to process in this run
    startAfter: v.optional(v.id("members")), // Resume from this member ID
  },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 10; // Process 10 members per run
    const limit = args.limit || BATCH_SIZE;
    console.log(
      `Starting migration batch: limit=${limit}, startAfter=${args.startAfter || "beginning"}`,
    );

    // Build query for members
    let allMembers;

    // If resuming, start after the given ID
    if (args.startAfter) {
      const startMember = await ctx.db.get(args.startAfter);
      if (startMember) {
        // Use joinedDate to order consistently
        allMembers = await ctx.db
          .query("members")
          .withIndex("by_joinedDate")
          .filter((q) => q.gt(q.field("joinedDate"), startMember.joinedDate))
          .collect();
      } else {
        allMembers = await ctx.db.query("members").withIndex("by_joinedDate").collect();
      }
    } else {
      allMembers = await ctx.db.query("members").withIndex("by_joinedDate").collect();
    }

    // Filter for those without externalId
    const legacyMembers = allMembers.filter((member) => !member.externalId).slice(0, limit);

    console.log(`Found ${legacyMembers.length} legacy members in this batch`);

    if (legacyMembers.length === 0) {
      console.log("No more legacy members found. Migration complete.");
      return {
        processed: 0,
        errors: [],
        hasMore: false,
        lastProcessedId: null,
      };
    }

    const errors: Array<{ memberId: string; email: string; error: string }> = [];
    let processed = 0;

    // Process each legacy member with rate limiting
    for (let i = 0; i < legacyMembers.length; i++) {
      const member = legacyMembers[i];

      try {
        console.log(
          `Processing member ${i + 1}/${legacyMembers.length}: ${member.email} (${member._id})`,
        );

        // Schedule the Clerk account creation via the existing internal action
        // Add delay to respect rate limits (20 requests per 10 seconds)
        const delay = Math.floor(i / 10) * 10000; // 10 second delay after every 10 requests

        await ctx.scheduler.runAfter(delay, internal.auth.clerkAccounts.createClerkAccount, {
          email: member.email,
          memberId: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          checkoutSessionId: "migration", // Special identifier for migration-created accounts
        });

        processed++;
        console.log(`✓ Scheduled Clerk account creation for ${member.email} (delay: ${delay}ms)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`✗ Failed to schedule account creation for ${member.email}:`, errorMessage);
        errors.push({
          memberId: member._id,
          email: member.email,
          error: errorMessage,
        });
      }
    }

    // Check if there might be more members to process
    const lastMember = legacyMembers[legacyMembers.length - 1];
    const remainingMembers = await ctx.db
      .query("members")
      .withIndex("by_joinedDate")
      .filter((q) => q.gt(q.field("joinedDate"), lastMember.joinedDate))
      .collect();

    const hasMore = remainingMembers.some((member) => !member.externalId);

    // If there are more members, schedule the next batch
    if (hasMore && processed > 0) {
      const nextDelay = Math.ceil(legacyMembers.length / 10) * 10000 + 1000; // Wait for rate limit window
      console.log(`Scheduling next batch in ${nextDelay}ms...`);

      await ctx.scheduler.runAfter(
        nextDelay,
        internal.migrations.create_clerk_accounts_for_legacy_members.default,
        {
          limit,
          startAfter: lastMember._id,
        },
      );
    }

    const summary = {
      processed,
      errors,
      batchSize: legacyMembers.length,
      hasMore,
      lastProcessedId: lastMember?._id || null,
    };

    console.log("Batch summary:", summary);

    return summary;
  },
});
