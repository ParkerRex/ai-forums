import { v } from "convex/values";
import Stripe from "stripe";
import { action } from "../_generated/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

/**
 * Retry a failed payment by attempting to collect the invoice again
 */
export const retryFailedPayment = action({
  args: {
    invoiceId: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      // Retrieve the invoice from Stripe
      const invoice = await stripe.invoices.retrieve(args.invoiceId);

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Check if invoice is already paid
      if (invoice.status === "paid") {
        return {
          success: true,
          message: "Invoice is already paid",
        };
      }

      // Check if invoice is in a retryable state
      if (invoice.status !== "open") {
        throw new Error(`Invoice is not in a retryable state: ${invoice.status}`);
      }

      // Attempt to pay the invoice again
      const paidInvoice = await stripe.invoices.pay(args.invoiceId);

      // Check if payment was successful
      if (paidInvoice.status === "paid") {
        return {
          success: true,
          message: "Payment successful!",
        };
      } else {
        return {
          success: false,
          message: "Payment could not be processed. Please update your payment method.",
        };
      }
    } catch (error) {
      console.error("Failed to retry payment:", error);

      // Handle specific Stripe errors
      const stripeError = error as { type?: string; message?: string };
      if (stripeError.type === "StripeCardError") {
        return {
          success: false,
          message:
            stripeError.message || "Your card was declined. Please update your payment method.",
          requiresNewPaymentMethod: true,
        };
      }

      if (stripeError.type === "StripeInvalidRequestError") {
        return {
          success: false,
          message: "This payment cannot be retried. Please contact support.",
          requiresSupport: true,
        };
      }

      // Generic error
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: "Failed to process payment. Please try again or update your payment method.",
        error: errorMessage,
      };
    }
  },
});
