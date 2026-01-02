import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PostAttachment } from "@/db/schema/posts";
import { withAuth } from "@/lib/api/middleware";
import { postRepository } from "@/lib/repositories";

const updatePostSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(["text", "image", "video", "link", "poll"]).optional(),
  categoryId: z.string().uuid().optional(),
  editReason: z.string().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["image", "video", "pdf", "youtube"]),
        url: z.string().url(),
        thumbnailUrl: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        aspectRatio: z.number().optional(),
        order: z.number(),
      }),
    )
    .optional(),
  // Media fields
  mediaUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  // Link fields
  linkUrl: z.string().url().optional().nullable(),
  linkTitle: z.string().optional().nullable(),
  linkDescription: z.string().optional().nullable(),
  linkImage: z.string().optional().nullable(),
  isFree: z.boolean().optional(),
});

type RouteParams = {
  params: Promise<{ postId: string }>;
};

// GET /api/posts/[postId] - Get a single post
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;
    const post = await postRepository.findById(postId);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Get post error:", error);
    return NextResponse.json({ error: "Failed to get post" }, { status: 500 });
  }
}

// PATCH /api/posts/[postId] - Update a post
export const PATCH = withAuth(async (request, { params }, member) => {
  try {
    const { postId } = await params;
    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Check permission
    const { allowed, post: existingPost } = await postRepository.canModify(
      postId,
      member.id,
      member.role,
    );

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedPost = await postRepository.update(
      postId,
      {
        title: parsed.data.title,
        content: parsed.data.content,
        type: parsed.data.type,
        categoryId: parsed.data.categoryId,
        editReason: parsed.data.editReason,
        attachments: parsed.data.attachments as PostAttachment[] | undefined,
        mediaUrl: parsed.data.mediaUrl,
        thumbnailUrl: parsed.data.thumbnailUrl,
        linkUrl: parsed.data.linkUrl,
        linkTitle: parsed.data.linkTitle,
        linkDescription: parsed.data.linkDescription,
        linkImage: parsed.data.linkImage,
        isFree: parsed.data.isFree,
      },
      member.id,
    );

    return NextResponse.json({
      ...updatedPost,
      slug: updatedPost.slug,
      categoryName: updatedPost.category.name,
    });
  } catch (error) {
    console.error("Update post error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
});

// DELETE /api/posts/[postId] - Soft delete a post
export const DELETE = withAuth(async (_request, { params }, member) => {
  try {
    const { postId } = await params;

    // Check permission
    const { allowed, post: existingPost } = await postRepository.canModify(
      postId,
      member.id,
      member.role,
    );

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await postRepository.delete(postId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
});
