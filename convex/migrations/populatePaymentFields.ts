/**
 * Migration to populate payment fields for existing members
 * 
 * This migration sets default values for the new payment fields
 * added to the members table.
 */

import { mutation } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

export const populatePaymentFields = mutation({
  handler: async (ctx) => {
    // Get all members without payment fields set
    const members = await ctx.db.query("members").collect();
    
    let updated = 0;
    
    for (const member of members) {
      const updates: Partial<Doc<"members">> = {};
      
      // Set default tier if not set
      if (!member.tier) {
        updates.tier = "member";
      }
      
      // Set default subscription status if not set
      if (!member.subscriptionStatus) {
        updates.subscriptionStatus = "none";
      }
      
      // Set empty stripe customer ID if not set
      if (!member.stripeCustomerId) {
        updates.stripeCustomerId = "";
      }
      
      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(member._id, updates);
        updated++;
      }
    }
    
    return {
      total: members.length,
      updated,
      message: `Successfully updated ${updated} members with default payment fields`
    };
  },
});