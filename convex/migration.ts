import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { generateMemberSlug } from "../lib/slug-utils";

/**
 * Import a single post from Skool migration data
 */
export const importSkoolPost = mutation({
  args: {
    externalId: v.string(),
    title: v.string(),
    content: v.string(),
    authorEmail: v.string(),
    authorFirstName: v.string(),
    authorLastName: v.string(),
    category: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    upvoteCount: v.optional(v.number()),
    viewCount: v.optional(v.number()),
    commentCount: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
    videoLinks: v.optional(v.string()),
    imagePreview: v.optional(v.string()),
    originalData: v.optional(v.object({
      skoolId: v.string(),
      skoolTitle: v.optional(v.string()),
      skoolName: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    // Find or create the author (member) - using firstName search since no email index
    let member = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), args.authorEmail))
      .first();

    if (!member) {
      // Create the member if they don't exist
      // Generate unique slug for the member
      const fullName = `${args.authorFirstName} ${args.authorLastName}`;
      const baseSlug = generateMemberSlug(fullName);
      
      // Ensure uniqueness by checking existing slugs
      let uniqueSlug = baseSlug;
      let counter = 2;
      const existingSlugs = await ctx.db.query("members").collect();
      const usedSlugs = new Set(existingSlugs.map(m => m.slug));
      
      while (usedSlugs.has(uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      const memberId = await ctx.db.insert("members", {
        email: args.authorEmail,
        firstName: args.authorFirstName,
        lastName: args.authorLastName,
        joinedDate: args.createdAt, // Use joinedDate instead of joinedAt
        // Default values for required fields
        status: "active",
        updatedAt: args.createdAt,
        lastOnline: args.createdAt,
        slug: uniqueSlug,
      });

      member = await ctx.db.get(memberId);
      if (!member) {
        throw new Error("Failed to create member");
      }
    }

    // Find the category
    const category = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", args.category))
      .first();

    if (!category) {
      throw new Error(`Category "${args.category}" not found`);
    }

    // Check if post already exists (by title and author - no externalId field in schema)
    const existingPost = await ctx.db
      .query("posts")
      .filter((q) =>
        q.and(
          q.eq(q.field("title"), args.title),
          q.eq(q.field("authorId"), member._id)
        )
      )
      .first();

    if (existingPost) {
      console.log(`Post "${args.title}" by ${args.authorFirstName} already exists, skipping`);
      return existingPost._id;
    }

    // Generate slug from title
    const baseSlug = args.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60)
      .replace(/-+$/, '');

    // Create the post using schema field names
    const postId = await ctx.db.insert("posts", {
      title: args.title,
      content: args.content,
      slug: baseSlug,
      authorId: member._id,
      categoryId: category._id,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      status: "active",
      upvotes: args.upvoteCount || 0,
      downvotes: 0,
      netVotes: args.upvoteCount || 0,
      commentCount: args.commentCount || 0,
      viewCount: args.viewCount || 0,
      isPinned: args.isPinned || false,
    });

    return postId;
  },
});

/**
 * Get import statistics
 */
export const getImportStats = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    const members = await ctx.db.query("members").collect();

    return {
      totalPosts: posts.length,
      totalMembers: members.length,
      activePosts: posts.filter(p => p.status === "active").length,
      activeMembers: members.filter(m => m.status === "active").length
    };
  },
});

/**
 * Clear all posts (for testing)
 */
export const clearAllPosts = mutation({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();

    for (const post of posts) {
      await ctx.db.delete(post._id);
    }

    return { deletedCount: posts.length };
  },
});

// Note: Batch import can be implemented later if needed
// For now, use individual imports to avoid complexity 

// Phase 1: Data Deduplication & Cleanup

// Query to identify duplicate posts (same title + timestamp)
export const identifyDuplicatePosts = query({
  handler: async (ctx) => {
    const allPosts = await ctx.db.query("posts").collect();
    
    // Group posts by title + timestamp
    const postGroups = new Map<string, typeof allPosts>();
    
    allPosts.forEach(post => {
      const key = `${post.title}_${post.createdAt}`;
      if (!postGroups.has(key)) {
        postGroups.set(key, []);
      }
      postGroups.get(key)!.push(post);
    });
    
    // Find groups with duplicates
    type DuplicateGroup = {
      key: string;
      keeper: {
        id: Id<"posts">;
        title: string;
        createdAt: string;
        commentCount: number;
        upvotes: number;
      };
      duplicates: Array<{
        id: Id<"posts">;
        commentCount: number;
        upvotes: number;
      }>;
    };
    const duplicateGroups: DuplicateGroup[] = [];
    let totalDuplicates = 0;
    
    postGroups.forEach((posts, key) => {
      if (posts.length > 1) {
        // Sort by _id to keep the first one (earliest convexId)
        const sorted = posts.sort((a, b) => a._id.localeCompare(b._id));
        const keeper = sorted[0];
        const duplicates = sorted.slice(1);
        
        totalDuplicates += duplicates.length;
        
        duplicateGroups.push({
          key,
          keeper: {
            id: keeper._id,
            title: keeper.title,
            createdAt: new Date(keeper.createdAt).toISOString(),
            commentCount: keeper.commentCount,
            upvotes: keeper.upvotes
          },
          duplicates: duplicates.map(d => ({
            id: d._id,
            commentCount: d.commentCount,
            upvotes: d.upvotes
          }))
        });
      }
    });
    
    return {
      totalPosts: allPosts.length,
      uniquePosts: postGroups.size,
      duplicateGroups: duplicateGroups.length,
      totalDuplicates,
      groups: duplicateGroups.slice(0, 10) // Show first 10 groups
    };
  },
});

// Mutation to merge duplicates (transfer comments/votes to keeper)
export const mergeDuplicatePosts = mutation({
  args: {
    keeperId: v.id("posts"),
    duplicateIds: v.array(v.id("posts")),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { keeperId, duplicateIds, dryRun = false }) => {
    const keeper = await ctx.db.get(keeperId);
    if (!keeper) {
      throw new Error(`Keeper post ${keeperId} not found`);
    }
    
    const results = {
      commentsTransferred: 0,
      votesTransferred: 0,
      errors: [] as string[],
    };
    
    for (const duplicateId of duplicateIds) {
      const duplicate = await ctx.db.get(duplicateId);
      if (!duplicate) {
        results.errors.push(`Duplicate post ${duplicateId} not found`);
        continue;
      }
      
      // Transfer comments
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_postId", q => q.eq("postId", duplicateId))
        .collect();
      
      for (const comment of comments) {
        if (!dryRun) {
          await ctx.db.patch(comment._id, { postId: keeperId });
        }
        results.commentsTransferred++;
      }
      
      // Transfer votes (need to check for duplicates)
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_targetId", q => q.eq("targetId", duplicateId))
        .filter(q => q.eq(q.field("targetType"), "post"))
        .collect();
      
      for (const vote of votes) {
        // Check if user already voted on keeper post
        const existingVote = await ctx.db
          .query("votes")
          .withIndex("by_user_and_target", q => 
            q.eq("userId", vote.userId)
             .eq("targetId", keeperId)
             .eq("targetType", "post")
          )
          .first();
        
        if (!existingVote && !dryRun) {
          await ctx.db.patch(vote._id, { targetId: keeperId });
          results.votesTransferred++;
        } else if (existingVote && !dryRun) {
          // Remove duplicate vote
          await ctx.db.delete(vote._id);
        }
      }
    }
    
    // Update keeper's comment count
    if (!dryRun) {
      const finalCommentCount = await ctx.db
        .query("comments")
        .withIndex("by_postId", q => q.eq("postId", keeperId))
        .collect();
      
      await ctx.db.patch(keeperId, {
        commentCount: finalCommentCount.length,
        updatedAt: Date.now(),
      });
    }
    
    return results;
  },
});

// Mutation to delete duplicate posts after merging
export const deleteDuplicatePosts = mutation({
  args: {
    duplicateIds: v.array(v.id("posts")),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { duplicateIds, dryRun = false }) => {
    const results = {
      deleted: 0,
      errors: [] as string[],
    };
    
    for (const duplicateId of duplicateIds) {
      const post = await ctx.db.get(duplicateId);
      if (!post) {
        results.errors.push(`Post ${duplicateId} not found`);
        continue;
      }
      
      // Verify no comments remain
      const remainingComments = await ctx.db
        .query("comments")
        .withIndex("by_postId", q => q.eq("postId", duplicateId))
        .collect();
      
      if (remainingComments.length > 0) {
        results.errors.push(`Post ${duplicateId} still has ${remainingComments.length} comments`);
        continue;
      }
      
      if (!dryRun) {
        await ctx.db.delete(duplicateId);
        results.deleted++;
      } else {
        results.deleted++; // Count what would be deleted
      }
    }
    
    return results;
  },
});

// Query to identify duplicate comments
export const identifyDuplicateComments = query({
  handler: async (ctx) => {
    const allComments = await ctx.db.query("comments").take(1000);
    
    // Group by content + timestamp + postId
    const commentGroups = new Map<string, typeof allComments>();
    
    allComments.forEach(comment => {
      const key = `${comment.postId}_${comment.createdAt}_${comment.content.substring(0, 100)}`;
      if (!commentGroups.has(key)) {
        commentGroups.set(key, []);
      }
      commentGroups.get(key)!.push(comment);
    });
    
    // Find duplicates
    type CommentDuplicateGroup = {
      keeper: {
        id: Id<"comments">;
        content: string;
        createdAt: string;
      };
      duplicates: Array<{ id: Id<"comments"> }>;
      count: number;
    };
    const duplicateGroups: CommentDuplicateGroup[] = [];
    let totalDuplicates = 0;
    
    commentGroups.forEach((comments) => {
      if (comments.length > 1) {
        const sorted = comments.sort((a, b) => a._id.localeCompare(b._id));
        const keeper = sorted[0];
        const duplicates = sorted.slice(1);
        
        totalDuplicates += duplicates.length;
        
        duplicateGroups.push({
          keeper: {
            id: keeper._id,
            content: keeper.content.substring(0, 50) + "...",
            createdAt: new Date(keeper.createdAt).toISOString(),
          },
          duplicates: duplicates.map(d => ({ id: d._id })),
          count: comments.length,
        });
      }
    });
    
    return {
      totalChecked: allComments.length,
      duplicateGroups: duplicateGroups.length,
      totalDuplicates,
      samples: duplicateGroups.slice(0, 10),
    };
  },
});

// Mutation to delete duplicate comments
export const deleteDuplicateComments = mutation({
  args: {
    duplicateIds: v.array(v.id("comments")),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { duplicateIds, dryRun = false }) => {
    const results = {
      deleted: 0,
      postsUpdated: new Set<Id<"posts">>(),
      errors: [] as string[],
    };
    
    for (const duplicateId of duplicateIds) {
      const comment = await ctx.db.get(duplicateId);
      if (!comment) {
        results.errors.push(`Comment ${duplicateId} not found`);
        continue;
      }
      
      if (!dryRun) {
        await ctx.db.delete(duplicateId);
        results.postsUpdated.add(comment.postId);
      }
      results.deleted++;
    }
    
    // Update post comment counts
    if (!dryRun) {
      for (const postId of results.postsUpdated) {
        const post = await ctx.db.get(postId);
        if (post) {
          const actualCount = await ctx.db
            .query("comments")
            .withIndex("by_postId", q => q.eq("postId", postId))
            .collect();
          
          await ctx.db.patch(postId, {
            commentCount: actualCount.length,
            updatedAt: Date.now(),
          });
        }
      }
    }
    
    return {
      deleted: results.deleted,
      postsUpdated: results.postsUpdated.size,
      errors: results.errors,
    };
  },
});

// Mutation to clean up orphaned votes and views
export const cleanupOrphanedData = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { dryRun = false }) => {
    const results = {
      orphanedVotes: 0,
      orphanedViews: 0,
      errors: [] as string[],
    };
    
    // Clean up votes for non-existent posts
    const postVotes = await ctx.db
      .query("votes")
      .filter(q => q.eq(q.field("targetType"), "post"))
      .take(1000);
    
    for (const vote of postVotes) {
      const post = await ctx.db.get(vote.targetId as Id<"posts">);
      if (!post && !dryRun) {
        await ctx.db.delete(vote._id);
        results.orphanedVotes++;
      } else if (!post) {
        results.orphanedVotes++;
      }
    }
    
    // Clean up votes for non-existent comments
    const commentVotes = await ctx.db
      .query("votes")
      .filter(q => q.eq(q.field("targetType"), "comment"))
      .take(1000);
    
    for (const vote of commentVotes) {
      const comment = await ctx.db.get(vote.targetId as Id<"comments">);
      if (!comment && !dryRun) {
        await ctx.db.delete(vote._id);
        results.orphanedVotes++;
      } else if (!comment) {
        results.orphanedVotes++;
      }
    }
    
    // Clean up views for non-existent posts
    const views = await ctx.db.query("postViews").take(1000);
    
    for (const view of views) {
      const post = await ctx.db.get(view.postId);
      if (!post && !dryRun) {
        await ctx.db.delete(view._id);
        results.orphanedViews++;
      } else if (!post) {
        results.orphanedViews++;
      }
    }
    
    return results;
  },
});

// Main deduplication workflow
export const runDeduplication = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { dryRun = true }) => {
    // This would typically be run in steps, but showing the workflow
    console.log(`Starting deduplication process (dryRun: ${dryRun})`);
    
    // Step 1: Identify duplicates
    // Step 2: Merge duplicates
    // Step 3: Delete duplicates
    // Step 4: Clean up orphaned data
    
    return {
      message: "Deduplication workflow ready. Run individual functions to process.",
      dryRun,
    };
  },
});

// Batch process all duplicate posts
export const processDuplicatePosts = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { dryRun = true, batchSize = 10 }) => {
    const allPosts = await ctx.db.query("posts").collect();
    
    // Group posts by title + timestamp
    const postGroups = new Map<string, typeof allPosts>();
    
    allPosts.forEach(post => {
      const key = `${post.title}_${post.createdAt}`;
      if (!postGroups.has(key)) {
        postGroups.set(key, []);
      }
      postGroups.get(key)!.push(post);
    });
    
    // Process duplicates
    const results = {
      processed: 0,
      merged: 0,
      deleted: 0,
      errors: [] as string[],
    };
    
    let batchCount = 0;
    
    for (const [key, posts] of postGroups) {
      if (posts.length > 1) {
        if (batchCount >= batchSize) {
          console.log(`Reached batch size limit of ${batchSize}`);
          break;
        }
        
        // Sort by _id to keep the first one (earliest convexId)
        const sorted = posts.sort((a, b) => a._id.localeCompare(b._id));
        const keeper = sorted[0];
        const duplicates = sorted.slice(1);
        
        console.log(`Processing duplicate group: ${key}`);
        console.log(`  Keeper: ${keeper._id} (${keeper.commentCount} comments)`);
        console.log(`  Duplicates: ${duplicates.map(d => `${d._id} (${d.commentCount} comments)`).join(', ')}`);
        
        // Step 1: Transfer comments and votes
        for (const duplicate of duplicates) {
          // Transfer comments
          const comments = await ctx.db
            .query("comments")
            .withIndex("by_postId", q => q.eq("postId", duplicate._id))
            .collect();
          
          console.log(`  Transferring ${comments.length} comments from ${duplicate._id} to ${keeper._id}`);
          
          for (const comment of comments) {
            if (!dryRun) {
              await ctx.db.patch(comment._id, { postId: keeper._id });
            }
          }
          
          results.merged++;
        }
        
        // Step 2: Update keeper's comment count
        if (!dryRun) {
          const finalComments = await ctx.db
            .query("comments")
            .withIndex("by_postId", q => q.eq("postId", keeper._id))
            .collect();
          
          await ctx.db.patch(keeper._id, {
            commentCount: finalComments.length,
            updatedAt: Date.now(),
          });
        }
        
        // Step 3: Delete duplicates
        for (const duplicate of duplicates) {
          if (!dryRun) {
            await ctx.db.delete(duplicate._id);
          }
          results.deleted++;
        }
        
        results.processed++;
        batchCount++;
      }
    }
    
    return {
      ...results,
      totalGroups: postGroups.size,
      duplicateGroups: Array.from(postGroups.values()).filter(posts => posts.length > 1).length,
      dryRun,
    };
  },
});

// Batch process all duplicate comments
export const processDuplicateComments = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { dryRun = true, limit = 1000 }) => {
    const allComments = await ctx.db.query("comments").take(limit);
    
    // Group by content + timestamp + postId
    const commentGroups = new Map<string, typeof allComments>();
    
    allComments.forEach(comment => {
      const key = `${comment.postId}_${comment.createdAt}_${comment.content.substring(0, 100)}`;
      if (!commentGroups.has(key)) {
        commentGroups.set(key, []);
      }
      commentGroups.get(key)!.push(comment);
    });
    
    // Process duplicates
    const results = {
      processed: 0,
      deleted: 0,
      postsUpdated: new Set<Id<"posts">>(),
    };
    
    commentGroups.forEach((comments) => {
      if (comments.length > 1) {
        const sorted = comments.sort((a, b) => a._id.localeCompare(b._id));
        const keeper = sorted[0];
        const duplicates = sorted.slice(1);
        
        console.log(`Deleting ${duplicates.length} duplicate comments (keeping ${keeper._id})`);
        
        for (const duplicate of duplicates) {
          if (!dryRun) {
            ctx.db.delete(duplicate._id);
            results.postsUpdated.add(duplicate.postId);
          }
          results.deleted++;
        }
        
        results.processed++;
      }
    });
    
    // Update post comment counts
    if (!dryRun) {
      for (const postId of results.postsUpdated) {
        const post = await ctx.db.get(postId);
        if (post) {
          const actualCount = await ctx.db
            .query("comments")
            .withIndex("by_postId", q => q.eq("postId", postId))
            .collect();
          
          await ctx.db.patch(postId, {
            commentCount: actualCount.length,
            updatedAt: Date.now(),
          });
        }
      }
    }
    
    return {
      totalChecked: allComments.length,
      duplicateGroups: results.processed,
      deleted: results.deleted,
      postsUpdated: results.postsUpdated.size,
      dryRun,
    };
  },
});

// Phase 2: Comment Threading Reconstruction

/**
 * Parse @mentions from comment content to identify potential parent comments
 */
export const parseCommentMentions = query({
  args: {
    commentId: v.optional(v.id("comments")),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { commentId, limit = 10 }) => {
    let comments;
    
    if (commentId) {
      const comment = await ctx.db.get(commentId);
      comments = comment ? [comment] : [];
    } else {
      comments = await ctx.db.query("comments")
        .filter((q) => q.eq(q.field("status"), "active"))
        .take(limit);
    }
    
    const mentionAnalysis = [];
    
    for (const comment of comments) {
             // Extract @mentions using regex - capture just the name part
       const mentionRegex = /@([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s|$|[^A-Za-z])/g;
      const mentions = [];
      let match;
      
      while ((match = mentionRegex.exec(comment.content)) !== null) {
        const mentionText = match[1].trim();
        mentions.push(mentionText);
      }
      
             // Find potential parent comments in the same post
       const potentialParents = [];
       if (mentions.length > 0) {
        // Get all comments in the same post before this comment
        const postComments = await ctx.db
          .query("comments")
          .withIndex("by_post_and_createdAt", (q) => 
            q.eq("postId", comment.postId)
          )
          .filter((q) => 
            q.and(
              q.eq(q.field("status"), "active"),
              q.lt(q.field("createdAt"), comment.createdAt)
            )
          )
          .collect();
        
        // Check each mention against comment authors
        for (const mention of mentions) {
          for (const postComment of postComments) {
            const author = await ctx.db.get(postComment.authorId);
            if (author) {
              const fullName = `${author.firstName} ${author.lastName}`.toLowerCase();
              const firstName = author.firstName.toLowerCase();
              const lastName = author.lastName.toLowerCase();
              const mentionLower = mention.toLowerCase();
              
              // Match against various name patterns
              if (
                fullName.includes(mentionLower) ||
                firstName.includes(mentionLower) ||
                lastName.includes(mentionLower) ||
                mentionLower.includes(firstName) ||
                mentionLower.includes(lastName)
              ) {
                potentialParents.push({
                  commentId: postComment._id,
                  authorName: `${author.firstName} ${author.lastName}`,
                  matchedMention: mention,
                  confidence: fullName === mentionLower ? 'high' : 'medium'
                });
              }
            }
          }
        }
      }
      
      mentionAnalysis.push({
        commentId: comment._id,
        content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
        mentions,
        potentialParents,
        currentParentId: comment.parentCommentId
      });
    }
    
    return mentionAnalysis;
  }
});

/**
 * Find the best parent comment for a given comment based on @mentions
 */
export const findParentComment = query({
  args: {
    commentId: v.id("comments")
  },
     handler: async (ctx, { commentId }) => {
     const comment = await ctx.db.get(commentId);
     if (!comment) return null;
     
     // Extract @mentions - capture just the name part
     const mentionRegex = /@([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s|$|[^A-Za-z])/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(comment.content)) !== null) {
      mentions.push(match[1].trim());
    }
    
    if (mentions.length === 0) return null;
    
    // Get all comments in the same post before this comment
    const postComments = await ctx.db
      .query("comments")
      .withIndex("by_post_and_createdAt", (q) => 
        q.eq("postId", comment.postId)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("createdAt"), comment.createdAt)
        )
      )
      .collect();
    
    // Find the best match
    let bestMatch = null;
    let bestScore = 0;
    
    for (const mention of mentions) {
      for (const postComment of postComments) {
        const author = await ctx.db.get(postComment.authorId);
        if (author) {
          const fullName = `${author.firstName} ${author.lastName}`.toLowerCase();
          const firstName = author.firstName.toLowerCase();
          const lastName = author.lastName.toLowerCase();
          const mentionLower = mention.toLowerCase();
          
          let score = 0;
          
          // Exact full name match (highest score)
          if (fullName === mentionLower) {
            score = 100;
          }
          // Full name contains mention or vice versa
          else if (fullName.includes(mentionLower) || mentionLower.includes(fullName)) {
            score = 80;
          }
          // First name exact match
          else if (firstName === mentionLower) {
            score = 70;
          }
          // Last name exact match
          else if (lastName === mentionLower) {
            score = 60;
          }
          // Partial matches
          else if (firstName.includes(mentionLower) || mentionLower.includes(firstName)) {
            score = 40;
          }
          else if (lastName.includes(mentionLower) || mentionLower.includes(lastName)) {
            score = 30;
          }
          
          // Prefer more recent comments (within reasonable time window)
          const timeDiff = comment.createdAt - postComment.createdAt;
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          if (hoursDiff < 24) score += 10; // Recent reply bonus
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = {
              parentCommentId: postComment._id,
              parentAuthor: `${author.firstName} ${author.lastName}`,
              matchedMention: mention,
              confidence: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
              score
            };
          }
        }
      }
    }
    
    return bestMatch;
  }
});

/**
 * Update comment threading based on @mentions analysis
 */
export const updateCommentThreading = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number())
  },
  handler: async (ctx, { dryRun = true, batchSize = 50 }) => {
    console.log(`Starting comment threading update (dryRun: ${dryRun})`);
    
    // Get all comments that don't have a parent but contain @mentions
    const comments = await ctx.db
      .query("comments")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("parentCommentId"), undefined)
        )
      )
      .take(batchSize);
    
    const updates = [];
    let processed = 0;
    let threaded = 0;
    
    for (const comment of comments) {
      processed++;
      
      // Skip if comment doesn't contain @mentions
      if (!comment.content.includes('@')) continue;
      
             // Extract @mentions - capture just the name part
       const mentionRegex = /@([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s|$|[^A-Za-z])/g;
      const mentions = [];
      let match;
      
      while ((match = mentionRegex.exec(comment.content)) !== null) {
        mentions.push(match[1].trim());
      }
      
      if (mentions.length === 0) continue;
      
      // Find best parent comment
      const postComments = await ctx.db
        .query("comments")
        .withIndex("by_post_and_createdAt", (q) => 
          q.eq("postId", comment.postId)
        )
        .filter((q) => 
          q.and(
            q.eq(q.field("status"), "active"),
            q.lt(q.field("createdAt"), comment.createdAt)
          )
        )
        .collect();
      
      let bestMatch = null;
      let bestScore = 0;
      
      for (const mention of mentions) {
        for (const postComment of postComments) {
          const author = await ctx.db.get(postComment.authorId);
          if (author) {
            const fullName = `${author.firstName} ${author.lastName}`.toLowerCase();
            const firstName = author.firstName.toLowerCase();
            const lastName = author.lastName.toLowerCase();
            const mentionLower = mention.toLowerCase();
            
            let score = 0;
            
            if (fullName === mentionLower) score = 100;
            else if (fullName.includes(mentionLower) || mentionLower.includes(fullName)) score = 80;
            else if (firstName === mentionLower) score = 70;
            else if (lastName === mentionLower) score = 60;
            else if (firstName.includes(mentionLower) || mentionLower.includes(firstName)) score = 40;
            else if (lastName.includes(mentionLower) || mentionLower.includes(lastName)) score = 30;
            
            // Time proximity bonus
            const timeDiff = comment.createdAt - postComment.createdAt;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            if (hoursDiff < 24) score += 10;
            
            if (score > bestScore && score >= 30) { // Minimum confidence threshold
              bestScore = score;
              bestMatch = {
                parentCommentId: postComment._id,
                parentAuthor: `${author.firstName} ${author.lastName}`,
                matchedMention: mention,
                score
              };
            }
          }
        }
      }
      
      if (bestMatch) {
        updates.push({
          commentId: comment._id,
          parentCommentId: bestMatch.parentCommentId,
          parentAuthor: bestMatch.parentAuthor,
          matchedMention: bestMatch.matchedMention,
          score: bestMatch.score,
          content: comment.content.substring(0, 50) + '...'
        });
        
        if (!dryRun) {
          // Update the comment's parent
          await ctx.db.patch(comment._id, {
            parentCommentId: bestMatch.parentCommentId,
            depth: 1, // Will recalculate properly later
            updatedAt: Date.now()
          });
          
          // Update parent's child count
          const parentComment = await ctx.db.get(bestMatch.parentCommentId);
          if (parentComment) {
            await ctx.db.patch(bestMatch.parentCommentId, {
              childCount: (parentComment.childCount || 0) + 1,
              updatedAt: Date.now()
            });
          }
        }
        
        threaded++;
      }
    }
    
    console.log(`Processed ${processed} comments, found threading for ${threaded} comments`);
    
    return {
      processed,
      threaded,
      dryRun,
      updates: updates.slice(0, 20) // Return first 20 for preview
    };
  }
});

/**
 * Recalculate comment depths based on parent chains
 */
export const recalculateCommentDepths = mutation({
  args: {
    postId: v.optional(v.id("posts")),
    dryRun: v.optional(v.boolean())
  },
  handler: async (ctx, { postId, dryRun = true }) => {
    console.log(`Recalculating comment depths (dryRun: ${dryRun})`);
    
    let comments;
    if (postId) {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_postId", (q) => q.eq("postId", postId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
    } else {
      comments = await ctx.db
        .query("comments")
        .filter((q) => q.eq(q.field("status"), "active"))
        .take(1000); // Process in batches
    }
    
    const updates = [];
    
    // Function to calculate depth recursively
    const calculateDepth = async (commentId: Id<"comments">, visited = new Set()): Promise<number> => {
      if (visited.has(commentId)) return 0; // Prevent infinite loops
      visited.add(commentId);
      
      const comment = await ctx.db.get(commentId);
      if (!comment || !comment.parentCommentId) return 0;
      
      const parentDepth = await calculateDepth(comment.parentCommentId, visited);
      return parentDepth + 1;
    };
    
    for (const comment of comments) {
      const newDepth = await calculateDepth(comment._id);
      
      if (newDepth !== comment.depth) {
        updates.push({
          commentId: comment._id,
          oldDepth: comment.depth,
          newDepth,
          parentCommentId: comment.parentCommentId
        });
        
        if (!dryRun) {
          await ctx.db.patch(comment._id, {
            depth: newDepth,
            updatedAt: Date.now()
          });
        }
      }
    }
    
    console.log(`Found ${updates.length} comments with incorrect depths`);
    
    return {
      totalComments: comments.length,
      updatesNeeded: updates.length,
      dryRun,
      updates: updates.slice(0, 20) // Return first 20 for preview
    };
  }
});

// Phase 3: Data Integrity & Category Assignment

/**
 * Assign posts to appropriate categories based on content analysis
 */
export const assignPostsToCategories = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number())
  },
  handler: async (ctx, { dryRun = true, batchSize = 50 }) => {
    console.log(`Starting category assignment (dryRun: ${dryRun})`);
    
    // Get all categories except "skool"
    const categories = await ctx.db.query("categories").collect();
    const targetCategories = categories.filter(cat => cat.name !== "skool");
    
    // Get posts that are in "skool" category
    const skoolCategory = categories.find(cat => cat.name === "skool");
    if (!skoolCategory) {
      throw new Error("Skool category not found");
    }
    
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", skoolCategory._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(batchSize);
    
    const assignments = [];
    
    for (const post of posts) {
      // Analyze post content to determine best category
      const title = post.title.toLowerCase();
      const content = post.content.toLowerCase();
      const text = `${title} ${content}`;
      
      let bestCategory = null;
      let score = 0;
      
      // Category keywords for classification
      const categoryKeywords = {
        announcements: ['announcement', 'update', 'news', 'important', 'notice', 'release'],
        workflows: ['workflow', 'automation', 'process', 'productivity', 'efficiency', 'pipeline', 'agent', 'framework'],
        prompts: ['prompt', 'prompting', 'template', 'instruction', 'system prompt', 'user prompt'],
        connect: ['introduce', 'networking', 'collaboration', 'team', 'partnership', 'community', 'welcome', 'meet'],
        content: ['video', 'youtube', 'tutorial', 'guide', 'learning', 'course', 'education', 'watch']
      };
      
      // Score each category
      for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
        const category = targetCategories.find(cat => cat.name === categoryName);
        if (!category) continue;
        
        let categoryScore = 0;
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            categoryScore += 1;
            // Boost score if keyword appears in title
            if (title.includes(keyword)) categoryScore += 2;
          }
        }
        
        if (categoryScore > score) {
          score = categoryScore;
          bestCategory = category;
        }
      }
      
      // Default to "connect" if no clear match
      if (!bestCategory) {
        bestCategory = targetCategories.find(cat => cat.name === "connect") || targetCategories[0];
        score = 0;
      }
      
      assignments.push({
        postId: post._id,
        title: post.title.substring(0, 60) + (post.title.length > 60 ? '...' : ''),
        currentCategory: skoolCategory.name,
        newCategory: bestCategory.name,
        score,
        confidence: score > 2 ? 'high' : score > 0 ? 'medium' : 'low'
      });
      
      if (!dryRun) {
        await ctx.db.patch(post._id, {
          categoryId: bestCategory._id,
          updatedAt: Date.now()
        });
      }
    }
    
    console.log(`Processed ${posts.length} posts, assigned to categories`);
    
    return {
      processed: posts.length,
      assignments: assignments.slice(0, 20), // Return first 20 for preview
      dryRun
    };
  }
});

/**
 * Recalculate all comment counts for posts
 */
export const recalculateAllCounts = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number())
  },
  handler: async (ctx, { dryRun = true, batchSize = 100 }) => {
    console.log(`Recalculating all counts (dryRun: ${dryRun})`);
    
    const posts = await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(batchSize);
    
    const updates = [];
    let totalFixed = 0;
    
    for (const post of posts) {
      // Count actual comments for this post
      const actualComments = await ctx.db
        .query("comments")
        .withIndex("by_postId", (q) => q.eq("postId", post._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      
      const actualCount = actualComments.length;
      
      if (actualCount !== post.commentCount) {
        updates.push({
          postId: post._id,
          title: post.title.substring(0, 50) + '...',
          oldCount: post.commentCount,
          newCount: actualCount,
          difference: actualCount - post.commentCount
        });
        
        if (!dryRun) {
          await ctx.db.patch(post._id, {
            commentCount: actualCount,
            updatedAt: Date.now()
          });
        }
        
        totalFixed++;
      }
    }
    
    // Recalculate category post counts
    const categories = await ctx.db.query("categories").collect();
    const categoryUpdates = [];
    
    for (const category of categories) {
      const categoryPosts = await ctx.db
        .query("posts")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      
      const actualPostCount = categoryPosts.length;
      
      if (actualPostCount !== category.postCount) {
        categoryUpdates.push({
          categoryName: category.name,
          oldCount: category.postCount,
          newCount: actualPostCount,
          difference: actualPostCount - category.postCount
        });
        
        if (!dryRun) {
          await ctx.db.patch(category._id, {
            postCount: actualPostCount,
            updatedAt: Date.now()
          });
        }
      }
    }
    
    console.log(`Fixed ${totalFixed} post counts, ${categoryUpdates.length} category counts`);
    
    return {
      postsProcessed: posts.length,
      postCountsFixed: totalFixed,
      categoryCountsFixed: categoryUpdates.length,
      postUpdates: updates.slice(0, 10),
      categoryUpdates,
      dryRun
    };
  }
});

/**
 * Validate data integrity across all tables
 */
export const validateDataIntegrity = query({
  handler: async (ctx) => {
    console.log("Running data integrity validation...");
    
    const issues = [];
    
    // Check for orphaned comments
    const comments = await ctx.db.query("comments").take(1000);
    for (const comment of comments) {
      const post = await ctx.db.get(comment.postId);
      if (!post) {
        issues.push({
          type: "orphaned_comment",
          id: comment._id,
          description: `Comment ${comment._id} references non-existent post ${comment.postId}`
        });
      }
      
      const author = await ctx.db.get(comment.authorId);
      if (!author) {
        issues.push({
          type: "orphaned_comment_author",
          id: comment._id,
          description: `Comment ${comment._id} references non-existent author ${comment.authorId}`
        });
      }
      
      // Check parent comment exists if specified
      if (comment.parentCommentId) {
        const parent = await ctx.db.get(comment.parentCommentId);
        if (!parent) {
          issues.push({
            type: "invalid_parent_comment",
            id: comment._id,
            description: `Comment ${comment._id} references non-existent parent ${comment.parentCommentId}`
          });
        }
      }
    }
    
    // Check for orphaned posts
    const posts = await ctx.db.query("posts").take(500);
    for (const post of posts) {
      const category = await ctx.db.get(post.categoryId);
      if (!category) {
        issues.push({
          type: "orphaned_post_category",
          id: post._id,
          description: `Post ${post._id} references non-existent category ${post.categoryId}`
        });
      }
      
      const author = await ctx.db.get(post.authorId);
      if (!author) {
        issues.push({
          type: "orphaned_post_author",
          id: post._id,
          description: `Post ${post._id} references non-existent author ${post.authorId}`
        });
      }
    }
    
    // Check comment count accuracy
    const commentCountIssues = [];
    for (const post of posts.slice(0, 100)) {
      const actualComments = await ctx.db
        .query("comments")
        .withIndex("by_postId", (q) => q.eq("postId", post._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      
      if (actualComments.length !== post.commentCount) {
        commentCountIssues.push({
          postId: post._id,
          title: post.title.substring(0, 40) + '...',
          storedCount: post.commentCount,
          actualCount: actualComments.length
        });
      }
    }
    
    // Summary statistics
    const totalPosts = await ctx.db.query("posts").collect();
    const totalComments = await ctx.db.query("comments").collect();
    const totalMembers = await ctx.db.query("members").collect();
    const totalCategories = await ctx.db.query("categories").collect();
    
    const stats = {
      posts: {
        total: totalPosts.length,
        active: totalPosts.filter(p => p.status === "active").length,
        deleted: totalPosts.filter(p => p.status === "deleted").length
      },
      comments: {
        total: totalComments.length,
        active: totalComments.filter(c => c.status === "active").length,
        threaded: totalComments.filter(c => c.parentCommentId).length,
        rootLevel: totalComments.filter(c => !c.parentCommentId).length
      },
      members: {
        total: totalMembers.length,
        active: totalMembers.filter(m => m.status === "active").length,
        churned: totalMembers.filter(m => m.status === "churned").length
      },
      categories: {
        total: totalCategories.length,
        active: totalCategories.filter(c => c.status === "active").length
      }
    };
    
    return {
      stats,
      issues: issues.slice(0, 20),
      commentCountIssues: commentCountIssues.slice(0, 10),
      totalIssues: issues.length,
      isHealthy: issues.length === 0 && commentCountIssues.length === 0
    };
  }
});

export const runAddPostMediaFieldsMigration = action({
  args: {},
  handler: async (ctx): Promise<{ migratedCount: number }> => {
    console.log("Running post media fields migration...");
    
    try {
      const result = await ctx.runMutation(api.migrations.add_post_media_fields.addPostMediaFields, {});
      console.log(`Migration completed successfully. Migrated ${result.migratedCount} posts.`);
      return result;
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  },
}); 