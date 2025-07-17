import { NextResponse } from "next/server";

/**
 * Webhook health check endpoint
 * Use this to verify the webhook infrastructure is working
 */
export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    webhookEndpoint: "/api/stripe/webhook",
    configuration: {
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasConvexUrl: !!process.env.NEXT_PUBLIC_CONVEX_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    },
    expectedWebhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`,
    requiredEvents: [
      "checkout.session.completed",
      "customer.subscription.created", 
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_succeeded",
      "invoice.payment_failed"
    ],
    troubleshooting: {
      steps: [
        "1. Verify webhook URL in Stripe dashboard matches expectedWebhookUrl above",
        "2. Ensure webhook secret in Stripe dashboard matches STRIPE_WEBHOOK_SECRET env var",
        "3. Check that all required events are enabled for the webhook",
        "4. Test webhook delivery using Stripe CLI: stripe listen --forward-to localhost:3000/api/stripe/webhook",
        "5. Check Convex logs for webhook processing errors"
      ],
      commonIssues: [
        "Webhook URL mismatch between Stripe dashboard and actual endpoint",
        "Webhook secret mismatch",
        "Missing required events in webhook configuration",
        "Endpoint returning non-200 status codes",
        "Network connectivity issues between Stripe and your server"
      ]
    }
  };

  return NextResponse.json(health);
}
