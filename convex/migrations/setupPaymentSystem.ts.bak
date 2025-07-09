/**
 * @fileoverview Payment System Setup Migration
 * 
 * This migration sets up the payment system by:
 * 1. Creating missing member accounts (Todd and Jonathan)
 * 2. Creating Stripe customers for all members
 * 3. Populating billing data from the prepared migration file
 * 4. Setting appropriate tiers and subscription statuses
 * 
 * @author VAI Development Team
 * @version 1.0.0
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Import billing data - in production this would come from an API or be passed as args
const billingData = require("../../migration-data/members-billing-final.json") as BillingMember[];

// Type definition for billing data
interface BillingMember {
  email: string;
  firstName: string;
  lastName: string;
  tier: "free" | "scholarship" | "founding_member" | "early_bird" | "member";
  status: "active" | "cancelled" | "churned";
  billingInterval?: "monthly" | "yearly";
  amountCents?: number;
  lastPaymentDate?: string;
  subscriptionEndDate?: string;
  joinedDate?: string;
  bio?: string;
}

/**
 * Helper to generate a temporary Stripe customer ID
 * In production, this will be replaced with actual Stripe API calls
 */
function generateStripeCustomerId(email: string): string {
  // TODO: Replace with actual Stripe API call to create customer
  return `cus_temp_${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
}

export const runMigration = mutation({
  args: {},
  handler: async ({ db }) => {
    console.log("Starting payment system migration...");
    
    // Step 1: Create missing member accounts (Todd and Jonathan)
    const newMembers = [
      { 
        email: "todd@bonnewell.com", 
        firstName: "Todd", 
        lastName: "Bonnewell",
        slug: "todd-bonnewell",
        tier: "early_bird" as const,
        subscriptionStatus: "active" as const,
        billingInterval: "monthly" as const,
        stripeCustomerId: generateStripeCustomerId("todd@bonnewell.com"),
      },
      { 
        email: "jonathan@stokkland.com", 
        firstName: "Jonathan", 
        lastName: "Stokkland",
        slug: "jonathan-stokkland",
        tier: "early_bird" as const,
        subscriptionStatus: "active" as const,
        billingInterval: "monthly" as const,
        stripeCustomerId: generateStripeCustomerId("jonathan@stokkland.com"),
      }
    ];
    
    // Create new member accounts
    for (const newMember of newMembers) {
      const existing = await db.query("members")
        .filter(q => q.eq(q.field("email"), newMember.email))
        .first();
      
      if (!existing) {
        await db.insert("members", {
          ...newMember,
          role: "user",
          status: "active",
          joinedDate: Date.now(),
          updatedAt: Date.now(),
          lastOnline: Date.now(),
          bio: "",
        });
        console.log(`Created new member: ${newMember.email}`);
      }
    }
    
    // Step 2: Update all existing members with billing data
    let processedCount = 0;
    let errorCount = 0;
    
    // First, handle members from the billing data
    for (const memberData of billingData) {
      try {
        const existing = await db.query("members")
          .filter(q => q.eq(q.field("email"), memberData.email))
          .first();
        
        if (existing) {
          const updates: any = {
            tier: memberData.tier as any,
            subscriptionStatus: memberData.status === "active" || memberData.tier === "scholarship" 
              ? "active" 
              : memberData.status === "cancelled" 
              ? "cancelled" 
              : "expired",
          };
          
          // Only add optional fields if they exist
          if (memberData.subscriptionEndDate) {
            updates.subscriptionEndDate = new Date(memberData.subscriptionEndDate).getTime();
          }
          if (memberData.billingInterval) {
            updates.billingInterval = memberData.billingInterval as "monthly" | "yearly";
          }
          if (memberData.lastPaymentDate) {
            updates.lastPaymentDate = new Date(memberData.lastPaymentDate).getTime();
          }
          if (memberData.amountCents !== undefined) {
            updates.amountCents = memberData.amountCents;
          }
          
          // Generate Stripe customer ID if not already present
          if (!existing.stripeCustomerId) {
            updates.stripeCustomerId = generateStripeCustomerId(existing.email);
          }
          
          // Add Stripe subscription ID for paying members
          if (memberData.tier !== "free" && memberData.tier !== "scholarship" && memberData.status === "active") {
            updates.stripeSubscriptionId = `sub_temp_${existing.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
          }
          
          await db.patch(existing._id, updates);
          processedCount++;
        } else {
          console.log(`Warning: Member not found: ${memberData.email}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error processing member ${memberData.email}:`, error);
        errorCount++;
      }
    }
    
    // Step 3: Update any remaining members who aren't in the billing data (set them as free tier)
    const allMembers = await db.query("members").collect();
    const billingEmails = new Set(billingData.map(m => m.email));
    const newMemberEmails = new Set(newMembers.map(m => m.email));
    
    for (const member of allMembers) {
      if (!billingEmails.has(member.email) && !newMemberEmails.has(member.email)) {
        try {
          // This member is not in billing data, so they're free tier
          const updates: any = {
            tier: "free",
            subscriptionStatus: "none",
          };
          
          // Generate Stripe customer ID if not already present
          if (!member.stripeCustomerId) {
            updates.stripeCustomerId = generateStripeCustomerId(member.email);
          }
          
          await db.patch(member._id, updates);
          processedCount++;
        } catch (error) {
          console.error(`Error updating free tier member ${member.email}:`, error);
          errorCount++;
        }
      }
    }
    
    console.log(`Migration completed. Processed: ${processedCount}, Errors: ${errorCount}`);
    
    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
      totalMembers: allMembers.length,
    };
  },
});