import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

// Internal mutation to import a batch of posts
export const importPostsBatch = internalMutation({
  args: {
    posts: v.array(v.object({
      title: v.string(),
      content: v.string(),
      authorEmail: v.string(),
      categoryId: v.id("categories"),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
      views: v.optional(v.number()),
      likes: v.optional(v.number()),
      isPinned: v.optional(v.boolean()),
      isLocked: v.optional(v.boolean()),
      tags: v.optional(v.array(v.string())),
      // Store the original Skool ID for linking comments
      skoolId: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const postIdMap = new Map<string, Id<"posts">>();
    const errors: string[] = [];
    
    for (const post of args.posts) {
      // Find the member by email
      const member = await ctx.db
        .query("members")
        .withIndex("by_email", (q) => q.eq("email", post.authorEmail))
        .first();
      
      if (!member) {
        errors.push(`Member not found for email: ${post.authorEmail}`);
        console.error(`Member not found for email: ${post.authorEmail}`);
        continue;
      }
      
      try {
        // Generate a unique slug for the post
        const baseSlug = post.title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const slug = `${baseSlug}-${Date.now()}`;
        
        // Create the post
        const postId = await ctx.db.insert("posts", {
          title: post.title,
          content: post.content,
          slug: slug,
          memberId: member._id,
          categoryId: post.categoryId,
          createdAt: post.createdAt || Date.now(),
          updatedAt: post.updatedAt || Date.now(),
          status: "active",
          upvotes: 0,
          downvotes: 0,
          netVotes: 0,
          commentCount: 0,
          viewCount: post.views || 0,
          isPinned: post.isPinned || false,
          isLocked: post.isLocked || false,
          type: "text",
        });
        
        postIdMap.set(post.skoolId, postId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import post "${post.title}": ${errorMessage}`);
        console.error(`Failed to import post:`, error);
      }
    }
    
    if (errors.length > 0 && postIdMap.size === 0) {
      throw new ConvexError({
        message: "Failed to import any posts",
        errors: errors,
        type: "import_failure"
      });
    }
    
    return { 
      postIdMap: Object.fromEntries(postIdMap),
      importedCount: postIdMap.size,
      totalCount: args.posts.length,
      errors: errors
    };
  },
});

// Internal mutation to import a batch of comments
export const importCommentsBatch = internalMutation({
  args: {
    comments: v.array(v.object({
      content: v.string(),
      authorEmail: v.string(),
      postSkoolId: v.string(),
      parentSkoolId: v.optional(v.string()),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
      likes: v.optional(v.number()),
      // Store the original Skool ID for linking replies
      skoolId: v.string(),
    })),
    postIdMap: v.record(v.string(), v.id("posts")),
  },
  handler: async (ctx, args) => {
    const commentIdMap = new Map<string, Id<"comments">>();
    
    // First pass: create all comments without parent references
    for (const comment of args.comments) {
      const postId = args.postIdMap[comment.postSkoolId];
      if (!postId) {
        console.error(`Post not found for Skool ID: ${comment.postSkoolId}`);
        continue;
      }
      
      // Find the member by email
      const member = await ctx.db
        .query("members")
        .withIndex("by_email", (q) => q.eq("email", comment.authorEmail))
        .first();
      
      if (!member) {
        console.error(`Member not found for email: ${comment.authorEmail}`);
        continue;
      }
      
      // Create the comment
      const commentId = await ctx.db.insert("comments", {
        content: comment.content,
        memberId: member._id,
        postId: postId,
        parentCommentId: undefined, // Will be set in second pass
        createdAt: comment.createdAt || Date.now(),
        updatedAt: comment.updatedAt || Date.now(),
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        status: "active",
        depth: 0, // Will be updated in second pass
        childCount: 0,
      });
      
      commentIdMap.set(comment.skoolId, commentId);
    }
    
    // Second pass: update parent references and depth
    for (const comment of args.comments) {
      if (comment.parentSkoolId) {
        const commentId = commentIdMap.get(comment.skoolId);
        const parentId = commentIdMap.get(comment.parentSkoolId);
        
        if (commentId && parentId) {
          // Get parent comment to calculate depth
          const parentComment = await ctx.db.get(parentId);
          if (parentComment) {
            await ctx.db.patch(commentId, {
              parentCommentId: parentId,
              depth: (parentComment.depth || 0) + 1,
            });
            
            // Update parent's child count
            await ctx.db.patch(parentId, {
              childCount: parentComment.childCount + 1,
            });
          }
        }
      }
    }
    
    // Update post comment counts
    const postCommentCounts = new Map<Id<"posts">, number>();
    for (const comment of args.comments) {
      const postId = args.postIdMap[comment.postSkoolId];
      if (postId) {
        postCommentCounts.set(postId, (postCommentCounts.get(postId) || 0) + 1);
      }
    }
    
    for (const [postId, count] of postCommentCounts) {
      const post = await ctx.db.get(postId);
      if (post) {
        await ctx.db.patch(postId, {
          commentCount: post.commentCount + count,
        });
      }
    }
    
    return { importedCount: commentIdMap.size };
  },
});

// Helper mutation to create missing members before import
export const createMissingMember = internalMutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    joinedDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if member already exists
    const existing = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      return existing._id;
    }
    
    // Create new member
    const memberId = await ctx.db.insert("members", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      slug: args.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
      bio: "",
      avatarUrl: "",
      joinedDate: args.joinedDate || Date.now(),
      updatedAt: Date.now(),
      lastOnline: Date.now(),
      status: "active",
      location: "",
      skills: [],
      postCount: 0,
      commentCount: 0,
      netVoteCount: 0,
      tier: "member", // Default tier
      role: "user",
    });
    
    return memberId;
  },
}); 