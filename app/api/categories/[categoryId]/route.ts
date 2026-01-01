import { eq, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

const updateCategorySchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  rules: z.string().max(2000).optional(),
  bannerImage: z.string().url().optional(),
  status: z.enum(["active", "inactive", "private"]).optional(),
});

type RouteParams = {
  params: Promise<{ categoryId: string }>;
};

// GET /api/categories/[categoryId] - Get a single category
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { categoryId } = await params;

    // Support both ID and name lookup
    const category = await db.query.categories.findFirst({
      where: or(eq(categories.id, categoryId), eq(categories.name, categoryId)),
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Get category error:", error);
    return NextResponse.json({ error: "Failed to get category" }, { status: 500 });
  }
}

// PATCH /api/categories/[categoryId] - Update a category (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { categoryId } = await params;
    const body = await request.json();
    const parsed = updateCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const [updatedCategory] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, categoryId))
      .returning();

    if (!updatedCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

// DELETE /api/categories/[categoryId] - Soft delete a category (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { categoryId } = await params;

    const [deletedCategory] = await db
      .update(categories)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(categories.id, categoryId))
      .returning();

    if (!deletedCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
