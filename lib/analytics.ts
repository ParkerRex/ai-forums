/**
 * Analytics Helper Functions
 * 
 * Centralized analytics tracking for the application.
 * Currently supports console logging but can be extended
 * to integrate with analytics services like PostHog, Mixpanel, etc.
 */

type AnalyticsEvent = {
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
};

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

  // TODO: Send to analytics service
  // Example: posthog.capture(event, properties);
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