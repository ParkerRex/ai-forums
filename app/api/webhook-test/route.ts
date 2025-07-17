import { NextRequest, NextResponse } from "next/server";

/**
 * Test endpoint to verify webhook connectivity and configuration
 * This helps debug webhook delivery issues
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Webhook test endpoint is accessible",
    environment: process.env.NODE_ENV,
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log("[WEBHOOK TEST] Received POST request");
    console.log("[WEBHOOK TEST] Headers:", headers);
    console.log("[WEBHOOK TEST] Body length:", body.length);
    console.log("[WEBHOOK TEST] Body preview:", body.substring(0, 200));
    
    // Check for Stripe signature header
    const stripeSignature = headers['stripe-signature'];
    
    return NextResponse.json({
      status: "received",
      timestamp: new Date().toISOString(),
      hasStripeSignature: !!stripeSignature,
      bodyLength: body.length,
      headers: {
        'content-type': headers['content-type'],
        'user-agent': headers['user-agent'],
        'stripe-signature': stripeSignature ? 'present' : 'missing',
      },
      message: "Test webhook received successfully"
    });
  } catch (error) {
    console.error("[WEBHOOK TEST] Error:", error);
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
