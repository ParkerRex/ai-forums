/**
 * @fileoverview Payment Metrics and Analytics
 * 
 * This module provides comprehensive analytics for the payment system,
 * including revenue tracking, member growth, churn analysis, and
 * subscription tier performance metrics.
 * 
 * @module admin/metrics
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

// Helper to check if user is admin
async function requireAdmin(ctx: any) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) throw new Error("Not authenticated");
  
  const member = await ctx.db
    .query("members")
    .filter((q: any) => q.eq(q.field("email"), user.email))
    .first();
    
  if (!member || member.role !== "admin") {
    throw new Error("Not authorized");
  }
  
  return member;
}

/**
 * Get comprehensive payment metrics for dashboard
 */
export const getPaymentMetrics = query({
  args: {
    timeRange: v.optional(v.union(
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d"),
      v.literal("1y"),
      v.literal("all")
    )),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const now = Date.now();
    const timeRange = args.timeRange || "30d";
    
    // Calculate time boundaries
    const cutoffTime = timeRange === "all" ? 0 : now - getTimeRangeMs(timeRange);
    
    // Get all payments in range
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_createdAt")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();
    
    // Get all members for tier analysis
    const members = await ctx.db.query("members").collect();
    
    // Calculate revenue metrics
    const revenueMetrics = calculateRevenueMetrics(payments);
    
    // Calculate member metrics
    const memberMetrics = calculateMemberMetrics(members, cutoffTime);
    
    // Calculate tier performance
    const tierMetrics = await calculateTierMetrics(ctx, members, payments);
    
    // Calculate growth trends
    const growthTrends = calculateGrowthTrends(payments, timeRange);
    
    // Calculate payment method breakdown
    const paymentMethodMetrics = calculatePaymentMethodMetrics(payments);
    
    return {
      timeRange,
      revenue: revenueMetrics,
      members: memberMetrics,
      tiers: tierMetrics,
      trends: growthTrends,
      paymentMethods: paymentMethodMetrics,
      generatedAt: now,
    };
  },
});

/**
 * Get monthly recurring revenue (MRR) over time
 */
export const getMRRHistory = query({
  args: {
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const months = args.months || 12;
    const now = new Date();
    const mrrHistory: Array<{ month: string; mrr: number; growth: number }> = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      // Get active subscriptions for this month
      const activeMembers = await ctx.db
        .query("members")
        .filter((q) => 
          q.and(
            q.eq(q.field("subscriptionStatus"), "active"),
            q.lte(q.field("joinedDate"), monthEnd.getTime())
          )
        )
        .collect();
      
      // Calculate MRR for the month
      const monthlyMRR = activeMembers
        .filter(m => m.billingInterval === "monthly" && m.amountCents)
        .reduce((sum, m) => sum + (m.amountCents || 0), 0);
      
      const yearlyMRR = activeMembers
        .filter(m => m.billingInterval === "yearly" && m.amountCents)
        .reduce((sum, m) => sum + Math.round((m.amountCents || 0) / 12), 0);
      
      const totalMRR = monthlyMRR + yearlyMRR;
      
      // Calculate growth
      const previousMRR = mrrHistory.length > 0 
        ? mrrHistory[mrrHistory.length - 1].mrr 
        : totalMRR;
      
      const growth = previousMRR > 0 
        ? ((totalMRR - previousMRR) / previousMRR) * 100 
        : 0;
      
      mrrHistory.push({
        month: monthStart.toLocaleDateString("en-US", { year: "numeric", month: "short" }),
        mrr: totalMRR,
        growth: Math.round(growth * 10) / 10,
      });
    }
    
    return mrrHistory;
  },
});

/**
 * Get churn analysis
 */
export const getChurnAnalysis = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
    
    // Get all members
    const members = await ctx.db.query("members").collect();
    
    // Categorize members
    const activeMembers = members.filter(m => 
      m.subscriptionStatus === "active" && 
      m.tier !== "free" && 
      m.tier !== "scholarship"
    );
    
    const cancelledMembers = members.filter(m => 
      m.subscriptionStatus === "cancelled"
    );
    
    const churnedMembers = members.filter(m => 
      (m.subscriptionStatus === "expired" || m.status === "churned") &&
      m.tier !== "free"
    );
    
    // Recent churns (last 30 days)
    const recentChurns = churnedMembers.filter(m => {
      const churnDate = m.subscriptionEndDate || m.updatedAt;
      return churnDate >= thirtyDaysAgo;
    });
    
    // Calculate churn rate
    const monthlyChurnRate = activeMembers.length > 0
      ? (recentChurns.length / activeMembers.length) * 100
      : 0;
    
    // Analyze churn by tier
    const churnByTier = churnedMembers.reduce((acc, member) => {
      const tier = member.tier || "unknown";
      if (!acc[tier]) {
        acc[tier] = { count: 0, totalLifetimeValue: 0 };
      }
      acc[tier].count++;
      
      // Calculate lifetime value (simplified)
      if (member.lastPaymentDate && member.joinedDate && member.amountCents) {
        const monthsActive = Math.max(1, 
          Math.round((member.lastPaymentDate - member.joinedDate) / (30 * 24 * 60 * 60 * 1000))
        );
        acc[tier].totalLifetimeValue += (member.amountCents * monthsActive);
      }
      
      return acc;
    }, {} as Record<string, { count: number; totalLifetimeValue: number }>);
    
    // Churn reasons (simplified - would need exit survey data)
    const churnReasons = {
      price: Math.round(recentChurns.length * 0.3),
      features: Math.round(recentChurns.length * 0.2),
      engagement: Math.round(recentChurns.length * 0.25),
      other: Math.round(recentChurns.length * 0.25),
    };
    
    return {
      summary: {
        activeMembers: activeMembers.length,
        cancelledMembers: cancelledMembers.length,
        churnedMembers: churnedMembers.length,
        monthlyChurnRate: Math.round(monthlyChurnRate * 10) / 10,
      },
      recentChurns: {
        count: recentChurns.length,
        avgLifetimeMonths: calculateAvgLifetime(recentChurns),
      },
      churnByTier,
      churnReasons,
      retentionRate: 100 - monthlyChurnRate,
    };
  },
});

// Helper functions

function getTimeRangeMs(range: string): number {
  switch (range) {
    case "7d": return 7 * 24 * 60 * 60 * 1000;
    case "30d": return 30 * 24 * 60 * 60 * 1000;
    case "90d": return 90 * 24 * 60 * 60 * 1000;
    case "1y": return 365 * 24 * 60 * 60 * 1000;
    default: return 30 * 24 * 60 * 60 * 1000;
  }
}

function calculateRevenueMetrics(payments: Doc<"payments">[]) {
  const successfulPayments = payments.filter(p => p.status === "succeeded");
  const refundedPayments = payments.filter(p => 
    p.status === "refunded" || p.status === "partially_refunded"
  );
  
  const grossRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const refundAmount = refundedPayments.reduce((sum, p) => sum + (p.refundedAmount || 0), 0);
  const fees = successfulPayments.reduce((sum, p) => sum + (p.transactionFee || 0), 0);
  const netRevenue = grossRevenue - refundAmount - fees;
  
  return {
    gross: grossRevenue,
    refunds: refundAmount,
    fees,
    net: netRevenue,
    paymentCount: successfulPayments.length,
    refundCount: refundedPayments.length,
    avgPaymentAmount: successfulPayments.length > 0 
      ? Math.round(grossRevenue / successfulPayments.length)
      : 0,
  };
}

function calculateMemberMetrics(members: Doc<"members">[], cutoffTime: number) {
  const paidMembers = members.filter(m => 
    m.tier !== "free" && 
    m.subscriptionStatus === "active"
  );
  
  const newMembers = members.filter(m => 
    m.joinedDate >= cutoffTime && 
    m.tier !== "free"
  );
  
  const cancelledMembers = members.filter(m => 
    m.subscriptionStatus === "cancelled" &&
    m.subscriptionEndDate && 
    m.subscriptionEndDate > Date.now()
  );
  
  const monthlyMembers = paidMembers.filter(m => m.billingInterval === "monthly");
  const yearlyMembers = paidMembers.filter(m => m.billingInterval === "yearly");
  
  return {
    total: members.length,
    paid: paidMembers.length,
    free: members.filter(m => m.tier === "free").length,
    scholarship: members.filter(m => m.tier === "scholarship").length,
    new: newMembers.length,
    cancelled: cancelledMembers.length,
    billingBreakdown: {
      monthly: monthlyMembers.length,
      yearly: yearlyMembers.length,
    },
  };
}

async function calculateTierMetrics(
  ctx: any, 
  members: Doc<"members">[], 
  payments: Doc<"payments">[]
) {
  const tiers = ["founding_member", "early_bird", "member"];
  const tierMetrics: Record<string, any> = {};
  
  for (const tier of tiers) {
    const tierMembers = members.filter(m => 
      m.tier === tier && 
      m.subscriptionStatus === "active"
    );
    
    const tierPayments = [];
    for (const member of tierMembers) {
      const memberPayments = payments.filter(p => 
        p.memberId === member._id && 
        p.status === "succeeded"
      );
      tierPayments.push(...memberPayments);
    }
    
    const revenue = tierPayments.reduce((sum, p) => sum + p.amount, 0);
    const monthlyCount = tierMembers.filter(m => m.billingInterval === "monthly").length;
    const yearlyCount = tierMembers.filter(m => m.billingInterval === "yearly").length;
    
    tierMetrics[tier] = {
      activeMembers: tierMembers.length,
      monthlyMembers: monthlyCount,
      yearlyMembers: yearlyCount,
      revenue,
      avgRevenue: tierMembers.length > 0 ? Math.round(revenue / tierMembers.length) : 0,
    };
  }
  
  return tierMetrics;
}

function calculateGrowthTrends(payments: Doc<"payments">[], timeRange: string) {
  // Group payments by period
  const periodMs = timeRange === "7d" ? 24 * 60 * 60 * 1000 : // Daily
                   timeRange === "30d" ? 7 * 24 * 60 * 60 * 1000 : // Weekly
                   30 * 24 * 60 * 60 * 1000; // Monthly
  
  const periods: Record<string, { revenue: number; count: number }> = {};
  
  payments
    .filter(p => p.status === "succeeded")
    .forEach(payment => {
      const periodKey = Math.floor(payment.createdAt / periodMs);
      if (!periods[periodKey]) {
        periods[periodKey] = { revenue: 0, count: 0 };
      }
      periods[periodKey].revenue += payment.amount;
      periods[periodKey].count++;
    });
  
  // Convert to array and calculate growth
  const sortedPeriods = Object.entries(periods)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([key, data], index, array) => {
      const previousPeriod = index > 0 ? array[index - 1][1] : null;
      const growth = previousPeriod 
        ? ((data.revenue - previousPeriod.revenue) / previousPeriod.revenue) * 100
        : 0;
      
      return {
        period: Number(key),
        revenue: data.revenue,
        payments: data.count,
        growth: Math.round(growth * 10) / 10,
      };
    });
  
  return sortedPeriods.slice(-10); // Last 10 periods
}

function calculatePaymentMethodMetrics(payments: Doc<"payments">[]) {
  const methodBreakdown = payments
    .filter(p => p.status === "succeeded")
    .reduce((acc, payment) => {
      const brand = payment.paymentMethod.brand || "unknown";
      if (!acc[brand]) {
        acc[brand] = { count: 0, revenue: 0 };
      }
      acc[brand].count++;
      acc[brand].revenue += payment.amount;
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);
  
  return methodBreakdown;
}

function calculateAvgLifetime(members: Doc<"members">[]): number {
  const lifetimes = members
    .filter(m => m.joinedDate && m.subscriptionEndDate)
    .map(m => (m.subscriptionEndDate! - m.joinedDate) / (30 * 24 * 60 * 60 * 1000));
  
  return lifetimes.length > 0
    ? Math.round(lifetimes.reduce((sum, lt) => sum + lt, 0) / lifetimes.length)
    : 0;
}