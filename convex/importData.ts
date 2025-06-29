import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateMemberSlug } from "../lib/slug-utils";

// Import posts in batches
export const importPosts = mutation({
  args: {
    posts: v.array(v.object({
      skoolId: v.string(),
      title: v.string(),
      content: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      authorEmail: v.string(),
      categoryId: v.id("categories"),
      status: v.union(v.literal("active"), v.literal("deleted"), v.literal("hidden"), v.literal("archived")),
      upvotes: v.number(),
      downvotes: v.number(),
      netVotes: v.number(),
      commentCount: v.number(),
      viewCount: v.number(),
      isPinned: v.optional(v.boolean()),
      isLocked: v.optional(v.boolean()),
    }))
  },
  handler: async (ctx, args) => {
    const results = [];
    const emailToMemberId = new Map();
    
    // Pre-fetch or create authors
    const uniqueEmails = [...new Set(args.posts.map(p => p.authorEmail))];
    for (const email of uniqueEmails) {
      let member = await ctx.db
        .query("members")
        .filter((q) => q.eq(q.field("email"), email))
        .first();
      
      if (!member) {
        // Create inactive member for missing users
        const nameParts = email.split('@')[0].split('-');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1, -1).join(' ') || 'User';
        
        // Generate unique slug for the member
        const fullName = `${firstName} ${lastName}`;
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
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
          email: email,
          status: "churned" as const, // Mark as inactive/churned
          joinedDate: Date.now(),
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          bio: "Imported from Skool (inactive member)",
          slug: uniqueSlug,
        });
        
        emailToMemberId.set(email, memberId);
        console.log(`Created inactive member for: ${email}`);
      } else {
        emailToMemberId.set(email, member._id);
      }
    }
    
    // Import posts
    for (const post of args.posts) {
      const authorId = emailToMemberId.get(post.authorEmail);
      // Should always have an authorId now
      
      try {
        // Generate slug from title
        const baseSlug = post.title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 60)
          .replace(/-+$/, '');

        const postId = await ctx.db.insert("posts", {
          title: post.title,
          content: post.content,
          slug: baseSlug,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          authorId,
          categoryId: post.categoryId,
          status: post.status,
          upvotes: post.upvotes,
          downvotes: post.downvotes,
          netVotes: post.netVotes,
          commentCount: post.commentCount,
          viewCount: post.viewCount,
          isPinned: post.isPinned || false,
          isLocked: post.isLocked || false,
        });
        
        results.push({ postId: postId, skoolId: post.skoolId });
      } catch (error) {
        console.error(`Failed to import post ${post.skoolId}:`, error);
      }
    }
    
    return {
      imported: results.length,
      skipped: args.posts.length - results.length,
      mapping: results
    };
  },
});

// Import comments in batches
export const importComments = mutation({
  args: {
    comments: v.array(v.object({
      skoolId: v.string(),
      content: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      authorEmail: v.string(),
      postId: v.id("posts"),
      parentCommentId: v.optional(v.id("comments")),
      status: v.union(v.literal("active"), v.literal("deleted"), v.literal("hidden")),
      upvotes: v.number(),
      downvotes: v.number(),
      netVotes: v.number(),
      depth: v.number(),
      childCount: v.number(),
    }))
  },
  handler: async (ctx, args) => {
    const results = [];
    const emailToMemberId = new Map();
    
    // Pre-fetch or create authors
    const uniqueEmails = [...new Set(args.comments.map(c => c.authorEmail))];
    for (const email of uniqueEmails) {
      let member = await ctx.db
        .query("members")
        .filter((q) => q.eq(q.field("email"), email))
        .first();
      
      if (!member) {
        // Create inactive member for missing users
        const nameParts = email.split('@')[0].split('-');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1, -1).join(' ') || 'User';
        
        // Generate unique slug for the member
        const fullName = `${firstName} ${lastName}`;
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
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
          email: email,
          status: "churned" as const, // Mark as inactive/churned
          joinedDate: Date.now(),
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          bio: "Imported from Skool (inactive member)",
          slug: uniqueSlug,
        });
        
        emailToMemberId.set(email, memberId);
        console.log(`Created inactive member for: ${email}`);
      } else {
        emailToMemberId.set(email, member._id);
      }
    }
    
    // Import comments
    for (const comment of args.comments) {
      const authorId = emailToMemberId.get(comment.authorEmail);
      // Should always have an authorId now
      
      try {
        const commentId = await ctx.db.insert("comments", {
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          authorId,
          postId: comment.postId,
          parentCommentId: comment.parentCommentId,
          status: comment.status,
          upvotes: comment.upvotes,
          downvotes: comment.downvotes,
          netVotes: comment.netVotes,
          depth: comment.depth,
          childCount: comment.childCount,
        });
        
        results.push({ commentId, skoolId: comment.skoolId });
      } catch (error) {
        console.error(`Failed to import comment ${comment.skoolId}:`, error);
      }
    }
    
    return {
      imported: results.length,
      skipped: args.comments.length - results.length,
      mapping: results
    };
  },
});