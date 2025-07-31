import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedMember } from "./auth";
import { generateSlug, ensureUniqueSlug } from "../lib/slug-utils";

// Create a new poll post
export const createPollPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    categoryId: v.id("categories"),
    pollOptions: v.array(v.object({
      id: v.string(),
      text: v.string(),
    })),
    pollDuration: v.optional(v.union(
      v.literal("24h"),
      v.literal("3d"),
      v.literal("7d"),
      v.literal("unlimited")
    )),
    preview: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated member
    const member = await getAuthenticatedMember(ctx);

    // Verify category exists and is active
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.status !== "active") {
      throw new Error("Invalid category");
    }

    // Validate poll options
    if (args.pollOptions.length < 2 || args.pollOptions.length > 6) {
      throw new Error("Polls must have between 2 and 6 options");
    }

    // Validate option text length
    for (const option of args.pollOptions) {
      if (option.text.trim().length === 0) {
        throw new Error("Poll options cannot be empty");
      }
      if (option.text.length > 100) {
        throw new Error("Poll options must be 100 characters or less");
      }
    }

    // Calculate poll end time
    let pollEndsAt: number | undefined;
    if (args.pollDuration && args.pollDuration !== "unlimited") {
      const now = Date.now();
      switch (args.pollDuration) {
        case "24h":
          pollEndsAt = now + 24 * 60 * 60 * 1000;
          break;
        case "3d":
          pollEndsAt = now + 3 * 24 * 60 * 60 * 1000;
          break;
        case "7d":
          pollEndsAt = now + 7 * 24 * 60 * 60 * 1000;
          break;
      }
    }

    // Generate unique slug
    const baseSlug = generateSlug(args.title);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_slug")
      .collect();
    const existingSlugs = posts
      .map(p => p.slug)
      .filter((slug): slug is string => slug !== undefined);
    const slug = ensureUniqueSlug(baseSlug, existingSlugs);

    const now = Date.now();

    // Create poll options with initial vote count
    const pollOptionsWithVotes = args.pollOptions.map(option => ({
      ...option,
      voteCount: 0
    }));

    // Create the poll post
    const postId = await ctx.db.insert("posts", {
      title: args.title.trim(),
      content: args.content.trim(),
      slug,
      createdAt: now,
      updatedAt: now,
      memberId: member._id,
      categoryId: args.categoryId,
      status: "active",
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      commentCount: 0,
      viewCount: 0,
      isPinned: false,
      isLocked: false,
      type: "poll",
      pollOptions: pollOptionsWithVotes,
      pollEndsAt,
      totalPollVotes: 0,
      preview: args.preview || "", // Use provided preview or empty string
      isFree: false, // Default to paywalled
    });

    // Update category post count
    await ctx.db.patch(args.categoryId, {
      postCount: (category.postCount || 0) + 1,
      updatedAt: now,
    });

    // Update member post count
    await ctx.db.patch(member._id, {
      postCount: (member.postCount || 0) + 1,
    });

    return { postId, slug };
  },
});

// Vote on a poll
export const voteOnPoll = mutation({
  args: {
    pollId: v.id("posts"),
    optionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get authenticated member
    const member = await getAuthenticatedMember(ctx);

    // Get the poll post
    const post = await ctx.db.get(args.pollId);
    if (!post || post.type !== "poll" || post.status !== "active") {
      throw new Error("Invalid poll");
    }

    // Check if poll has ended
    if (post.pollEndsAt && post.pollEndsAt < Date.now()) {
      throw new Error("Poll has ended");
    }

    // Validate option exists
    const pollOptions = post.pollOptions || [];
    const optionIndex = pollOptions.findIndex(opt => opt.id === args.optionId);
    if (optionIndex === -1) {
      throw new Error("Invalid poll option");
    }

    // Check if user has already voted
    const existingVote = await ctx.db
      .query("pollVotes")
      .withIndex("by_user_and_poll", q => 
        q.eq("userId", member._id).eq("pollId", args.pollId)
      )
      .first();

    // If changing vote, update the vote counts
    if (existingVote) {
      if (existingVote.optionId === args.optionId) {
        // Already voted for this option
        return { success: true, changed: false };
      }

      // Find old option and decrease its count
      const oldOptionIndex = pollOptions.findIndex(opt => opt.id === existingVote.optionId);
      if (oldOptionIndex !== -1) {
        pollOptions[oldOptionIndex].voteCount = Math.max(0, pollOptions[oldOptionIndex].voteCount - 1);
      }

      // Update vote record
      await ctx.db.patch(existingVote._id, {
        optionId: args.optionId,
        votedAt: Date.now(),
      });
    } else {
      // Create new vote record
      await ctx.db.insert("pollVotes", {
        pollId: args.pollId,
        userId: member._id,
        optionId: args.optionId,
        votedAt: Date.now(),
      });
    }

    // Increase new option vote count
    pollOptions[optionIndex].voteCount += 1;

    // Calculate total votes
    const totalVotes = pollOptions.reduce((sum, opt) => sum + opt.voteCount, 0);

    // Update the post with new vote counts
    await ctx.db.patch(args.pollId, {
      pollOptions,
      totalPollVotes: totalVotes,
      updatedAt: Date.now(),
    });

    return { success: true, changed: existingVote ? true : false };
  },
});

// Get poll votes (for viewing voters)
export const getPollVotes = query({
  args: {
    pollId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    // Get the poll post
    const post = await ctx.db.get(args.pollId);
    if (!post || post.type !== "poll") {
      throw new Error("Invalid poll");
    }

    // Get all votes for this poll
    const votes = await ctx.db
      .query("pollVotes")
      .withIndex("by_poll", q => q.eq("pollId", args.pollId))
      .collect();

    // Get member information for each vote
    const votesByOption: Record<string, Array<{
      memberId: Id<"members">;
      firstName: string;
      lastName: string;
      email: string;
      slug: string;
      avatarUrl?: string;
      votedAt: number;
    }>> = {};

    // Initialize empty arrays for each option
    if (post.pollOptions) {
      for (const option of post.pollOptions) {
        votesByOption[option.id] = [];
      }
    }

    // Fetch all member data in parallel
    const memberPromises = votes.map(vote => ctx.db.get(vote.userId));
    const members = await Promise.all(memberPromises);

    // Group votes by option with member info
    votes.forEach((vote, index) => {
      const member = members[index];
      if (member && votesByOption[vote.optionId]) {
        votesByOption[vote.optionId].push({
          memberId: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          slug: member.slug || "",
          avatarUrl: member.avatarUrl,
          votedAt: vote.votedAt,
        });
      }
    });

    // Sort voters by vote time (newest first)
    for (const optionId in votesByOption) {
      votesByOption[optionId].sort((a, b) => b.votedAt - a.votedAt);
    }

    return { votesByOption };
  },
});

// Get poll results with current user's vote
export const getPollResults = query({
  args: {
    pollId: v.id("posts"),
    userId: v.optional(v.id("members")),
  },
  handler: async (ctx, args) => {
    // Get the poll post
    const post = await ctx.db.get(args.pollId);
    if (!post || post.type !== "poll") {
      throw new Error("Invalid poll");
    }

    // Get user's vote if userId provided
    let userVote = null;
    if (args.userId) {
      userVote = await ctx.db
        .query("pollVotes")
        .withIndex("by_user_and_poll", q => 
          q.eq("userId", args.userId!).eq("pollId", args.pollId)
        )
        .first();
    }

    const hasEnded = post.pollEndsAt ? post.pollEndsAt < Date.now() : false;

    return {
      pollOptions: post.pollOptions || [],
      totalVotes: post.totalPollVotes || 0,
      userVotedOptionId: userVote?.optionId || null,
      hasEnded,
      endsAt: post.pollEndsAt,
    };
  },
});