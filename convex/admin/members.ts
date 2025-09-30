import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type MutationCtx, mutation, type QueryCtx, query } from "../_generated/server";

// Helper to check if user is admin
async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) throw new Error("Not authenticated");

  const member = await ctx.db
    .query("members")
    .filter((q) => q.eq(q.field("email"), user.email))
    .first();

  if (!member || member.role !== "admin") {
    throw new Error("Not authorized");
  }

  return member;
}

// Helper to calculate member status
function getMemberStatus(member: Doc<"members">): "active" | "cancelled" | "churned" {
  if (member.subscriptionStatus === "active") return "active";
  if (
    member.subscriptionStatus === "cancelled" &&
    member.subscriptionEndDate &&
    member.subscriptionEndDate > Date.now()
  ) {
    return "cancelled";
  }
  return "churned";
}

export const getAllMembersForAdmin = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("cancelled"), v.literal("churned"))),
    search: v.optional(v.string()),
    sortBy: v.optional(
      v.union(v.literal("joinedAt"), v.literal("lastActiveAt"), v.literal("lastPaymentDate")),
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let members = await ctx.db.query("members").collect();

    // Filter by status
    if (args.status) {
      members = members.filter((member) => getMemberStatus(member) === args.status);
    }

    // Search by name or email
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      members = members.filter(
        (member) =>
          member.firstName?.toLowerCase().includes(searchLower) ||
          member.lastName?.toLowerCase().includes(searchLower) ||
          member.email.toLowerCase().includes(searchLower),
      );
    }

    // Sort members
    const sortBy = args.sortBy || "joinedAt";
    const sortOrder = args.sortOrder || "desc";

    members.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortBy) {
        case "joinedAt":
          aVal = a.joinedDate || 0;
          bVal = b.joinedDate || 0;
          break;
        case "lastActiveAt":
          aVal = a.lastOnline || 0;
          bVal = b.lastOnline || 0;
          break;
        case "lastPaymentDate":
          aVal = a.lastPaymentDate || 0;
          bVal = b.lastPaymentDate || 0;
          break;
        default:
          aVal = a.joinedDate || 0;
          bVal = b.joinedDate || 0;
      }

      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });

    // Get subscription info for each member
    const membersWithStatus = await Promise.all(
      members.map(async (member) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
          .first();

        return {
          ...member,
          status: getMemberStatus(member),
          subscription,
        };
      }),
    );

    return membersWithStatus;
  },
});

export const getMemberDetailsForAdmin = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    // Get subscription info
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .first();

    // Get payment history
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .take(50);

    // Get recent activity
    const recentPosts = await ctx.db
      .query("posts")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .take(5);

    const recentComments = await ctx.db
      .query("comments")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .take(5);

    return {
      member,
      status: getMemberStatus(member),
      subscription,
      payments,
      activity: {
        posts: recentPosts,
        comments: recentComments,
        postCount: member.postCount || 0,
        commentCount: member.commentCount || 0,
      },
    };
  },
});

export const getMembershipStats = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const members = await ctx.db.query("members").collect();

    // Calculate stats by tier
    const tierStats: Record<"founding_member" | "early_bird" | "member" | "scholarship", number> = {
      founding_member: 0,
      early_bird: 0,
      member: 0,
      scholarship: 0,
    };

    // Calculate stats by status
    const statusStats = {
      active: 0,
      cancelled: 0,
      churned: 0,
    };

    // Calculate revenue
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;

    members.forEach((member) => {
      // Tier stats
      if (member.tier) {
        tierStats[member.tier]++;
      }

      // Status stats
      const status = getMemberStatus(member);
      statusStats[status]++;

      // Revenue calculation (only for active paid members)
      if (member.subscriptionStatus === "active") {
        if (member.billingInterval === "monthly" && member.amountCents) {
          monthlyRevenue += member.amountCents;
        } else if (member.billingInterval === "yearly" && member.amountCents) {
          yearlyRevenue += member.amountCents;
        }
      }
    });

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = monthlyRevenue + yearlyRevenue / 12;

    return {
      totalMembers: members.length,
      tierStats,
      statusStats,
      revenue: {
        mrr,
        monthlyRevenue,
        yearlyRevenue,
        formattedMrr: `$${(mrr / 100).toFixed(2)}`,
        formattedMonthly: `$${(monthlyRevenue / 100).toFixed(2)}`,
        formattedYearly: `$${(yearlyRevenue / 100).toFixed(2)}`,
      },
    };
  },
});

export const updateMemberTier = mutation({
  args: {
    memberId: v.id("members"),
    tier: v.union(v.literal("founding_member"), v.literal("early_bird"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.memberId, {
      tier: args.tier,
      // No additional side effects for tier change now that scholarships are handled via coupons
    });

    return { success: true };
  },
});

export const updateMemberSubscriptionStatus = mutation({
  args: {
    memberId: v.id("members"),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("past_due"),
      v.literal("expired"),
    ),
    subscriptionEndDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.memberId, {
      subscriptionStatus: args.status,
      ...(args.subscriptionEndDate ? { subscriptionEndDate: args.subscriptionEndDate } : {}),
    });

    return { success: true };
  },
});

export const updateMemberRole = mutation({
  args: {
    memberId: v.id("members"),
    role: v.union(v.literal("user"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.memberId, {
      role: args.role,
    });

    return { success: true };
  },
});
