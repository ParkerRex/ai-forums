Phase 0 – Data Preparation
==========================

Affected Files
--------------
* ``migration-data/legacy-member-billing.json`` – **new** data file you will create and commit.
* (local tools only) ``scripts/csv-to-json-example.ts`` *(optional helper, not committed)*.

Summary of Changes
------------------
1. Export **CSV** of legacy members from old platform including at minimum columns:
   ``email``, ``subscription_interval`` (monthly|annual), ``amount_usd``, ``purchase_date`` (ISO 8601).
2. Manually review / clean data (remove duplicates, ensure emails match Convex).
3. Transform CSV → JSON array using template below and save as ``migration-data/legacy-member-billing.json``.
4. For each member row fill in:
   * ``interval`` – "monthly"|"annual".
   * ``amountUsd`` – integer dollars (e.g. 39, 50, 299).
   * ``purchaseDate`` – ISO timestamp ``YYYY-MM-DDTHH:MM:SSZ``.
   * (optional) ``stripeCustomerId`` if already present.
   * (optional) ``comment`` notes.
5. Commit the JSON file so Phase 1b backfill can consume it.

Template
~~~~~~~~

.. code-block:: json

    [
      {
        "email": "alice@example.com",
        "interval": "monthly",
        "amountUsd": 39,
        "purchaseDate": "2024-06-23T18:45:00Z",
        "stripeCustomerId": "cus_12345",   // optional
        "comment": "Imported from old tool, early-bird coupon" // optional
      }
    ]


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


Phase 1b – Legacy Billing Backfill
==================================

Affected Files
--------------
* ``convex/mutations/billing/backfillFromLegacy.ts`` – new internal mutation.
* ``scripts/backfill-legacy-billing.ts`` – one-off script to run locally.
* ``convex/test/legacy-billing-backfill.test.ts`` – unit tests.

Summary of Changes
------------------
1. Add ``backfillFromLegacy`` mutation which patches existing members with the following fields based on legacy purchase data:
   * ``billingInterval``
   * ``billingRateCents``
   * ``discountPercent`` (calculated vs standard price USD 39.99 / 399.99)
   * ``billingPlan`` (``"custom"`` when price ≠ standard tiers)
   * ``grandfathered = True``
   * ``nextInvoiceAt`` (``purchaseDate`` + interval duration)
2. ``scripts/backfill-legacy-billing.ts`` reads ``migration-data/legacy-member-billing.json`` (``email``, ``interval``, ``amountUsd``, ``purchaseDate``) and invokes the mutation for each record.
3. Unit test seeds three sample records and asserts member documents are patched correctly, including discount calculations.

Unit Tests
~~~~~~~~~~
* ``legacy-billing-backfill.test.ts``: runs script against mock DB and verifies state.


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
6. **scripts/import-existing-members-to-stripe.ts** – iterates over members with billing data but missing ``stripeCustomerId`` and creates corresponding Stripe customers & subscriptions reflecting their existing ``billingInterval`` / ``billingRateCents``.

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


Key Considerations & Potential Issues
====================================

Date Handling
-------------
* **Issue**: The news card component shows a date parsing issue (``isNaN(parsedDate.getTime())``)
* **Recommendation**: Use Unix timestamps consistently throughout billing:
  - ``nextInvoiceAt`` as Unix ms (not ISO strings)
  - ``purchaseDate`` in migration JSON should be converted to Unix timestamps during import
  - All date comparisons should use numeric timestamps to avoid parsing issues

Stripe Integration Architecture
-------------------------------
* **Webhook Security**: Must verify webhook signatures to prevent replay attacks
* **Idempotency**: Handle duplicate webhook events gracefully (Stripe may retry)
* **Race Conditions**: Member creation vs Stripe customer creation timing
* **Error Handling**: Graceful degradation if Stripe is unavailable

Data Consistency
----------------
* **Source of Truth**: ``billingRateCents`` should be authoritative, not Stripe's price
* **Grandfathered Plans**: Need clear business rules for when grandfathering expires
* **Plan Migration**: Define upgrade/downgrade paths between billing plans

Missing Components
------------------
* **Customer Portal**: Add Stripe Customer Portal integration for self-service
* **Invoice History**: Store invoice records in Convex for offline access
* **Payment Methods**: UI to update payment methods
* **Cancellation Flow**: Handle subscription cancellations and retention
* **Trial Periods**: Support for free trials if needed
* **Proration**: Handle mid-cycle plan changes

Environment Setup
-----------------
* **Stripe CLI**: Document requirement for local webhook testing
* **Test Data**: Provide test credit card numbers in docs
* **Staging Environment**: Consider separate Stripe test account

Testing Gaps
------------
* **Failed Payment Handling**: Test declined cards, expired cards
* **Subscription Lifecycle**: Test full cycle from creation to renewal
* **Edge Cases**: Multiple simultaneous checkouts, browser back button
* **Internationalization**: Currency conversion if supporting non-USD

Checklist
=========

Phase 0
-------
☐ export legacy membership CSV
☐ clean & validate rows
☐ convert to JSON using template
☐ save to ``migration-data/legacy-member-billing.json`` and commit
☐ **NEW**: Convert ISO dates to Unix timestamps in migration script

Phase 1
-------
☐ modify ``schema.ts``
☐ write migration ``add_member_billing_fields.ts``
☐ add unit test ``members-billing.test.ts``
☐ **NEW**: Add ``invoiceHistory`` table to schema
☐ **NEW**: Add ``by_stripeCustomerId`` index for webhook lookups

Phase 1b
-------
☐ create ``convex/mutations/billing/backfillFromLegacy.ts``
☐ write ``scripts/backfill-legacy-billing.ts``
☐ add unit test ``legacy-billing-backfill.test.ts``
☐ **NEW**: Validate all email matches before import

Phase 2
-------
☐ create ``convex/payments.ts``
☐ implement ``/api/stripe/create-checkout-session`` route
☐ implement ``/api/stripe/webhook`` route
☐ **NEW**: implement ``/api/stripe/portal`` route
☐ update ``auth.ts`` helper & tests
☐ add unit test ``payments.test.ts``
☐ write ``scripts/import-existing-members-to-stripe.ts``
☐ **NEW**: Add webhook signature verification
☐ **NEW**: Add idempotency key handling
☐ **NEW**: Document Stripe CLI setup for local testing

Phase 3
-------
☐ build client billing components & pages
☐ wire upgrade button in header
☐ add component tests
☐ **NEW**: Add payment method update UI
☐ **NEW**: Add subscription cancellation flow
☐ **NEW**: Add invoice history display
☐ **NEW**: Handle loading states during checkout 