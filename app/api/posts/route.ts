import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { withAuth } from "@/lib/api/middleware";
import { postRepository } from "@/lib/repositories";

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  categoryId: z.string().uuid(),
  type: z.enum(["text", "image", "video", "link", "poll"]).default("text"),
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
        // PDF specific
        pageCount: z.number().optional(),
        fileSize: z.number().optional(),
        // YouTube specific
        videoId: z.string().optional(),
        title: z.string().optional(),
        duration: z.string().optional(),
        channelName: z.string().optional(),
        // Video specific
        videoDuration: z.string().optional(),
        format: z.string().optional(),
        resolution: z.string().optional(),
        codec: z.string().optional(),
      }),
    )
    .optional(),
  // Media fields
  mediaUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  aspectRatio: z.number().optional(),
  mediaWidth: z.number().optional(),
  mediaHeight: z.number().optional(),
  // Link fields
  linkUrl: z.string().url().optional(),
  linkTitle: z.string().optional(),
  linkDescription: z.string().optional(),
  linkImage: z.string().optional(),
  // Poll fields
  pollOptions: z.array(z.string().min(1)).optional(),
  pollDuration: z.number().optional(), // Duration in hours
  // Preview
  preview: z.string().optional(),
  isFree: z.boolean().default(true),
});

// GET /api/posts - List posts with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const slug = searchParams.get("slug") ?? undefined;
    const sortBy = (searchParams.get("sortBy") as "newest" | "popular") || "newest";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const result = await postRepository.findMany({
      categoryId,
      slug,
      sortBy,
      limit,
    });

    return NextResponse.json({
      items: result.items,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    console.error("Get posts error:", error);
    return NextResponse.json({ error: "Failed to get posts" }, { status: 500 });
  }
}

// POST /api/posts - Create a new post
export const POST = withAuth(async (request, _context, member) => {
  try {
    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const {
      title,
      content,
      categoryId,
      type,
      attachments,
      mediaUrl,
      thumbnailUrl,
      aspectRatio,
      mediaWidth,
      mediaHeight,
      linkUrl,
      linkTitle,
      linkDescription,
      linkImage,
      pollOptions,
      pollDuration,
      preview,
      isFree,
    } = parsed.data;

    // Verify category exists
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Convert poll options to proper format if it's a poll post
    let formattedPollOptions: Array<{ id: string; text: string; votes: number }> | undefined;
    let pollEndsAt: Date | undefined;

    if (type === "poll" && pollOptions && pollOptions.length >= 2) {
      formattedPollOptions = pollOptions.map((text, index) => ({
        id: `option-${index + 1}`,
        text,
        votes: 0,
      }));
      if (pollDuration) {
        pollEndsAt = new Date(Date.now() + pollDuration * 60 * 60 * 1000);
      }
    }

    const newPost = await postRepository.create({
      title,
      content,
      categoryId,
      memberId: member.id,
      type,
      attachments: attachments as Parameters<typeof postRepository.create>[0]["attachments"],
      mediaUrl,
      thumbnailUrl,
      aspectRatio,
      mediaWidth,
      mediaHeight,
      linkUrl,
      linkTitle,
      linkDescription,
      linkImage,
      pollOptions: formattedPollOptions,
      pollEndsAt,
      preview,
      isFree,
    });

    return NextResponse.json(
      {
        ...newPost,
        postId: newPost.id,
        categoryName: category.name,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
});
