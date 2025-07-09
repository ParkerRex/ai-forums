==============================
Unified Paywall & Direct Checkout
==============================

.. OPEN QUESTIONS
   * Should we use Stripe Payment Links vs custom checkout sessions for the smoothest experience?
   * Do we want to capture email before checkout or let Stripe handle it all?
   * Should we redirect back to the original post after successful payment?

TASK CHECKLIST
==============

Phase 1 – Streamlined Paywall UI
-------------------------------
☐ create ``components/post-paywall-direct.tsx`` – clean paywall with direct "Upgrade to Pro" button
☐ update ``app/[category]/[slug]/page-client.tsx`` – replace complex CTA modal with direct paywall
☐ remove dependency on ``MembershipCTAModal`` from post pages

Phase 2 – Direct Stripe Checkout
-------------------------------
☐ create ``convex/stripe/directCheckout.ts`` – simplified checkout for unauthenticated users
☐ update ``app/api/stripe/webhook/route.ts`` – handle unauthenticated checkout completion
☐ create success page ``app/membership/success/page.tsx`` – celebration + onboarding steps

Phase 3 – Post-Purchase Experience
---------------------------------
☐ create ``components/success-confetti.tsx`` – celebration animation
☐ create ``components/onboarding-checklist.tsx`` – next steps after purchase
☐ update success page to redirect back to original post with access granted

Phase 4 – Backend Architecture Fixes (CRITICAL)
----------------------------------------------
☐ create ``convex/stripe/guestCheckout.ts`` – unauthenticated checkout flow
☐ update ``convex/auth.ts`` – add guest member creation from email
☐ create ``convex/migrations/linkGuestAccounts.ts`` – link guest purchases to accounts
☐ update ``convex/helpers/access.ts`` – handle guest member access checks

Phase 5 – PostHog-Style Conversion Psychology
--------------------------------------------
☐ create ``lib/conversion-copy.ts`` – PostHog-inspired messaging
☐ update ``components/post-paywall-direct.tsx`` – fun, non-sleazy copy
☐ add social proof and trust signals
☐ implement "pay for what you use" messaging

Phase 6 – Subscription Lifecycle Management (CRITICAL MISSING)
-------------------------------------------------------------
☐ create ``components/subscription-expired-modal.tsx`` – gentle reactivation for expired users
☐ update ``convex/stripe/webhooks.ts`` – handle subscription.deleted gracefully
☐ create ``convex/crons/subscriptionReminders.ts`` – proactive renewal reminders
☐ update ``components/paywall.tsx`` – different messaging for expired vs new users

Phase 7 – PostHog Integration & Conversion Tracking (MISSING)
------------------------------------------------------------
☐ install and configure PostHog SDK
☐ create ``lib/posthog-events.ts`` – standardized conversion event tracking
☐ update ``components/post-paywall-direct.tsx`` – add PostHog event tracking
☐ implement feature flags for A/B testing paywall copy

Phase 8 – Error Handling & Edge Cases (MISSING)
----------------------------------------------
☐ create ``components/checkout-error-recovery.tsx`` – handle failed payments gracefully
☐ update ``convex/stripe/webhooks.ts`` – handle webhook failures with retry logic
☐ create ``lib/payment-error-utils.ts`` – user-friendly error messages
☐ implement fallback flows for Stripe downtime


PHASE 1 – Streamlined Paywall UI
===============================

Affected Files
^^^^^^^^^^^^^^
* ``app/[category]/[slug]/page-client.tsx`` – replace modal with direct paywall
* ``components/post-paywall-direct.tsx`` (NEW) – clean, direct paywall
* ``components/membership-cta-modal.tsx`` – remove from post pages (keep for other uses)

Code Changes
^^^^^^^^^^^^
* **PostPaywallDirect** component:
  * Clean design with post preview fade-out
  * Single "Upgrade to VAI Pro - $99/mo" button
  * No complex modal, no sign-in step - direct to Stripe
  * Includes value props: "Join 2,000+ AI engineers"
  * Trust indicators: "Cancel anytime • 30-day guarantee"
* **Post Page Client**:
  * Replace ``<MembershipCTAModal>`` with ``<PostPaywallDirect>``
  * Pass post data for context
  * Remove modal state management
* **Simplified Flow**: User sees paywall → clicks upgrade → goes to Stripe → success

Unit Tests
^^^^^^^^^^
* ``components/__tests__/post-paywall-direct.test.tsx`` – renders correctly, handles click


PHASE 2 – Direct Stripe Checkout
===============================

Affected Files
^^^^^^^^^^^^^^
* ``convex/stripe/directCheckout.ts`` (NEW) – unauthenticated checkout
* ``app/api/stripe/webhook/route.ts`` – handle guest checkout completion
* ``app/membership/success/page.tsx`` (NEW) – post-purchase experience

Code Changes
^^^^^^^^^^^^
* **Direct Checkout Mutation**:
  * Accept email + optional metadata (source post)
  * Create Stripe checkout session with email prefill
  * No authentication required - Stripe handles customer creation
  * Return checkout URL for immediate redirect
* **Webhook Updates**:
  * On ``checkout.session.completed`` without existing member:
    * Create new member record with email from session
    * Set tier to "member", status to "active"
    * Store Stripe customer ID and subscription ID
  * Link to Clerk account later when user signs up
* **Success Page**:
  * Query session ID to get purchase details
  * Show celebration animation
  * Display onboarding checklist
  * Option to return to original post

Unit Tests
^^^^^^^^^^
* ``convex/__tests__/directCheckout.test.ts`` – checkout session creation
* ``convex/__tests__/webhookGuest.test.ts`` – guest checkout completion


PHASE 3 – Post-Purchase Experience
=================================

Affected Files
^^^^^^^^^^^^^^
* ``components/success-confetti.tsx`` (NEW) – celebration animation
* ``components/onboarding-checklist.tsx`` (NEW) – next steps
* ``app/membership/success/page.tsx`` – complete success experience

Code Changes
^^^^^^^^^^^^
* **Success Confetti**:
  * Animated confetti using ``canvas-confetti`` library
  * Celebration message: "Welcome to VAI Pro!"
  * Auto-triggers on page load
* **Onboarding Checklist**:
  * ✅ Payment processed successfully
  * ✅ Access to all premium content unlocked
  * 📝 Create your account (if not signed in)
  * 🔗 Return to the post you were reading
  * 💬 Join our Discord community
* **Enhanced Success Page**:
  * Full-screen celebration
  * Clear next steps
  * Direct link back to original post with access granted
  * Account creation prompt for guest purchasers

Unit Tests
^^^^^^^^^^
* ``components/__tests__/success-confetti.test.tsx`` – animation triggers
* ``components/__tests__/onboarding-checklist.test.tsx`` – renders steps correctly


PHASE 4 – Backend Architecture Fixes (CRITICAL)
===============================================

**Current Problem**: Our auth system blocks ALL checkout without Clerk authentication

Affected Files
^^^^^^^^^^^^^^
* ``convex/stripe/guestCheckout.ts`` (NEW) – unauthenticated checkout mutation
* ``convex/auth.ts`` – add guest member creation helpers
* ``convex/migrations/linkGuestAccounts.ts`` (NEW) – account linking logic
* ``convex/helpers/access.ts`` – handle guest member access

Code Changes
^^^^^^^^^^^^
* **Guest Checkout Mutation**:
  * No authentication required
  * Accept email, optional name, source post metadata
  * Create Stripe checkout with guest customer
  * Store session metadata for post-purchase member creation
* **Guest Member Creation** (in webhook):
  * Create member record with email from Stripe
  * Set ``externalId`` to null (guest status)
  * Set tier to "member", status to "active"
  * Generate temporary slug from email
* **Account Linking Logic**:
  * When user signs up with same email as guest purchase
  * Link Stripe customer to Clerk account
  * Update member record with ``externalId``
  * Preserve subscription status and tier
* **Access Control Updates**:
  * ``canViewFullContent`` checks both authenticated and guest members
  * Guest members identified by email + active subscription
  * Handle edge cases for expired guest subscriptions

Unit Tests
^^^^^^^^^^
* ``convex/__tests__/guestCheckout.test.ts`` – guest checkout flow
* ``convex/__tests__/accountLinking.test.ts`` – guest to authenticated linking
* ``convex/__tests__/guestAccess.test.ts`` – access control for guest members


PHASE 5 – PostHog-Style Conversion Psychology
============================================

**PostHog's Secret**: Fun, transparent, anti-sales messaging that builds trust

Affected Files
^^^^^^^^^^^^^^
* ``lib/conversion-copy.ts`` (NEW) – PostHog-inspired messaging
* ``components/post-paywall-direct.tsx`` – updated with better copy
* ``components/success-confetti.tsx`` – celebration messaging

Code Changes
^^^^^^^^^^^^
* **Conversion Copy Library**:
  * Headlines: "Join 2,000+ AI engineers already inside"
  * Subheadlines: "No BS. No commitment. Cancel anytime."
  * CTAs: "Get instant access" (not "Subscribe" or "Buy")
  * Trust signals: Money-back guarantee, cancel anytime
  * Social proof: Member count, testimonials
* **PostHog-Style Messaging**:
  * "We believe paywalls should have actual pricing" (vs "Contact Sales")
  * "You're the driver" – user control messaging
  * "No annual contracts unless you want one"
  * "Transparent pricing because we're not trying to squeeze you"
* **Success Experience**:
  * "Welcome to the inside!" (vs generic "Thank you")
  * "You're now part of 2,000+ AI engineers"
  * Clear next steps without overwhelming
  * Immediate value demonstration

Unit Tests
^^^^^^^^^^
* ``lib/__tests__/conversion-copy.test.ts`` – messaging consistency
* ``components/__tests__/paywall-messaging.test.ts`` – copy renders correctly


PHASE 6 – Subscription Lifecycle Management (CRITICAL MISSING)
=============================================================

**Current Gap**: We handle subscription failures but don't optimize for reactivation

Affected Files
^^^^^^^^^^^^^^
* ``components/subscription-expired-modal.tsx`` (NEW) – gentle reactivation UI
* ``convex/stripe/webhooks.ts`` – enhanced subscription lifecycle handling
* ``convex/crons/subscriptionReminders.ts`` (NEW) – proactive renewal system
* ``components/paywall.tsx`` – personalized messaging for expired users

Code Changes
^^^^^^^^^^^^
* **Subscription Expired Modal**:
  * Triggered when expired user hits paywall
  * "Welcome back, [Name]! Your Pro access has expired"
  * One-click reactivation with previous tier/billing
  * Special "win-back" pricing for churned users
* **Enhanced Webhook Handling**:
  * ``subscription.deleted`` → create reactivation opportunity
  * ``invoice.payment_failed`` → immediate recovery flow
  * Grace period management for cancelled subscriptions
  * Dunning management for failed payments
* **Proactive Renewal System**:
  * 7-day, 3-day, 1-day renewal reminders
  * Personalized messaging based on usage patterns
  * Special retention offers for high-value users
  * Automatic reactivation for accidental cancellations
* **Personalized Paywall**:
  * Different messaging for new vs returning users
  * "Welcome back" vs "Join thousands of engineers"
  * Previous tier pricing vs current pricing
  * Usage-based messaging: "You've saved 47 bookmarks"

Unit Tests
^^^^^^^^^^
* ``components/__tests__/subscription-expired-modal.test.tsx`` – reactivation flow
* ``convex/__tests__/subscriptionLifecycle.test.ts`` – webhook handling
* ``convex/__tests__/renewalReminders.test.ts`` – reminder system


PHASE 7 – PostHog Integration & Conversion Tracking (MISSING)
============================================================

**Current Gap**: No visibility into conversion funnel or optimization opportunities

Affected Files
^^^^^^^^^^^^^^
* ``lib/posthog-events.ts`` (NEW) – standardized PostHog event tracking
* ``components/post-paywall-direct.tsx`` – instrumented with PostHog events
* ``lib/posthog-config.ts`` (NEW) – PostHog SDK configuration
* ``components/providers/posthog-provider.tsx`` (NEW) – PostHog context provider

Code Changes
^^^^^^^^^^^^
* **PostHog Events Library**:
  * Standardized event names: ``paywall_viewed``, ``upgrade_clicked``, ``checkout_started``
  * Rich event properties: post ID, user tier, source, timestamp
  * Conversion funnel tracking: impression → click → checkout → success
  * User identification for cohort analysis
* **Paywall Instrumentation**:
  * Track paywall impressions with post context
  * Monitor upgrade button clicks and checkout initiation
  * Measure scroll depth and engagement before paywall
  * A/B test different copy via PostHog feature flags
* **PostHog Configuration**:
  * Environment-specific setup (dev/staging/prod)
  * User identification with Clerk integration
  * Feature flags for A/B testing paywall variants
  * Custom event capture for subscription lifecycle
* **PostHog Provider**:
  * App-wide PostHog context with user identification
  * Automatic page view tracking
  * Error boundary integration for tracking failures
  * GDPR-compliant user consent handling

Unit Tests
^^^^^^^^^^
* ``lib/__tests__/posthog-events.test.ts`` – event firing accuracy
* ``components/__tests__/paywall-posthog.test.tsx`` – PostHog integration
* ``lib/__tests__/posthog-config.test.ts`` – configuration validation


PHASE 8 – Error Handling & Edge Cases (MISSING)
==============================================

**Current Gap**: Poor error handling can kill conversion at the final step

Affected Files
^^^^^^^^^^^^^^
* ``components/checkout-error-recovery.tsx`` (NEW) – graceful error handling
* ``convex/stripe/webhooks.ts`` – robust webhook error handling
* ``lib/payment-error-utils.ts`` (NEW) – user-friendly error messages
* ``components/payment-retry-modal.tsx`` (NEW) – retry failed payments

Code Changes
^^^^^^^^^^^^
* **Checkout Error Recovery**:
  * Handle card declined, expired, insufficient funds
  * Offer alternative payment methods (PayPal, Apple Pay)
  * Suggest contacting support for persistent issues
  * Preserve user context and return to original post
* **Webhook Error Handling**:
  * Retry failed webhook processing with exponential backoff
  * Dead letter queue for persistently failing webhooks
  * Alert admins to critical webhook failures
  * Graceful degradation when Stripe is down
* **Payment Error Utilities**:
  * Translate Stripe error codes to user-friendly messages
  * Provide actionable next steps for each error type
  * Contextual help based on payment method and region
  * Escalation paths for complex issues
* **Payment Retry Modal**:
  * One-click retry for transient failures
  * Update payment method for expired cards
  * Contact support directly from error state
  * Preserve checkout session during retry attempts

Unit Tests
^^^^^^^^^^
* ``components/__tests__/checkout-error-recovery.test.tsx`` – error scenarios
* ``convex/__tests__/webhook-error-handling.test.ts`` – retry logic
* ``lib/__tests__/payment-error-utils.test.ts`` – error message accuracy


IMPLEMENTATION NOTES
===================

Critical Backend Gaps
^^^^^^^^^^^^^^^^^^^^^
**Authentication Blocker**: Current ``convex/stripe/checkout.ts`` requires Clerk auth:
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Unauthorized"); // ❌ Blocks guest checkout
}
```

**Missing Pieces**:
* Guest checkout mutation (no auth required)
* Email-based member creation in webhook
* Account linking when user later signs up
* Guest member access control logic

**Subscription Lifecycle Gaps**:
* No reactivation flow for expired users
* Limited dunning management for failed payments
* No proactive renewal reminders
* Poor error handling for edge cases

**Analytics Blindness**:
* No conversion funnel tracking
* No A/B testing infrastructure  
* No visibility into which content drives conversions
* No user journey tracking from impression to purchase

PostHog Conversion Principles
^^^^^^^^^^^^^^^^^^^^^^^^^^^^
* **Transparent Pricing**: Show $99/month upfront, no "Contact Sales"
* **Self-Serve**: No sales calls, immediate access
* **Utility Mindset**: "Pay for what you use" vs commitment
* **Trust Building**: Money-back guarantee, cancel anytime
* **Fun Copy**: Anti-corporate, developer-friendly messaging
* **Immediate Value**: Access granted instantly after payment

Conversion Flow Comparison
^^^^^^^^^^^^^^^^^^^^^^^^^
**OLD FLOW (7 steps)**:
1. User sees paywall
2. Clicks CTA → modal opens
3. Sees pricing in modal
4. Clicks "Join Pro" → sign-in required
5. Goes through Clerk sign-in
6. Redirected to Stripe checkout
7. Completes payment → success

**NEW FLOW (3 steps)**:
1. User sees paywall with direct pricing
2. Clicks "Upgrade to VAI Pro - $99/mo" → Stripe checkout
3. Completes payment → celebration + access granted

Key Improvements
^^^^^^^^^^^^^^^
* **Eliminated authentication barrier** - purchase first, create account later
* **Removed modal complexity** - direct paywall in content flow
* **Simplified pricing** - show single price upfront ($99/mo)
* **Stripe handles everything** - customer creation, payment, email collection
* **Immediate gratification** - confetti + instant access to content
* **Clear onboarding** - guided next steps after purchase
* **PostHog-style messaging** - fun, transparent, trust-building copy
* **Subscription lifecycle** - proactive renewal, graceful reactivation
* **PostHog tracking** - track and optimize every step
* **Error recovery** - handle edge cases gracefully

**CRITICAL MISSING PIECES WE IDENTIFIED**:

1. **Subscription Lifecycle Management** - We handle cancellations but don't optimize for reactivation
2. **PostHog Integration** - No visibility into funnel performance or optimization opportunities  
3. **Error Handling & Edge Cases** - Poor error handling kills conversion at the final step
4. **Personalized Messaging** - Different copy for new vs returning/expired users
5. **Proactive Retention** - No renewal reminders or win-back campaigns
6. **A/B Testing via PostHog** - No way to optimize conversion copy and design
7. **Conversion Tracking** - No tracking of which content drives conversions

Technical Decisions
^^^^^^^^^^^^^^^^^^
* **Stripe Customer Creation**: Let Stripe create customer records, sync to Convex via webhook
* **Email Matching**: When user later signs up with same email, automatically link accounts
* **Default Pricing**: Show monthly pricing ($99/mo) for simplicity, yearly option available in checkout
* **Success Redirect**: Store original post URL in session metadata for post-purchase redirect
* **Guest Purchases**: Fully supported - no authentication required for purchase
* **Account Linking**: Seamless linking when guest later creates account with same email 
* **Subscription Lifecycle**: Proactive renewal reminders and graceful reactivation flows
* **Error Recovery**: Robust error handling with retry logic and alternative payment methods
* **PostHog Analytics**: Event tracking and A/B testing via feature flags 