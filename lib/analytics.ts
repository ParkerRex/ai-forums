/**
 * Analytics Helper Functions
 *
 * Centralized analytics tracking for the application.
 * Events are logged to console in development and persisted to the database
 * via Convex for analysis and reporting.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

type AnalyticsEvent = {
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
};

// Initialize Convex client for analytics (uses public API, works even when not authenticated)
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
let convexClient: ConvexHttpClient | null = null;

// Lazy initialization of Convex client (only in browser)
function getConvexClient() {
  if (typeof window === "undefined") {
    return null; // Don't track analytics during SSR
  }

  if (!convexClient && convexUrl) {
    convexClient = new ConvexHttpClient(convexUrl);
  }

  return convexClient;
}

// Generate a session ID for grouping events (stored in sessionStorage)
function getSessionId(): string {
  if (typeof window === "undefined") return "";

  const SESSION_KEY = "analytics_session_id";
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Track a generic analytics event
 */
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", analyticsEvent);
  }

  // Send to Convex analytics service
  const client = getConvexClient();
  if (client) {
    // Send asynchronously without blocking UI
    // @ts-expect-error - Analytics module may not be generated yet until Convex dev runs
    const trackEventMutation = api.analytics?.trackEvent;

    if (trackEventMutation) {
      client
        .mutation(trackEventMutation, {
          event,
          properties,
          sessionId: getSessionId(),
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        })
        .catch((error) => {
          // Log errors but don't throw - analytics should never break the app
          if (process.env.NODE_ENV === "development") {
            console.error("[Analytics] Failed to track event:", error);
          }
        });
    } else if (process.env.NODE_ENV === "development") {
      console.warn("[Analytics] Analytics API not available. Run 'npm run dev' to generate API types.");
    }
  }
}

/**
 * Track checkout funnel events
 */
export const checkoutAnalytics = {
  // When user opens the membership modal
  modalOpened: (source: string) => {
    trackEvent("checkout_modal_opened", {
      source,
      timestamp: new Date().toISOString(),
    });
  },

  // When user toggles between monthly/yearly
  billingToggled: (from: "monthly" | "yearly", to: "monthly" | "yearly") => {
    trackEvent("checkout_billing_toggled", {
      from,
      to,
      timestamp: new Date().toISOString(),
    });
  },

  // When user clicks the checkout button
  checkoutInitiated: (tier: string, billingInterval: "monthly" | "yearly", price: number) => {
    trackEvent("checkout_initiated", {
      tier,
      billingInterval,
      price,
      timestamp: new Date().toISOString(),
    });
  },

  // When checkout session is created successfully
  checkoutSessionCreated: (sessionId: string) => {
    trackEvent("checkout_session_created", {
      sessionId,
      timestamp: new Date().toISOString(),
    });
  },

  // When checkout fails
  checkoutFailed: (error: string) => {
    trackEvent("checkout_failed", {
      error,
      timestamp: new Date().toISOString(),
    });
  },

  // When user returns from Stripe (success page)
  checkoutCompleted: (sessionId: string) => {
    trackEvent("checkout_completed", {
      sessionId,
      timestamp: new Date().toISOString(),
    });
  },

  // When user cancels checkout
  checkoutCancelled: () => {
    trackEvent("checkout_cancelled", {
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Track subscription management events
 */
export const subscriptionAnalytics = {
  // When user clicks manage subscription
  manageClicked: (currentTier: string) => {
    trackEvent("subscription_manage_clicked", {
      currentTier,
      timestamp: new Date().toISOString(),
    });
  },

  // When subscription is cancelled
  cancelled: (tier: string, reason?: string) => {
    trackEvent("subscription_cancelled", {
      tier,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  // When subscription is reactivated
  reactivated: (tier: string) => {
    trackEvent("subscription_reactivated", {
      tier,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Track paywall events
 */
export const paywallAnalytics = {
  // When paywall is shown
  shown: (postId?: string, postTitle?: string, variant?: string) => {
    trackEvent("paywall_shown", {
      postId,
      postTitle,
      variant,
      timestamp: new Date().toISOString(),
    });
  },

  // When user clicks upgrade from paywall
  upgradeClicked: (postId?: string, postTitle?: string, variant?: string) => {
    trackEvent("paywall_upgrade_clicked", {
      postId,
      postTitle,
      variant,
      timestamp: new Date().toISOString(),
    });
  },

  // Track paywall variant performance
  variantPerformance: (variant: string, action: "shown" | "clicked" | "converted") => {
    trackEvent("paywall_variant_performance", {
      variant,
      action,
      timestamp: new Date().toISOString(),
    });
  },
};
