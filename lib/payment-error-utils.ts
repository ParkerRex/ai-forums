/**
 * Payment Error Utilities
 *
 * User-friendly error messages and recovery suggestions for payment failures.
 * Maps technical Stripe errors to human-readable messages with actionable next steps.
 */

import { errorMessages } from "@/lib/conversion-copy";

export interface PaymentError {
  code: string;
  message: string;
  suggestion: string;
  recoverable: boolean;
  requiresNewPaymentMethod?: boolean;
}

/**
 * Stripe error code mappings to user-friendly messages
 */
const stripeErrorMap: Record<string, PaymentError> = {
  // Card errors
  card_declined: {
    code: "card_declined",
    message: "Your card was declined. This happens sometimes.",
    suggestion: "Try another card or contact your bank.",
    recoverable: true,
    requiresNewPaymentMethod: true,
  },
  insufficient_funds: {
    code: "insufficient_funds",
    message: "Looks like there aren't enough funds on this card.",
    suggestion: "Try another payment method or add funds to your card.",
    recoverable: true,
    requiresNewPaymentMethod: true,
  },
  expired_card: {
    code: "expired_card",
    message: "This card has expired.",
    suggestion: "Please use a different card with a valid expiration date.",
    recoverable: true,
    requiresNewPaymentMethod: true,
  },
  incorrect_cvc: {
    code: "incorrect_cvc",
    message: "The security code (CVC) is incorrect.",
    suggestion: "Double-check the 3 or 4 digit code on your card.",
    recoverable: true,
  },
  processing_error: {
    code: "processing_error",
    message: "There was a hiccup processing your payment.",
    suggestion: "Please try again. These things usually work on the second try.",
    recoverable: true,
  },
  incorrect_number: {
    code: "incorrect_number",
    message: "The card number seems incorrect.",
    suggestion: "Double-check your card number for any typos.",
    recoverable: true,
  },

  // Authentication errors
  authentication_required: {
    code: "authentication_required",
    message: "Your bank requires additional verification.",
    suggestion: "You'll be redirected to complete the verification.",
    recoverable: true,
  },

  // Rate limiting
  rate_limit: {
    code: "rate_limit",
    message: "Whoa there! Too many attempts.",
    suggestion: "Take a breather and try again in a few minutes.",
    recoverable: true,
  },

  // Network/API errors
  api_connection_error: {
    code: "api_connection_error",
    message: "We couldn't connect to the payment processor.",
    suggestion: "Check your internet connection and try again.",
    recoverable: true,
  },
  api_error: {
    code: "api_error",
    message: "The payment service is having issues.",
    suggestion: "Try again in a moment. If it persists, we've been notified.",
    recoverable: true,
  },

  // Invalid request errors
  invalid_request_error: {
    code: "invalid_request_error",
    message: "Something went wrong with the payment setup.",
    suggestion: "Please refresh the page and try again.",
    recoverable: false,
  },
};

/**
 * Get user-friendly error details from a Stripe error
 */
export function getPaymentError(stripeError: unknown): PaymentError {
  // Type guard for error object
  const error = stripeError as
    | {
        code?: string;
        decline_code?: string;
        error?: { code?: string };
        type?: string;
        message?: string;
      }
    | null
    | undefined;

  // Extract error code from various Stripe error formats
  const errorCode =
    error?.code || error?.decline_code || error?.error?.code || error?.type || "unknown_error";

  // Check if we have a specific mapping
  if (stripeErrorMap[errorCode]) {
    return stripeErrorMap[errorCode];
  }

  // Check for specific error messages
  if (error?.message?.toLowerCase().includes("network")) {
    return stripeErrorMap.api_connection_error;
  }

  if (error?.message?.toLowerCase().includes("rate limit")) {
    return stripeErrorMap.rate_limit;
  }

  // Generic fallback
  return {
    code: "unknown_error",
    message: errorMessages.genericError,
    suggestion: "Please try again or contact support if the issue persists.",
    recoverable: true,
  };
}

/**
 * Format error for display with icon suggestions
 */
export function formatErrorDisplay(error: PaymentError): {
  icon: "alert" | "warning" | "info";
  title: string;
  description: string;
  actions: Array<{ label: string; variant: "default" | "secondary" }>;
} {
  return {
    icon: error.recoverable ? "warning" : "alert",
    title: error.message,
    description: error.suggestion,
    actions: error.recoverable
      ? [
          { label: "Try again", variant: "default" },
          { label: "Contact support", variant: "secondary" },
        ]
      : [{ label: "Contact support", variant: "default" }],
  };
}

/**
 * Get recovery suggestions based on error type
 */
export function getRecoverySuggestions(error: PaymentError): string[] {
  const suggestions: string[] = [];

  if (error.requiresNewPaymentMethod) {
    suggestions.push("Try a different card");
    suggestions.push("Use PayPal or another payment method");
  }

  if (error.code === "insufficient_funds") {
    suggestions.push("Check your account balance");
    suggestions.push("Try a credit card instead of debit");
  }

  if (error.code === "authentication_required") {
    suggestions.push("Have your phone ready for bank verification");
    suggestions.push("Check your banking app for approval requests");
  }

  if (error.code.includes("api") || error.code.includes("network")) {
    suggestions.push("Check your internet connection");
    suggestions.push("Try disabling VPN if you're using one");
    suggestions.push("Wait a moment and try again");
  }

  // Always include support as last option
  suggestions.push("Contact our friendly support team");

  return suggestions;
}

/**
 * Check if error is related to payment method
 */
export function isPaymentMethodError(error: PaymentError): boolean {
  return error.requiresNewPaymentMethod === true;
}

/**
 * Check if error is temporary and likely to succeed on retry
 */
export function isTemporaryError(error: PaymentError): boolean {
  const temporaryErrors = ["processing_error", "api_connection_error", "api_error", "rate_limit"];

  return temporaryErrors.includes(error.code);
}

/**
 * Get estimated wait time for rate limit errors
 */
export function getRateLimitWaitTime(error: unknown): number {
  const errorWithHeaders = error as { headers?: { "retry-after"?: string } };

  // Check if Stripe provided a retry-after header
  const retryAfter = errorWithHeaders?.headers?.["retry-after"];
  if (retryAfter) {
    return parseInt(retryAfter, 10) * 1000; // Convert to milliseconds
  }

  // Default to 60 seconds
  return 60000;
}

/**
 * Track error for analytics and monitoring
 */
export function trackPaymentError(
  error: PaymentError,
  context: {
    userId?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
  },
) {
  // Log error for monitoring
  console.error("[Payment Error]", {
    error,
    context,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send to error tracking service (Sentry, etc.)
  // TODO: Send to analytics for conversion funnel analysis
}
