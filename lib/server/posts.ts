import "server-only";
import { cache } from "react";
import { db } from "@/db";
import { categories, members, posts } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Server-side post data fetching utilities
 *
 * These functions are cached per-request using React's cache() function
 * to avoid duplicate database queries within the same request.
 */

export type ServerPost = {
  id: string;
  title: string;
  content: string;
  slug: string;
  preview: string | null;
  type: "text" | "image" | "video" | "link" | "poll";
  upvotes: number;
  downvotes: number;
  netVotes: number;
  commentCount: number;
  viewCount: number;
  createdAt: Date;
  editedAt: Date | null;
  memberId: string;
  categoryId: string;
  status: "active" | "deleted" | "hidden" | "archived";
  isPinned: boolean;
  pinScope: "category" | "global" | "both" | null;
  isLocked: boolean;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  linkUrl: string | null;
  linkTitle: string | null;
  linkDescription: string | null;
  linkImage: string | null;
  linkPreviews: Record<
    string,
    {
      title?: string;
      description?: string;
      image?: string;
      siteName?: string;
      url: string;
    }
  > | null;
  pollOptions: Array<{ id: string; text: string; voteCount: number }> | null;
  pollEndsAt: Date | null;
  totalPollVotes: number | null;
  attachments: unknown[] | null;
  isFree: boolean;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    avatarUrl: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    displayName: string;
    icon: string | null;
  } | null;
};

/**
 * Fetch a post by its slug - cached per request
 */
export const getPostBySlug = cache(async (slug: string): Promise<ServerPost | null> => {
  try {
    const result = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        slug: posts.slug,
        preview: posts.preview,
        type: posts.type,
        upvotes: posts.upvotes,
        downvotes: posts.downvotes,
        netVotes: posts.netVotes,
        commentCount: posts.commentCount,
        viewCount: posts.viewCount,
        createdAt: posts.createdAt,
        editedAt: posts.editedAt,
        memberId: posts.memberId,
        categoryId: posts.categoryId,
        status: posts.status,
        isPinned: posts.isPinned,
        pinScope: posts.pinScope,
        isLocked: posts.isLocked,
        mediaUrl: posts.mediaUrl,
        thumbnailUrl: posts.thumbnailUrl,
        linkUrl: posts.linkUrl,
        linkTitle: posts.linkTitle,
        linkDescription: posts.linkDescription,
        linkImage: posts.linkImage,
        linkPreviews: posts.linkPreviews,
        pollOptions: posts.pollOptions,
        pollEndsAt: posts.pollEndsAt,
        totalPollVotes: posts.totalPollVotes,
        attachments: posts.attachments,
        isFree: posts.isFree,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          slug: members.slug,
          avatarUrl: members.avatarUrl,
        },
        category: {
          id: categories.id,
          name: categories.name,
          displayName: categories.displayName,
          icon: categories.icon,
        },
      })
      .from(posts)
      .leftJoin(members, eq(posts.memberId, members.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.slug, slug))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0] as ServerPost;
  } catch (error) {
    console.error("Error fetching post by slug:", error);
    return null;
  }
});

/**
 * Validate that a post belongs to the expected category
 */
export function validatePostCategory(post: ServerPost, expectedCategory: string): boolean {
  return post.category?.name === expectedCategory;
}

/**
 * Convert server post dates to serializable format for client components
 */
export function serializePost(post: ServerPost) {
  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString() ?? null,
    pollEndsAt: post.pollEndsAt?.toISOString() ?? null,
  };
}
