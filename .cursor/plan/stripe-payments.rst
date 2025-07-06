Phase 1 – Data Model + Migration
================================

Affected Files
--------------
* ``convex/schema.ts`` – add billing fields.
* ``convex/migrations/add_member_billing_fields.ts`` – migration script.
* ``convex/_generated/api.d.ts`` – regenerated automatically.
* ``convex/test/members-billing.test.ts`` – unit tests.

Summary of Changes
------------------
1. Extend ``members`` table:
   * ``stripeCustomerId`` – *optional str*.
   * ``stripeSubscriptionId`` – *optional str*.
   * ``stripePriceId`` – *optional str* (price object used for this member; supports truly custom prices).
   * ``billingPlan`` – *union literal*: ``"free" | "founder" | "early" | "standard" | "custom"``.
   * ``billingRateCents`` – *number* (effective recurring charge in cents; authoritative even for custom prices).
   * ``billingInterval`` – *union literal*: ``"monthly" | "annual"``.
   * ``discountPercent`` – *optional number* (0-100, derived from Stripe coupon when present).
   * ``nextInvoiceAt`` – *optional number* (unix ms timestamp of next charge; populated from Stripe webhooks so we can show "paid until").
   * ``grandfathered`` – *boolean* (defaults ``false``).
2. Add compound index ``by_billingPlan`` on (``billingPlan``).
3. Add compound index ``by_billingInterval`` on (``billingInterval``) for quick reporting.
4. New migration copies existing rows →
   * ``billingPlan = "founder"`` when ``joinedDate < 2023-01-01``.
   * ``billingPlan = "early"`` when ``joinedDate < 2024-01-01``.
   * Else ``billingPlan = "free"``.
4. Unit test verifies migration produces expected default tiers.

Unit Tests
~~~~~~~~~~
* ``members-billing.test.ts``: create three synthetic members with differing ``joinedDate`` and run migration; expect correct plan assignments.


Phase 2 – Stripe Backend Integration
===================================

Affected Files
--------------
* ``convex/payments.ts`` – new module.
* ``app/api/stripe/create-checkout-session/route.ts`` – new route.
* ``app/api/stripe/webhook/route.ts`` – new route.
* ``convex/auth.ts`` – minor: verify paid tier helpers.
* ``convex/test/payments.test.ts`` – webhook processing test (stripe-mock).

Summary of Changes
------------------
1. **convex/payments.ts**
   * ``createCheckoutSession`` mutation → returns Stripe Checkout URL.
   * ``processWebhook`` internal mutation → handles ``checkout.session.completed`` & ``invoice.payment_succeeded`` events, patches member:
     ``stripeCustomerId``, ``stripeSubscriptionId``, ``billingPlan``, ``billingRateCents``, ``grandfathered=False``.
   * Helper ``getPlanForPriceId`` maps Stripe ``price.id`` → internal plan/rate.
2. **Next API routes**
   * ``create-checkout-session`` calls mutation above, passes ``priceId`` determined from member.plan or desired upgrade.
   * ``webhook`` verifies signature with ``STRIPE_WEBHOOK_SECRET`` and pipes event → ``api.payments.processWebhook``.
3. **config**: add ``STRIPE_SECRET_KEY`` & ``STRIPE_WEBHOOK_SECRET`` env vars (document in ``README.md``).
4. **auth.ts** helper ``getAuthenticatedMember``: export ``isPaidMember(member)`` utility (``billingPlan ≠ "free"``).
5. **Unit tests** using stripe-mock: simulate webhook; expect member fields updated.

Unit Tests
~~~~~~~~~~
* ``payments.test.ts``: mock checkout + webhook flow; asserts DB state.


Phase 3 – Client UI
===================

Affected Files
--------------
* ``components/billing/billing-plan-card.tsx`` – new component.
* ``app/members/[slug]/billing/page.tsx`` – new page.
* ``components/header.tsx`` – add "Upgrade" button for free members.
* ``hooks/use-current-member.ts`` – expose ``isPaid``.

Summary of Changes
------------------
1. Billing page lists current plan & allows upgrade → calls ``/api/stripe/create-checkout-session`` then redirects.
2. "Upgrade" button visible when ``!isPaid``.
3. Billing card shows grandfathered badge when ``grandfathered`` is true.
4. Basic e2e Playwright flow added (optional) to validate checkout link opens.

Unit Tests
~~~~~~~~~~
* React testing: render ``BillingPlanCard`` with various member props; assert correct labels & button state.


Checklist
=========

Phase 1
-------
☐ modify ``schema.ts``
☐ write migration ``add_member_billing_fields.ts``
☐ add unit test ``members-billing.test.ts``

Phase 2
-------
☐ create ``convex/payments.ts``
☐ implement ``/api/stripe/create-checkout-session`` route
☐ implement ``/api/stripe/webhook`` route
☐ update ``auth.ts`` helper & tests
☐ add unit test ``payments.test.ts``

Phase 3
-------
☐ build client billing components & pages
☐ wire upgrade button in header
☐ add component tests 