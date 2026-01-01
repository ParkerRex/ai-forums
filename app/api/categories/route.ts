import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { categories, members } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  rules: z.string().max(2000).optional(),
});

// GET /api/categories - List all categories
export async function GET() {
  try {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.status, "active"))
      .orderBy(desc(categories.postCount));

    return NextResponse.json({ items: result });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json({ error: "Failed to get categories" }, { status: 500 });
  }
}

// POST /api/categories - Create a category (admin only)
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name, displayName, description, icon, rules } = parsed.data;

    // Check if category name already exists
    const existing = await db.query.categories.findFirst({
      where: eq(categories.name, name.toLowerCase().replace(/\s+/g, "-")),
    });

    if (existing) {
      return NextResponse.json({ error: "Category name already exists" }, { status: 409 });
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        name: name.toLowerCase().replace(/\s+/g, "-"),
        displayName,
        description,
        icon,
        rules,
        creatorId: member.id,
        status: "active",
      })
      .returning();

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
