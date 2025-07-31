import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

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

export const getAllPayments = query({
  args: {
    memberId: v.optional(v.id("members")),
    status: v.optional(v.union(
      v.literal("succeeded"),
      v.literal("pending"),
      v.literal("failed"),
      v.literal("refunded"),
      v.literal("partially_refunded")
    )),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    let paymentsQuery;
    
    // Filter by member if specified
    if (args.memberId) {
      paymentsQuery = ctx.db.query("payments").withIndex("by_memberId", (q) => q.eq("memberId", args.memberId!));
    } else {
      paymentsQuery = ctx.db.query("payments").withIndex("by_createdAt");
    }
    
    let payments = await paymentsQuery.order("desc").take(args.limit || 100);
    
    // Additional filtering
    if (args.status) {
      payments = payments.filter(p => p.status === args.status);
    }
    
    if (args.startDate) {
      payments = payments.filter(p => p.createdAt >= args.startDate!);
    }
    
    if (args.endDate) {
      payments = payments.filter(p => p.createdAt <= args.endDate!);
    }
    
    // Get member info for each payment
    const paymentsWithMembers = await Promise.all(
      payments.map(async (payment) => {
        const member = await ctx.db.get(payment.memberId) as Doc<"members"> | null;
        return {
          ...payment,
          member: member ? {
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            tier: member.tier,
          } : null
        };
      })
    );
    
    return paymentsWithMembers;
  },
});

export const getPaymentDetails = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");
    
    const member = await ctx.db.get(payment.memberId);
    
    let subscription = null;
    if (payment.subscriptionId) {
      subscription = await ctx.db.get(payment.subscriptionId);
    }
    
    return {
      payment,
      member,
      subscription,
    };
  },
});

export const getPaymentStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const startDate = args.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000; // Default: last 30 days
    const endDate = args.endDate || Date.now();
    
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_createdAt")
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), startDate),
          q.lte(q.field("createdAt"), endDate)
        )
      )
      .collect();
    
    // Calculate stats
    let totalRevenue = 0;
    let totalRefunds = 0;
    let totalFees = 0;
    let successfulPayments = 0;
    let failedPayments = 0;
    let refundedPayments = 0;
    
    payments.forEach(payment => {
      if (payment.status === "succeeded") {
        totalRevenue += payment.amount;
        successfulPayments++;
        if (payment.transactionFee) {
          totalFees += payment.transactionFee;
        }
      } else if (payment.status === "failed") {
        failedPayments++;
      } else if (payment.status === "refunded" || payment.status === "partially_refunded") {
        refundedPayments++;
        if (payment.refundedAmount) {
          totalRefunds += payment.refundedAmount;
        }
      }
    });
    
    const netRevenue = totalRevenue - totalRefunds - totalFees;
    
    return {
      totalPayments: payments.length,
      successfulPayments,
      failedPayments,
      refundedPayments,
      revenue: {
        gross: totalRevenue,
        refunds: totalRefunds,
        fees: totalFees,
        net: netRevenue,
        formattedGross: `$${(totalRevenue / 100).toFixed(2)}`,
        formattedRefunds: `$${(totalRefunds / 100).toFixed(2)}`,
        formattedFees: `$${(totalFees / 100).toFixed(2)}`,
        formattedNet: `$${(netRevenue / 100).toFixed(2)}`,
      },
      averagePayment: successfulPayments > 0 ? totalRevenue / successfulPayments : 0,
      formattedAveragePayment: successfulPayments > 0 
        ? `$${(totalRevenue / successfulPayments / 100).toFixed(2)}`
        : "$0.00",
    };
  },
});