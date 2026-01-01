import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, members, posts, postVersions } from "@/db/schema";
import type { PostAttachment, PollOption } from "@/db/schema/posts";

/**
 * Post Repository
 *
 * Provides a centralized data access layer for posts.
 * Separates database concerns from API route handlers.
 */

// Types for repository operations
export interface PostQueryOptions {
  categoryId?: string;
  slug?: string;
  sortBy?: "newest" | "popular";
  limit?: number;
  cursor?: string;
  status?: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
  categoryId: string;
  memberId: string;
  type?: string;
  attachments?: PostAttachment[];
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  aspectRatio?: number | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkImage?: string | null;
  pollOptions?: PollOption[];
  pollEndsAt?: Date;
  preview?: string | null;
  isFree?: boolean;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  categoryId?: string;
  type?: string;
  attachments?: PostAttachment[];
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkImage?: string | null;
  editReason?: string;
  isFree?: boolean;
}

// Post with relations
export interface PostWithRelations {
  id: string;
  title: string;
  content: string;
  slug: string;
  preview: string | null;
  type: string;
  status: string;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  commentCount: number;
  viewCount: number;
  createdAt: Date;
  editedAt: Date | null;
  memberId: string;
  categoryId: string;
  isPinned: boolean;
  pinScope: string | null;
  isLocked: boolean;
  isFree: boolean;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  aspectRatio: number | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  linkUrl: string | null;
  linkTitle: string | null;
  linkDescription: string | null;
  linkImage: string | null;
  attachments: PostAttachment[];
  pollOptions: PollOption[] | null;
  pollEndsAt: Date | null;
  totalPollVotes: number | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    avatarUrl: string | null;
    bio?: string | null;
  };
  category: {
    id: string;
    name: string;
    displayName: string;
    icon: string | null;
  };
}

// Helper to generate slug
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

export const postRepository = {
  /**
   * Find multiple posts with filters and pagination
   */
  async findMany(
    options: PostQueryOptions = {}
  ): Promise<{ items: PostWithRelations[]; nextCursor: string | null; hasMore: boolean }> {
    const { categoryId, slug, sortBy = "newest", limit = 20, status = "active" } = options;

    const conditions = [eq(posts.status, status)];
    if (categoryId) conditions.push(eq(posts.categoryId, categoryId));
    if (slug) conditions.push(eq(posts.slug, slug));

    const query = db
      .select({
        post: posts,
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
      .innerJoin(members, eq(posts.memberId, members.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(and(...conditions));

    const result = await (sortBy === "popular"
      ? query.orderBy(desc(posts.netVotes), desc(posts.createdAt)).limit(limit + 1)
      : query.orderBy(desc(posts.createdAt)).limit(limit + 1));

    const hasMore = result.length > limit;
    const items = hasMore ? result.slice(0, -1) : result;

    return {
      items: items.map((row) => ({
        ...row.post,
        attachments: row.post.attachments ?? [],
        member: row.member,
        category: row.category,
      })) as PostWithRelations[],
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].post.id : null,
      hasMore,
    };
  },

  /**
   * Find a single post by ID
   */
  async findById(id: string): Promise<PostWithRelations | null> {
    const result = await db
      .select({
        post: posts,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          slug: members.slug,
          avatarUrl: members.avatarUrl,
          bio: members.bio,
        },
        category: {
          id: categories.id,
          name: categories.name,
          displayName: categories.displayName,
          icon: categories.icon,
        },
      })
      .from(posts)
      .innerJoin(members, eq(posts.memberId, members.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      ...row.post,
      attachments: row.post.attachments ?? [],
      member: row.member,
      category: row.category,
    } as PostWithRelations;
  },

  /**
   * Find a single post by slug
   */
  async findBySlug(slug: string): Promise<PostWithRelations | null> {
    const result = await db
      .select({
        post: posts,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          slug: members.slug,
          avatarUrl: members.avatarUrl,
          bio: members.bio,
        },
        category: {
          id: categories.id,
          name: categories.name,
          displayName: categories.displayName,
          icon: categories.icon,
        },
      })
      .from(posts)
      .innerJoin(members, eq(posts.memberId, members.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.slug, slug))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      ...row.post,
      attachments: row.post.attachments ?? [],
      member: row.member,
      category: row.category,
    } as PostWithRelations;
  },

  /**
   * Create a new post
   */
  async create(input: CreatePostInput): Promise<PostWithRelations> {
    const slug = generateSlug(input.title);

    const [newPost] = await db
      .insert(posts)
      .values({
        title: input.title,
        content: input.content,
        slug,
        categoryId: input.categoryId,
        memberId: input.memberId,
        type: input.type || "text",
        attachments: input.attachments || [],
        mediaUrl: input.mediaUrl,
        thumbnailUrl: input.thumbnailUrl,
        aspectRatio: input.aspectRatio,
        mediaWidth: input.mediaWidth,
        mediaHeight: input.mediaHeight,
        linkUrl: input.linkUrl,
        linkTitle: input.linkTitle,
        linkDescription: input.linkDescription,
        linkImage: input.linkImage,
        pollOptions: input.pollOptions,
        pollEndsAt: input.pollEndsAt,
        preview: input.preview,
        isFree: input.isFree ?? true,
        status: "active",
      })
      .returning();

    // Update category post count
    await db
      .update(categories)
      .set({ postCount: sql`${categories.postCount} + 1` })
      .where(eq(categories.id, input.categoryId));

    // Update member post count
    await db
      .update(members)
      .set({ postCount: sql`${members.postCount} + 1` })
      .where(eq(members.id, input.memberId));

    // Fetch and return with relations
    const result = await this.findById(newPost.id);
    if (!result) throw new Error("Failed to create post");
    return result;
  },

  /**
   * Update an existing post, saving version history
   */
  async update(
    id: string,
    input: UpdatePostInput,
    editorId: string
  ): Promise<PostWithRelations> {
    // Get existing post for version history
    const existingPost = await db.query.posts.findFirst({
      where: eq(posts.id, id),
    });

    if (!existingPost) {
      throw new Error("Post not found");
    }

    // Get version count for this post
    const versionCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(postVersions)
      .where(eq(postVersions.postId, id));

    const nextVersion = (versionCount[0]?.count || 0) + 1;

    // Save current version to history
    await db.insert(postVersions).values({
      postId: id,
      version: nextVersion,
      editorId,
      title: existingPost.title,
      content: existingPost.content,
      editReason: input.editReason,
      type: existingPost.type,
      mediaUrl: existingPost.mediaUrl,
      thumbnailUrl: existingPost.thumbnailUrl,
      linkUrl: existingPost.linkUrl,
      linkTitle: existingPost.linkTitle,
      linkDescription: existingPost.linkDescription,
      linkImage: existingPost.linkImage,
      attachments: existingPost.attachments,
    });

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      editedAt: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
    if (input.editReason !== undefined) updateData.editReason = input.editReason;
    if (input.attachments !== undefined) updateData.attachments = input.attachments;
    if (input.mediaUrl !== undefined) updateData.mediaUrl = input.mediaUrl;
    if (input.thumbnailUrl !== undefined) updateData.thumbnailUrl = input.thumbnailUrl;
    if (input.linkUrl !== undefined) updateData.linkUrl = input.linkUrl;
    if (input.linkTitle !== undefined) updateData.linkTitle = input.linkTitle;
    if (input.linkDescription !== undefined) updateData.linkDescription = input.linkDescription;
    if (input.linkImage !== undefined) updateData.linkImage = input.linkImage;
    if (input.isFree !== undefined) updateData.isFree = input.isFree;

    await db.update(posts).set(updateData).where(eq(posts.id, id));

    // Fetch and return with relations
    const result = await this.findById(id);
    if (!result) throw new Error("Failed to update post");
    return result;
  },

  /**
   * Soft delete a post
   */
  async delete(id: string): Promise<void> {
    const existingPost = await db.query.posts.findFirst({
      where: eq(posts.id, id),
    });

    if (!existingPost) {
      throw new Error("Post not found");
    }

    await db
      .update(posts)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(posts.id, id));

    // Update category post count
    await db
      .update(categories)
      .set({ postCount: sql`${categories.postCount} - 1` })
      .where(eq(categories.id, existingPost.categoryId));

    // Update member post count
    await db
      .update(members)
      .set({ postCount: sql`${members.postCount} - 1` })
      .where(eq(members.id, existingPost.memberId));
  },

  /**
   * Increment post view count
   */
  async incrementViewCount(id: string): Promise<void> {
    await db
      .update(posts)
      .set({ viewCount: sql`${posts.viewCount} + 1` })
      .where(eq(posts.id, id));
  },

  /**
   * Check if a member can modify a post (owner or admin)
   */
  async canModify(
    postId: string,
    memberId: string,
    memberRole: string
  ): Promise<{ allowed: boolean; post: typeof posts.$inferSelect | null }> {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      return { allowed: false, post: null };
    }

    const isOwner = post.memberId === memberId;
    const isAdmin = memberRole === "admin";

    return { allowed: isOwner || isAdmin, post };
  },
};
