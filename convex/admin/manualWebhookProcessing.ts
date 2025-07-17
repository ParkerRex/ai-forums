import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import Stripe from "stripe";

/**
 * Manual webhook processing for debugging payment flow issues
 * This allows admins to manually trigger webhook processing for specific Stripe events
 */

/**
 * Manually process a checkout session by fetching it from Stripe and triggering webhook processing
 */
export const manuallyProcessCheckoutSession = internalAction({
  args: {
    checkoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey);

    try {
      // Fetch the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(args.checkoutSessionId, {
        expand: ['customer', 'subscription', 'line_items'],
      });

      console.log(`[MANUAL WEBHOOK] Processing checkout session: ${session.id}`);
      console.log(`[MANUAL WEBHOOK] Payment status: ${session.payment_status}`);
      console.log(`[MANUAL WEBHOOK] Customer: ${session.customer}`);
      console.log(`[MANUAL WEBHOOK] Subscription: ${session.subscription}`);

      if (session.payment_status !== 'paid') {
        throw new Error(`Checkout session payment status is ${session.payment_status}, not paid`);
      }

      // Create a synthetic webhook event ID for tracking
      const syntheticEventId = `manual_${session.id}_${Date.now()}`;

      // Process the checkout session completion
      await ctx.runMutation(internal.admin.manualWebhookProcessing.processCheckoutSessionCompleted, {
        stripeEventId: syntheticEventId,
        sessionData: session,
      });

      return {
        success: true,
        sessionId: session.id,
        customerId: session.customer,
        subscriptionId: session.subscription,
        eventId: syntheticEventId,
      };
    } catch (error) {
      console.error(`[MANUAL WEBHOOK] Error processing checkout session:`, error);
      throw error;
    }
  },
});

/**
 * Internal mutation to process checkout session completion manually
 */
export const processCheckoutSessionCompleted = internalMutation({
  args: {
    stripeEventId: v.string(),
    sessionData: v.any(), // Stripe checkout session object
  },
  handler: async (ctx, args) => {
    const session = args.sessionData as Stripe.Checkout.Session;

    // Record the manual webhook event
    await ctx.db.insert("stripeWebhookEvents", {
      stripeEventId: args.stripeEventId,
      type: "checkout.session.completed",
      processed: false,
      createdAt: Date.now(),
      retryCount: 0,
    });

    try {
      // Process the checkout session using the existing webhook logic
      await handleCheckoutSessionCompleted(ctx, session);

      // Mark as processed
      const event = await ctx.db
        .query("stripeWebhookEvents")
        .withIndex("by_stripeEventId", (q) => q.eq("stripeEventId", args.stripeEventId))
        .first();

      if (event) {
        await ctx.db.patch(event._id, {
          processed: true,
          processedAt: Date.now(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error(`[MANUAL WEBHOOK] Error in processCheckoutSessionCompleted:`, error);
      
      // Mark as failed
      const event = await ctx.db
        .query("stripeWebhookEvents")
        .withIndex("by_stripeEventId", (q) => q.eq("stripeEventId", args.stripeEventId))
        .first();

      if (event) {
        await ctx.db.patch(event._id, {
          processed: false,
          error: error instanceof Error ? error.message : String(error),
          retryCount: (event.retryCount || 0) + 1,
        });
      }

      throw error;
    }
  },
});

/**
 * Handle checkout session completion (copied from webhooks.ts)
 */
async function handleCheckoutSessionCompleted(
  ctx: any,
  session: Stripe.Checkout.Session
) {
  if (!session.subscription || !session.customer) {
    console.error("Missing subscription or customer in checkout session");
    return;
  }

  const memberId = session.metadata?.memberId;
  
  // Handle direct checkout (no memberId) - this is likely the case for the failing payment
  if (!memberId) {
    // Check if this is a direct checkout
    if (session.metadata?.checkoutType === "direct") {
      // Get customer email from session
      const email = session.customer_details?.email || session.customer_email;
      if (!email) {
        console.error("No email found for direct checkout");
        return;
      }
      
      // Extract customer name if available
      const customerName = session.customer_details?.name || "";
      const nameParts = customerName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Check if member already exists with this email
      let member = await ctx.db
        .query("members")
        .filter((q: any) => q.eq(q.field("email"), email))
        .first();

      if (member) {
        console.log(`[MANUAL WEBHOOK] Updating existing member: ${member._id}`);
        
        // Update existing member with subscription info
        await ctx.db.patch(member._id, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          tier: "early_bird", // Use early_bird for 100% off coupons
          billingInterval: session.metadata?.billingInterval === "yearly" ? "yearly" : "monthly",
          subscriptionStatus: "active",
          lastPaymentDate: Date.now(),
          updatedAt: Date.now(),
          // Update names if they were empty and we got them from Stripe
          ...((!member.firstName && firstName) ? { firstName } : {}),
          ...((!member.lastName && lastName) ? { lastName } : {}),
        });

        // Schedule Clerk account creation if they don't have one
        if (!member.externalId) {
          await ctx.scheduler.runAfter(0, internal.auth.clerkAccounts.createClerkAccount, {
            email,
            memberId: member._id,
            checkoutSessionId: session.id,
            firstName: firstName || member.firstName,
            lastName: lastName || member.lastName,
          });
        } else {
          // They already have a Clerk account, just generate a sign-in token
          console.log(`[MANUAL WEBHOOK] Member already has Clerk account: ${member.externalId}`);
        }
      } else {
        console.log(`[MANUAL WEBHOOK] Creating new member for email: ${email}`);
        
        // Create new member for guest checkout
        const now = Date.now();
        const newMemberId = await ctx.db.insert("members", {
          email,
          firstName,
          lastName,
          slug: email.split("@")[0] + "-" + Math.random().toString(36).substring(7),
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          tier: "early_bird",
          billingInterval: session.metadata?.billingInterval === "yearly" ? "yearly" : "monthly",
          subscriptionStatus: "active",
          joinedDate: now,
          updatedAt: now,
          lastOnline: now,
          status: "active",
          // Store location info if available
          ...(session.customer_details?.address?.country ? { country: session.customer_details.address.country } : {}),
          ...(session.customer_details?.address?.city ? { location: session.customer_details.address.city } : {}),
        });
        
        // Schedule Clerk account creation
        await ctx.scheduler.runAfter(0, internal.auth.clerkAccounts.createClerkAccount, {
          email,
          memberId: newMemberId,
          checkoutSessionId: session.id,
          firstName,
          lastName,
        });
      }
      
      return;
    }
    
    console.error("Missing memberId in session metadata and not marked as direct checkout");
    return;
  }

  // Handle authenticated checkout (existing flow)
  const member = await ctx.db.get(memberId);
  if (!member) {
    console.error(`Member ${memberId} not found`);
    return;
  }

  // Check if this is a scholarship subscription
  const isScholarship = session.metadata?.isScholarship === "true";

  // Update member with subscription info
  await ctx.db.patch(memberId, {
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
    tier: isScholarship ? "early_bird" : (session.metadata?.tier as any),
    billingInterval: session.metadata?.billingInterval as any,
    subscriptionStatus: "active",
  });
}
