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
