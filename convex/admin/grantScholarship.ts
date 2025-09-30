import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthenticatedMember } from "../auth";

export const grantScholarshipStatus = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    // Ensure the requesting user is an admin
    const admin = await getAuthenticatedMember(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get the target member
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Note: Scholarships are now handled via Stripe coupons, not tier-based
    // This function is deprecated - scholarships should be granted via Stripe coupons
    return {
      success: false,
      message:
        "Scholarships are now handled via Stripe coupons. Use early_bird tier with 100% discount coupon.",
    };
  },
});

export const revokeScholarshipStatus = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    // Ensure the requesting user is an admin
    const admin = await getAuthenticatedMember(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get the target member
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Note: Scholarships are now handled via Stripe coupons, not tier-based
    // This function is deprecated - scholarships should be managed via Stripe dashboard
    return {
      success: false,
      message: "Scholarships are now handled via Stripe coupons. Manage via Stripe dashboard.",
    };
  },
});
