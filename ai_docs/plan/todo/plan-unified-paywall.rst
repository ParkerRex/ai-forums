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


IMPLEMENTATION NOTES
===================

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

Technical Decisions
^^^^^^^^^^^^^^^^^^
* **Stripe Customer Creation**: Let Stripe create customer records, sync to Convex via webhook
* **Email Matching**: When user later signs up with same email, automatically link accounts
* **Default Pricing**: Show monthly pricing ($99/mo) for simplicity, yearly option available in checkout
* **Success Redirect**: Store original post URL in session metadata for post-purchase redirect
* **Guest Purchases**: Fully supported - no authentication required for purchase 