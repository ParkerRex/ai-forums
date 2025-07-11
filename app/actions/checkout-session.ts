"use server";

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export interface CheckoutSessionData {
  email: string;
  customerId: string;
  subscriptionId: string;
  customerName?: string;
  signInToken?: string;
}

/**
 * Retrieves checkout session data from Stripe
 */
export async function getCheckoutSessionData(sessionId: string): Promise<CheckoutSessionData | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    if (!session.customer_details?.email) {
      return null;
    }

    // Check if this session has an associated sign-in token in metadata
    // This would be set if Clerk account was successfully created
    const signInToken = session.metadata?.signInToken;

    return {
      email: session.customer_details.email,
      customerId: session.customer as string,
      subscriptionId: session.subscription as string,
      customerName: session.customer_details.name || undefined,
      signInToken,
    };
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    return null;
  }
}