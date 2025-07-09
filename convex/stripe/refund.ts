import { v } from "convex/values";
import { mutation, internalMutation, action, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";

// Helper to check if user is admin
async function requireAdmin(ctx: any): Promise<Doc<"members">> {
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

// Internal mutation to update payment records after refund
export const updatePaymentForRefund = internalMutation({
  args: {
    paymentId: v.id("payments"),
    refundAmount: v.number(),
    refundId: v.string(),
    adminId: v.id("members"),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");
    
    // Update original payment
    const newRefundedAmount = (payment.refundedAmount || 0) + args.refundAmount;
    const isFullyRefunded = newRefundedAmount >= payment.amount;
    
    await ctx.db.patch(args.paymentId, {
      refundedAmount: newRefundedAmount,
      status: isFullyRefunded ? "refunded" : "partially_refunded",
    });
    
    // Create audit record for the refund
    await ctx.db.insert("payments", {
      memberId: payment.memberId,
      subscriptionId: payment.subscriptionId,
      stripePaymentIntentId: args.refundId,
      stripeInvoiceId: payment.stripeInvoiceId,
      amount: -args.refundAmount, // Negative amount for refund
      currency: payment.currency,
      status: "refunded",
      description: `Refund: ${args.reason || "Admin initiated"}${args.notes ? ` - ${args.notes}` : ""}`,
      paymentMethod: payment.paymentMethod,
      transactionFee: 0, // Stripe may refund some fees
      netAmount: -args.refundAmount,
      createdAt: Date.now(),
      // Store admin info in payment record for audit
      failureReason: `Refunded by admin: ${args.adminId}`,
    });
    
    // Create notification for the member
    await ctx.db.insert("notifications", {
      recipientId: payment.memberId,
      type: "payment_reminder" as const,
      entityType: "payment" as const,
      entityId: args.paymentId,
      actorId: args.adminId,
      message: `Your payment of $${(args.refundAmount / 100).toFixed(2)} has been refunded`,
      read: false,
      createdAt: Date.now(),
    });
  },
});

// Main refund action that calls Stripe
export const refundPayment = action({
  args: {
    paymentId: v.id("payments"),
    amount: v.optional(v.number()), // Amount in cents, optional for partial refunds
    reason: v.optional(v.union(
      v.literal("duplicate"),
      v.literal("fraudulent"),
      v.literal("requested_by_customer"),
      v.literal("other")
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; refundId: string; refundedAmount: number; status: "fully_refunded" | "partially_refunded" }> => {
    // First, verify admin status and get payment details
    const { payment, admin, refundAmount }: { payment: Doc<"payments">; admin: Doc<"members">; refundAmount: number } = await ctx.runMutation(
      internal.stripe.refund.validateRefund,
      args
    );
    
    // Call Stripe API
    const stripe = new (await import("stripe")).default(
      process.env.STRIPE_SECRET_KEY!
    );
    
    try {
      // Create refund in Stripe
      const refund: any = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: refundAmount,
        reason: args.reason as any,
        metadata: {
          admin_id: admin._id,
          admin_email: admin.email,
          notes: args.notes || "",
          payment_id: args.paymentId,
        },
      });
      
      // Update our database
      await ctx.runMutation(internal.stripe.refund.updatePaymentForRefund, {
        paymentId: args.paymentId,
        refundAmount,
        refundId: refund.id,
        adminId: admin._id,
        reason: args.reason,
        notes: args.notes,
      });
      
      return {
        success: true,
        refundId: refund.id,
        refundedAmount: refundAmount,
        status: refundAmount >= payment.amount ? "fully_refunded" : "partially_refunded",
      };
    } catch (error: any) {
      console.error("Stripe refund error:", error);
      
      // Log failed refund attempt
      await ctx.runMutation(internal.stripe.refund.logFailedRefund, {
        paymentId: args.paymentId,
        adminId: admin._id,
        error: error.message,
        amount: refundAmount,
      });
      
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  },
});

// Internal mutation to validate refund request
export const validateRefund = internalMutation({
  args: {
    paymentId: v.id("payments"),
    amount: v.optional(v.number()),
    reason: v.optional(v.union(
      v.literal("duplicate"),
      v.literal("fraudulent"),
      v.literal("requested_by_customer"),
      v.literal("other")
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    // Get the payment
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }
    
    // Check if payment can be refunded
    if (payment.status !== "succeeded") {
      throw new Error("Only successful payments can be refunded");
    }
    
    // Calculate refund amount
    const refundAmount = args.amount || payment.amount;
    const alreadyRefunded = payment.refundedAmount || 0;
    const remainingRefundable = payment.amount - alreadyRefunded;
    
    if (refundAmount <= 0) {
      throw new Error("Refund amount must be greater than zero");
    }
    
    if (refundAmount > remainingRefundable) {
      throw new Error(`Cannot refund more than $${(remainingRefundable / 100).toFixed(2)}`);
    }
    
    // Check if payment is too old (Stripe has limits)
    const paymentAge = Date.now() - payment.createdAt;
    const maxRefundAge = 180 * 24 * 60 * 60 * 1000; // 180 days
    
    if (paymentAge > maxRefundAge) {
      throw new Error("Payment is too old to refund (>180 days)");
    }
    
    return { payment, admin, refundAmount };
  },
});

// Internal mutation to log failed refund attempts
export const logFailedRefund = internalMutation({
  args: {
    paymentId: v.id("payments"),
    adminId: v.id("members"),
    error: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    console.error(`Failed refund attempt by admin ${args.adminId} for payment ${args.paymentId}: ${args.error}`);
    
    // Could store this in a separate audit log table if needed
    // For now, just log it
  },
});

// Get refund eligibility for a payment
export const getRefundEligibility = query({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      return { eligible: false, reason: "Payment not found" };
    }
    
    if (payment.status !== "succeeded") {
      return { eligible: false, reason: "Only successful payments can be refunded" };
    }
    
    const alreadyRefunded = payment.refundedAmount || 0;
    const remainingRefundable = payment.amount - alreadyRefunded;
    
    if (remainingRefundable <= 0) {
      return { eligible: false, reason: "Payment has been fully refunded" };
    }
    
    const paymentAge = Date.now() - payment.createdAt;
    const maxRefundAge = 180 * 24 * 60 * 60 * 1000; // 180 days
    
    if (paymentAge > maxRefundAge) {
      return { eligible: false, reason: "Payment is too old to refund (>180 days)" };
    }
    
    return {
      eligible: true,
      maxRefundAmount: remainingRefundable,
      alreadyRefunded,
      originalAmount: payment.amount,
    };
  },
});