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

    // Check if member already has scholarship status
    if (member.tier === "scholarship") {
      return { success: true, message: "Member already has scholarship status" };
    }

    // Cancel any existing Stripe subscription if they have one
    if (member.stripeSubscriptionId) {
      // Note: In production, you'd want to call Stripe API to cancel the subscription
      // For now, we'll just update the database
      await ctx.db.patch(args.memberId, {
        tier: "scholarship",
        subscriptionStatus: "active",
        stripeSubscriptionId: undefined,
        subscriptionEndDate: undefined,
        billingInterval: undefined,
      });

      // Log the scholarship grant
      console.log(`Scholarship granted to ${member.email} by ${admin.email}`);
    } else {
      // No existing subscription, just grant scholarship
      await ctx.db.patch(args.memberId, {
        tier: "scholarship",
        subscriptionStatus: "active",
      });
    }

    return { 
      success: true, 
      message: `Scholarship status granted to ${member.firstName} ${member.lastName}` 
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

    // Check if member has scholarship status
    if (member.tier !== "scholarship") {
      return { success: true, message: "Member does not have scholarship status" };
    }

    // Revoke scholarship by setting to free tier
    await ctx.db.patch(args.memberId, {
      tier: "free",
      subscriptionStatus: "none",
    });

    // Log the revocation
    console.log(`Scholarship revoked from ${member.email} by ${admin.email}`);

    return { 
      success: true, 
      message: `Scholarship status revoked from ${member.firstName} ${member.lastName}` 
    };
  },
});