import { and, desc, eq, like, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { forbiddenResponse, requireAdmin } from "@/lib/auth";

// GET /api/admin/members - List members with admin details
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const _tier = searchParams.get("tier");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const conditions = [];

    // Status filter
    if (status && status !== "all") {
      conditions.push(eq(members.status, status));
    }

    // Search filter
    if (search) {
      conditions.push(
        or(
          like(members.firstName, `%${search}%`),
          like(members.lastName, `%${search}%`),
          like(members.email, `%${search}%`),
        ) as ReturnType<typeof like>,
      );
    }

    // Note: tier filtering would need a subscriptions table join
    // For now, we filter on the members table if tier column exists

    const result = await db
      .select({
        _id: members.id,
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        email: members.email,
        slug: members.slug,
        avatarUrl: members.avatarUrl,
        bio: members.bio,
        role: members.role,
        status: members.status,
        postCount: members.postCount,
        commentCount: members.commentCount,
        netVoteCount: members.netVoteCount,
        joinedDate: members.joinedDate,
        lastOnline: members.lastOnline,
        country: members.country,
        location: members.location,
      })
      .from(members)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(members.joinedDate))
      .limit(limit);

    // Map results to admin format with computed fields
    const membersWithStatus = result.map((m) => ({
      ...m,
      // Convert timestamps to numbers for client
      joinedDate: m.joinedDate ? new Date(m.joinedDate).getTime() : null,
      lastOnline: m.lastOnline ? new Date(m.lastOnline).getTime() : null,
      // Add placeholder subscription fields (would need joins in real implementation)
      tier: null as string | null,
      billingInterval: null as string | null,
      subscriptionStatus: null as string | null,
      subscriptionEndDate: null as number | null,
      amountCents: null as number | null,
    }));

    return NextResponse.json(membersWithStatus);
  } catch (error) {
    console.error("Admin get members error:", error);
    return NextResponse.json({ error: "Failed to get members" }, { status: 500 });
  }
}
