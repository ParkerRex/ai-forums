/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const globalSearch = query({
  args: { 
    searchTerm: v.string(), 
    limit: v.optional(v.number()) 
  },
  handler: async (ctx, { searchTerm, limit = 30 }): Promise<any[]> => {
    if (!searchTerm.trim()) {
      return [];
    }

    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity
      ? await ctx.db
          .query("members")
          .filter(q => q.eq(q.field("email"), identity.email))
          .first()
      : undefined;

    const [posts, comments] = await Promise.all([
      ctx.runQuery(api.posts.searchPosts, { searchTerm, limit, includeContent: true }),
      ctx.db
        .query("comments")
        .withSearchIndex("search_comments", (q: any) => q.search("content", searchTerm).eq("status", "active"))
        .take(limit),
    ]);

    // Enrich comments with author data
    const enrichedComments = await Promise.all(
      comments.map(async (comment: any) => {
        const author = await ctx.db.get(comment.authorId);
        return {
          ...comment,
          author: author && 'firstName' in author ? {
            _id: author._id,
            firstName: author.firstName,
            lastName: author.lastName,
            email: author.email,
            username: author.email.split('@')[0],
          } : null,
        };
      })
    );

    // Build a complete post lookup map for comments
    const postsById = new Map();
    posts.forEach((p: any) => postsById.set(p._id, p));

    // Find missing parent posts for comments
    const missingPostIds = enrichedComments
      .map((c: any) => c.postId)
      .filter((postId: any) => !postsById.has(postId));

    // Fetch missing posts with their categories
    const missingPosts = await Promise.all(
      missingPostIds.map(async (postId: any) => {
        const post = (await ctx.db.get(postId)) as any;
        if (!post) return null;
        
        const category = post.categoryId ? (await ctx.db.get(post.categoryId)) as any : null;
        return {
          ...post,
          category: category ? {
            _id: category._id,
            name: category.name,
            displayName: category.displayName,
            status: category.status,
            icon: category.icon,
          } : null,
        };
      })
    );

    // Add missing posts to the lookup map
    missingPosts.forEach((post: any) => {
      if (post) postsById.set(post._id, post);
    });

    // Extract links from comments
    const linkRegex = /(https?:\/\/\S+)/gi;
    const linkResults = enrichedComments.flatMap((c: any) => {
      const links = c.content.match(linkRegex) ?? [];
      return links.map((link: string) => {
        try {
          const url = new URL(link);
          return { 
            _id: `${c._id}:${link}`, 
            type: "link" as const, 
            link, 
            postId: c.postId,
            domain: url.hostname.replace('www.', '')
          };
        } catch {
          // Skip malformed URLs
          return null;
        }
      }).filter(Boolean); // Remove null entries
    });

    // Mark visibility for private-category content
    const mappedPosts = posts.map((p: any) => {
      const isPrivate = p.category?.status === "private";
      const restricted = isPrivate && (!viewer || viewer.status === "free");
      return { 
        _id: p._id, 
        type: "post" as const, 
        title: restricted ? "Hidden content – join to view" : p.title, 
        highlight: restricted ? "Hidden content – join to view" : p.title, 
        restricted,
        slug: p.slug,
        categoryName: p.category?.name
      };
    });

    const mappedComments = enrichedComments.map((c: any) => {
      const parentPost = postsById.get(c.postId);
      const isPrivate = parentPost?.category?.status === "private";
      const restricted = isPrivate && (!viewer || viewer.status === "free");
      return { 
        _id: c._id, 
        type: "comment" as const, 
        content: restricted ? "Hidden content – join to view" : c.content, 
        authorId: c.authorId,
        author: c.author,
        postId: c.postId, 
        restricted,
        slug: parentPost?.slug,
        categoryName: parentPost?.category?.name
      };
    });

    // Dedupe identical links
    const uniqueLinks = linkResults.filter((link: any, index: number, arr: any[]) => 
      arr.findIndex((l: any) => l.link === link.link) === index
    );

    return [
      ...mappedPosts,
      ...mappedComments,
      ...uniqueLinks,
    ].slice(0, limit);
  },
}); 