import { v } from "convex/values";
import { mutation, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import Stripe from "stripe";

// Extend Stripe types to include properties that exist in the API but not in TypeScript definitions
interface ExtendedSubscription extends Stripe.Subscription {
  current_period_end: number;
  cancel_at_period_end: boolean;
}

interface ExtendedInvoice extends Stripe.Invoice {
  subscription?: string | null;
  payment_intent?: string | null;
}

export const processWebhookEvent = mutation({
  args: {
    stripeEventId: v.string(),
    type: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Check if we've already processed this event
    const existingEvent = await ctx.db
      .query("stripeWebhookEvents")
      .withIndex("by_stripeEventId", (q) => q.eq("stripeEventId", args.stripeEventId))
      .first();

    if (existingEvent && existingEvent.processed) {
      console.log(`Event ${args.stripeEventId} already processed, skipping`);
      return;
    }

    // Record the event
    if (!existingEvent) {
      await ctx.db.insert("stripeWebhookEvents", {
        stripeEventId: args.stripeEventId,
        type: args.type,
        processed: false,
        createdAt: Date.now(),
      });
    }

    try {
      // Process based on event type
      switch (args.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(ctx, args.data);
          break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscriptionUpdate(ctx, args.data);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(ctx, args.data);
          break;

        case "invoice.payment_succeeded":
          await handlePaymentSucceeded(ctx, args.data);
          break;

        case "invoice.payment_failed":
          await handlePaymentFailed(ctx, args.data);
          break;

        default:
          console.log(`Unhandled event type: ${args.type}`);
      }

      // Mark event as processed
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
    } catch (error) {
      console.error(`Error processing webhook event ${args.type}:`, error);
      
      // Record the error
      const event = await ctx.db
        .query("stripeWebhookEvents")
        .withIndex("by_stripeEventId", (q) => q.eq("stripeEventId", args.stripeEventId))
        .first();
      
      if (event) {
        await ctx.db.patch(event._id, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
      
      throw error;
    }
  },
});

/**
 * Handles checkout.session.completed webhook event
 * Updates member with subscription information after successful checkout
 * Handles both authenticated and direct (guest) checkouts
 */
async function handleCheckoutSessionCompleted(
  ctx: MutationCtx,
  session: Stripe.Checkout.Session
) {
  if (!session.subscription || !session.customer) {
    console.error("Missing subscription or customer in checkout session");
    return;
  }

  const memberId = session.metadata?.memberId as Id<"members">;
  
  // Handle direct checkout (no memberId)
  if (!memberId) {
    // Check if this is a direct checkout
    if (session.metadata?.checkoutType === "direct") {
      // Get customer email from session
      const email = session.customer_email;
      if (!email) {
        console.error("No email found for direct checkout");
        return;
      }

      // Check if member already exists with this email
      let member = await ctx.db
        .query("members")
        .filter((q) => q.eq(q.field("email"), email))
        .first();

      if (member) {
        // Update existing member with subscription info
        await ctx.db.patch(member._id, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          tier: "member", // Default to member tier for direct checkouts
          billingInterval: session.metadata?.billingInterval === "yearly" ? "yearly" : "monthly",
          subscriptionStatus: "active",
          lastPaymentDate: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        // Create new member for guest checkout
        const now = Date.now();
        await ctx.db.insert("members", {
          email,
          firstName: "",
          lastName: "",
          // externalId is optional - don't set it for guest members
          // When user signs up with Clerk later, we'll link accounts by email
          slug: email.split("@")[0] + "-" + Math.random().toString(36).substring(7),
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          tier: "member",
          billingInterval: session.metadata?.billingInterval === "yearly" ? "yearly" : "monthly",
          subscriptionStatus: "active",
          joinedDate: now,
          updatedAt: now,
          lastOnline: now,
          status: "active",
        });
      }
      
      return;
    }
    
    console.error("Missing memberId in session metadata");
    return;
  }

  // Handle authenticated checkout (existing flow)
  const member = await ctx.db.get(memberId);
  if (!member) {
    console.error(`Member ${memberId} not found`);
    return;
  }

  // Update member with subscription info
  await ctx.db.patch(memberId, {
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
    tier: session.metadata?.tier as Doc<"members">["tier"],
    billingInterval: session.metadata?.billingInterval as Doc<"members">["billingInterval"],
    subscriptionStatus: "active",
  });
}

/**
 * Handles customer.subscription.created and customer.subscription.updated webhook events
 * Syncs subscription status and details with member records
 */
async function handleSubscriptionUpdate(
  ctx: MutationCtx,
  subscription: Stripe.Subscription
) {
  const extendedSubscription = subscription as ExtendedSubscription;
  
  const member = await ctx.db
    .query("members")
    .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", subscription.customer as string))
    .first();

  if (!member) {
    console.error(`Member with Stripe customer ${subscription.customer} not found`);
    return;
  }

  // Map Stripe status to our status
  let status: "active" | "cancelled" | "past_due" | "expired";
  switch (subscription.status) {
    case "active":
      status = "active";
      break;
    case "past_due":
      status = "past_due";
      break;
    case "canceled":
    case "unpaid":
      status = "expired";
      break;
    default:
      status = "active";
  }

  // Update member subscription info
  await ctx.db.patch(member._id, {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: status,
    subscriptionEndDate: extendedSubscription.current_period_end * 1000,
  });

  // Check if subscription exists in subscriptions table
  const existingSubscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_stripeSubscriptionId", (q) => q.eq("stripeSubscriptionId", subscription.id))
    .first();

  // Ensure tier is valid for subscriptions table (exclude "free" and "scholarship")
  const validTier = (subscription.metadata?.tier as Doc<"subscriptions">["tier"]) || 
    (member.tier === "founding_member" || member.tier === "early_bird" || member.tier === "member" 
      ? member.tier 
      : "member" as Doc<"subscriptions">["tier"]);
  
  const subscriptionData = {
    memberId: member._id,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    status,
    currentPeriodEnd: extendedSubscription.current_period_end * 1000,
    cancelAtPeriodEnd: extendedSubscription.cancel_at_period_end,
    tier: validTier,
    billingInterval: (subscription.metadata?.billingInterval as Doc<"subscriptions">["billingInterval"]) || member.billingInterval || "monthly",
    updatedAt: Date.now(),
  };

  if (existingSubscription) {
    await ctx.db.patch(existingSubscription._id, subscriptionData);
  } else {
    await ctx.db.insert("subscriptions", {
      ...subscriptionData,
      createdAt: Date.now(),
    });
  }
}

/**
 * Handles customer.subscription.deleted webhook event
 * Marks member subscription as expired when cancelled
 */
async function handleSubscriptionDeleted(
  ctx: MutationCtx,
  subscription: Stripe.Subscription
) {
  const member = await ctx.db
    .query("members")
    .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", subscription.customer as string))
    .first();

  if (!member) {
    console.error(`Member with Stripe customer ${subscription.customer} not found`);
    return;
  }

  // Update member to expired/churned status
  await ctx.db.patch(member._id, {
    subscriptionStatus: "expired",
    subscriptionEndDate: Date.now(),
  });

  // Update subscription record
  const subscriptionRecord = await ctx.db
    .query("subscriptions")
    .withIndex("by_stripeSubscriptionId", (q) => q.eq("stripeSubscriptionId", subscription.id))
    .first();

  if (subscriptionRecord) {
    await ctx.db.patch(subscriptionRecord._id, {
      status: "expired",
      updatedAt: Date.now(),
    });
  }
}

/**
 * Handles invoice.payment_succeeded webhook event
 * Records successful payment and updates member payment history
 */
async function handlePaymentSucceeded(
  ctx: MutationCtx,
  invoice: Stripe.Invoice
) {
  const extendedInvoice = invoice as ExtendedInvoice;
  
  if (!extendedInvoice.subscription || !invoice.customer) {
    return;
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", invoice.customer as string))
    .first();

  if (!member) {
    console.error(`Member with Stripe customer ${invoice.customer} not found`);
    return;
  }

  // Update last payment date and amount
  await ctx.db.patch(member._id, {
    lastPaymentDate: Date.now(),
    amountCents: invoice.amount_paid,
  });

  // Get subscription record
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_stripeSubscriptionId", (q) => q.eq("stripeSubscriptionId", extendedInvoice.subscription!))
    .first();

  // Record the payment
  await ctx.db.insert("payments", {
    memberId: member._id,
    subscriptionId: subscription?._id,
    stripePaymentIntentId: extendedInvoice.payment_intent || "",
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: "succeeded",
    description: `${member.tier} subscription - ${member.billingInterval} payment`,
    paymentMethod: {
      type: "card",
      brand: undefined, // Will need to retrieve from payment method
      last4: "****",
    },
    transactionFee: Math.round(invoice.amount_paid * 0.029 + 30), // 2.9% + 30¢
    netAmount: invoice.amount_paid - Math.round(invoice.amount_paid * 0.029 + 30),
    createdAt: Date.now(),
  });
}

/**
 * Handles invoice.payment_failed webhook event
 * Updates subscription status to past_due and records failed payment
 */
async function handlePaymentFailed(
  ctx: MutationCtx,
  invoice: Stripe.Invoice
) {
  const extendedInvoice = invoice as ExtendedInvoice;
  
  if (!extendedInvoice.subscription || !invoice.customer) {
    return;
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", invoice.customer as string))
    .first();

  if (!member) {
    console.error(`Member with Stripe customer ${invoice.customer} not found`);
    return;
  }

  // Update subscription status to past_due
  await ctx.db.patch(member._id, {
    subscriptionStatus: "past_due",
  });

  // Get subscription record
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_stripeSubscriptionId", (q) => q.eq("stripeSubscriptionId", extendedInvoice.subscription!))
    .first();

  if (subscription) {
    await ctx.db.patch(subscription._id, {
      status: "past_due",
      updatedAt: Date.now(),
    });
  }

  // Record the failed payment
  await ctx.db.insert("payments", {
    memberId: member._id,
    subscriptionId: subscription?._id,
    stripePaymentIntentId: extendedInvoice.payment_intent || "",
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: "failed",
    description: `${member.tier} subscription - ${member.billingInterval} payment`,
    paymentMethod: {
      type: "card",
      last4: "****",
    },
    failureReason: "Payment failed",
    createdAt: Date.now(),
  });
}