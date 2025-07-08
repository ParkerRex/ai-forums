Complete Payment System & Admin Member Management Plan
=====================================================

**CURRENT STATUS**: Phase 3 ✅ Complete | Phase 4 🚀 Next Up

**COMPLETED**:
- Phase 0: Data preparation and validation
- Phase 1: Database schema updates and migration  
- Phase 2: Stripe integration and webhook setup
- Phase 3: Access control and paywall implementation

**NEXT STEPS**:
1. Finalize membership CTA modal with tier selection (Phase 4)
2. Display subscription status in member profile (Phase 4)
3. Begin admin member management UI (Phase 5)
4. Expand automated tests & monitoring (Phase 7)

Overview
--------
This plan implements a complete payment system with 5-tier pricing structure and comprehensive admin member management capabilities for the VAI community platform.

Pricing Tiers
-------------
1. **Free** - $0/mo (limited access, sees paywalls)
2. **Scholarship** - $0/mo (full access, granted by admin for special cases)
3. **Founding Member** - $39/mo or $375/yr (early supporter pricing, locked forever)
4. **Early Bird** - $50/mo or $480/yr (grandfathered rate for existing members)
5. **Member** - $99/mo (standard pricing for new members)

**Special Cases**:
- Free lifetime members will receive a special coupon code (100% discount) to apply at checkout

**DECISIONS:**

1. Create Todd and Jonathan's Convex accounts **after** updating the schema (ensures new fields are available)
2. Scholarship members will use ``subscriptionStatus`` = "active" with ``tier`` = "scholarship" (simpler to match Stripe's setup)
3. No need to track grant date/reason - can derive from join date
4. Free lifetime members will receive a special coupon code for checkout

Phase 0 – Data Preparation ✅ COMPLETE
======================================

Affected Files
--------------
* ``migration-data/members-export-2025-07-07T16-56-26-534Z.json`` – exported member data
* ``migration-data/billing-actual.csv`` – billing data from payment system
* ``scripts/transform-billing-actual.ts`` – transforms CSV to final JSON format
* ``scripts/validate-billing-data.ts`` – validates transformed data
* ``migration-data/members-billing-final.json`` – **final** migration-ready data

Summary of Changes
------------------
1. Exported 110 members from Convex database
2. Processed billing-actual.csv with 107 active paying members
3. Identified 5 scholarship members (Parker Rex, Bazel Shaw, Hari, Chris Drago, Jake Nicholas)
4. Created final dataset with 112 members:
   - 102 active (97 paying + 5 scholarship)
   - 4 cancelled (will churn when subscription ends)
   - 6 churned
5. Missing Convex IDs for 2 new members: Todd Bonnewell, Jonathan Stokkland


Phase 1 – Database Schema Updates ✅ COMPLETE
==============================================

**Completed on**: July 7, 2025

Affected Files
--------------
* ``convex/schema.ts`` – ✅ added payment fields to members table, created 3 new tables
* ``convex/migrations/setupPaymentSystem.ts`` – ✅ created migration to populate billing data
* ``convex/auth.ts`` – ✅ updated to handle new member creation with payment fields
* ``package.json`` – ✅ added typecheck script for future use

Summary of Changes
------------------

1. **Update members table in schema.ts (line ~126 before role field)**:

.. code-block:: typescript

    // Payment tier tracking
    tier: v.optional(v.union(
      v.literal("free"),
      v.literal("scholarship"),
      v.literal("founding_member"),
      v.literal("early_bird"),
      v.literal("member")
    )),
    
    // Subscription management
    subscriptionStatus: v.optional(v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("past_due"),
      v.literal("expired")
    )),
    subscriptionEndDate: v.optional(v.number()), // Unix timestamp
    billingInterval: v.optional(v.union(
      v.literal("monthly"),
      v.literal("yearly")
    )),
    
    // Stripe integration
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    
    // Payment history tracking
    lastPaymentDate: v.optional(v.number()),
    amountCents: v.optional(v.number()),

2. **Add subscriptions table after members table (line ~658)**:

.. code-block:: typescript

    const subscriptions = defineTable({
      memberId: v.id("members"),
      stripeCustomerId: v.string(),
      stripeSubscriptionId: v.string(),
      stripePriceId: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("cancelled"),
        v.literal("past_due"),
        v.literal("expired")
      ),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      tier: v.union(
        v.literal("founding_member"),
        v.literal("early_bird"),
        v.literal("member")
      ),
      billingInterval: v.union(
        v.literal("monthly"),
        v.literal("yearly")
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_memberId", ["memberId"])
      .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
      .index("by_status", ["status"]);

3. **Add payments table**:

.. code-block:: typescript

    const payments = defineTable({
      memberId: v.id("members"),
      subscriptionId: v.optional(v.id("subscriptions")),
      stripePaymentIntentId: v.string(),
      stripeInvoiceId: v.optional(v.string()),
      amount: v.number(), // in cents
      currency: v.string(),
      status: v.union(
        v.literal("succeeded"),
        v.literal("pending"),
        v.literal("failed"),
        v.literal("refunded"),
        v.literal("partially_refunded")
      ),
      description: v.string(),
      paymentMethod: v.object({
        type: v.string(),
        brand: v.optional(v.string()),
        last4: v.string(),
      }),
      transactionFee: v.optional(v.number()),
      netAmount: v.optional(v.number()),
      failureReason: v.optional(v.string()),
      refundedAmount: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_memberId", ["memberId"])
      .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
      .index("by_status", ["status"])
      .index("by_createdAt", ["createdAt"]);

4. **Add stripeWebhookEvents table**:

.. code-block:: typescript

    const stripeWebhookEvents = defineTable({
      stripeEventId: v.string(),
      type: v.string(),
      processed: v.boolean(),
      error: v.optional(v.string()),
      createdAt: v.number(),
      processedAt: v.optional(v.number()),
    })
      .index("by_stripeEventId", ["stripeEventId"])
      .index("by_processed", ["processed"]);

5. **Create setupPaymentSystem.ts migration**:

.. code-block:: typescript

    import { mutation } from "./_generated/server";
    import billingData from "../migration-data/members-billing-final.json";
    
    export const runMigration = mutation(async ({ db }) => {
      // 1. Create Todd and Jonathan's accounts first (after schema is updated)
      const newMembers = [
        { 
          email: "todd@bonnewell.com", 
          firstName: "Todd", 
          lastName: "Bonnewell",
          tier: "early_bird",
          subscriptionStatus: "active",
          billingInterval: "monthly"
        },
        { 
          email: "jonathan@stokkland.com", 
          firstName: "Jonathan", 
          lastName: "Stokkland",
          tier: "early_bird", 
          subscriptionStatus: "active",
          billingInterval: "monthly"
        }
      ];
      
      for (const newMember of newMembers) {
        await db.insert("members", {
          ...newMember,
          role: "member",
          joinedAt: Date.now(),
        });
      }
      
      // 2. Update all members with billing data
      for (const member of billingData) {
        const existing = await db.query("members")
          .filter(q => q.eq(q.field("email"), member.email))
          .first();
          
        if (existing) {
          await db.patch(existing._id, {
            tier: member.tier,
            subscriptionStatus: member.status === "active" || member.tier === "scholarship" ? "active" : 
                              member.status === "cancelled" ? "cancelled" : undefined,
            subscriptionEndDate: member.subscriptionEndDate ? 
              new Date(member.subscriptionEndDate).getTime() : undefined,
            billingInterval: member.billingInterval as "monthly" | "yearly",
            lastPaymentDate: member.lastPaymentDate ? 
              new Date(member.lastPaymentDate).getTime() : undefined,
            amountCents: member.amountCents,
          });
        }
      }
    });

6. **Update export default defineSchema to include new tables**:

.. code-block:: typescript

    export default defineSchema({
      members,
      categories,
      posts,
      comments,
      votes,
      postViews,
      post_versions,
      bookmarks,
      notifications,
      topics,
      resources,
      pollVotes,
      commentReports,
      events,
      subscriptions,    // Add this
      payments,         // Add this
      stripeWebhookEvents, // Add this
    });

**Implementation Notes**:

1. **Schema Design Decision**: Made payment fields required (tier, subscriptionStatus, stripeCustomerId) to ensure all members are ready for future purchases
2. **Migration Strategy**: Temporarily made fields optional during deployment, ran migration, then made them required again
3. **Stripe Customer IDs**: Generated temporary IDs in format `cus_temp_{email}_{timestamp}` - will be replaced with real Stripe IDs in Phase 2
4. **New Members**: Todd Bonnewell and Jonathan Stokkland successfully created with early_bird tier
5. **Data Verification**: All 112 members now have payment fields populated correctly


Phase 2 – Stripe Integration
============================

Affected Files
--------------
* ``convex/stripe/checkout.ts`` – checkout session creation
* ``convex/stripe/webhooks.ts`` – webhook handlers
* ``convex/stripe/portal.ts`` – customer portal integration
* ``app/api/stripe/webhook/route.ts`` – webhook endpoint
* ``.env.local`` – Stripe environment variables

Summary of Changes
------------------

1. **Environment Variables**:

.. code-block:: bash

    STRIPE_SECRET_KEY=sk_...
    STRIPE_WEBHOOK_SECRET=whsec_...
    
    # Price IDs for each tier
    STRIPE_FOUNDING_MONTHLY=price_...
    STRIPE_FOUNDING_YEARLY=price_...
    STRIPE_EARLY_BIRD_MONTHLY=price_...
    STRIPE_EARLY_BIRD_YEARLY=price_...
    STRIPE_MEMBER_MONTHLY=price_...

2. **Checkout Session Creation**:

.. code-block:: typescript

    export const createCheckoutSession = mutation({
      args: {
        priceId: v.string(),
        tier: v.union(
          v.literal("founding_member"),
          v.literal("early_bird"),
          v.literal("member")
        ),
      },
      handler: async (ctx, args) => {
        // Create/get Stripe customer
        // Create checkout session
        // Return checkout URL
      }
    });

3. **Webhook Processing**:

.. code-block:: typescript

    // Handle events:
    - customer.subscription.created
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_succeeded
    - invoice.payment_failed

4. **Subscription Info Query**:

.. code-block:: typescript

    export const getSubscriptionInfo = query({
      handler: async (ctx) => {
        // Return subscription status with renewal info
        // Calculate "renews in X days"
      }
    });


Phase 3 – Access Control & Paywall
==================================

Affected Files
--------------
* ``convex/helpers/access.ts`` – access control utilities
* ``convex/posts.ts`` – update post queries
* ``components/paywall.tsx`` – paywall component

Summary of Changes
------------------

1. **Access Control Helper**:

.. code-block:: typescript

    export function canViewFullContent(memberRole: string | undefined): boolean {
      if (!memberRole) return false;
      const fullAccessRoles = ["founding_member", "early_bird", "member", "scholarship", "admin"];
      return fullAccessRoles.includes(memberRole);
    }

2. **Post Query Updates**:

.. code-block:: typescript

    // In getPost query
    if (!hasFullAccess) {
      return {
        ...post,
        content: post.content.substring(0, 200) + "...", 
        isPaywalled: true,
        fullContentRequiresTier: "founding_member",
      };
    }

3. **Paywall Component** shows upgrade options with tier pricing


Phase 4 – Updated Membership CTA Modal
======================================

Affected Files
--------------
* ``components/membership-cta-modal.tsx`` – complete rewrite

Summary of Changes
------------------

1. Display all available tiers (Founding Member, Member)
2. Monthly/Yearly toggle with savings badge
3. Tier selection with highlighting
4. Direct integration with Stripe checkout
5. Show "Best Value" badge on Founding Member tier
6. Handle both signed-in and signed-out states


Phase 5 – Admin Member Management
=================================

Affected Files
--------------
* ``app/admin/layout.tsx`` – admin navigation wrapper
* ``app/admin/members/page.tsx`` – member list page
* ``convex/admin/members.ts`` – member management queries
* ``convex/admin/payments.ts`` – payment history queries
* Components listed below

Summary of Changes
------------------

1. **Admin Navigation Layout**:
   - Sidebar with links to Members, Payments, Reports
   - Admin role verification

2. **Member Management Page** (``/admin/members``):
   
   **Features**:
   - Card-based member display
   - Status filter badges (Active, Cancelled, Churned)
   - Search by name/email
   - Sort by joined date, last active

   **Member Card Shows**:
   - Avatar (with fallback initials)
   - Full name
   - Bio (truncated to 2 lines)
   - Last active (e.g., "2 hours ago")
   - Joined date (e.g., "Member since Jan 2024")
   - Membership tier badge (color-coded)
   - "View Details" button

3. **Member Status Logic**:

.. code-block:: typescript

    function getMemberStatus(member) {
      if (member.subscriptionStatus === "active") return "active";
      if (member.subscriptionStatus === "cancelled" && 
          member.subscriptionEndDate > Date.now()) return "cancelled";
      return "churned";
    }

4. **Member Details Modal**:
   
   **Sections**:
   - Profile information
   - Subscription details
   - Payment history table
   - Admin actions (manage subscription, etc.)

5. **Payment History Display**:

.. code-block:: typescript

    // Payment row shows:
    - Date (clickable)
    - Amount
    - Status (with color coding)
    - Payment method (e.g., "VISA ****4242")

6. **Payment Details Modal** (onclick of payment date):

.. code-block:: typescript

    // Shows:
    - Invoice: AXMGIKS4-0002
    - Date paid: Jun 7, 2025
    - Customer: Member Name
    - Payment method: VISA - 8400
    - Paid: $50.00
    - Transaction fee (2.9% + 30¢): -$1.75
    - Total earned: $48.25
    - [REFUND PAYMENT] button


Phase 6 – Admin Components
==========================

New Components
--------------

1. **components/admin/member-card.tsx**:

.. code-block:: typescript

    interface MemberCardProps {
      member: Doc<"members">;
      subscription?: Doc<"subscriptions">;
    }

2. **components/admin/member-status-filter.tsx**:

.. code-block:: typescript

    // Badge filters for Active, Cancelled, Churned
    // Updates URL params for filtering

3. **components/admin/member-details-modal.tsx**:

.. code-block:: typescript

    // Full member information display
    // Payment history section
    // Subscription management actions

4. **components/admin/payment-history.tsx**:

.. code-block:: typescript

    // Table of payments with clickable rows
    // Status badges (succeeded, failed, refunded)
    // Payment method display

5. **components/admin/payment-details-modal.tsx**:

.. code-block:: typescript

    // Invoice details
    // Transaction fee calculation
    // Refund action (calls Stripe API)


Phase 7 – Testing & Monitoring
==============================

Testing Strategy
----------------

1. **Unit Tests**:
   - Schema migration tests
   - Access control logic tests
   - Payment calculation tests

2. **Integration Tests**:
   - Stripe webhook processing
   - Checkout flow
   - Payment history tracking

3. **E2E Tests**:
   - Complete signup → payment flow
   - Admin member management
   - Paywall interaction

Monitoring
----------

1. **Webhook Monitoring**:
   - Log all webhook events
   - Alert on processing failures
   - Track duplicate events

2. **Payment Metrics**:
   - Successful vs failed payments
   - Churn rate by tier
   - Revenue by tier

3. **Error Tracking**:
   - Stripe API failures
   - Webhook signature failures
   - Database consistency issues


Implementation Order
====================

1. **Week 1**: Database schema and migrations
2. **Week 2**: Stripe integration and webhooks
3. **Week 3**: Access control and paywall
4. **Week 4**: Admin member management UI
5. **Week 5**: Testing and monitoring

Key Considerations
==================

Security
--------
- Webhook signature validation mandatory
- Minimal payment data storage
- Admin actions audit trail
- Rate limiting on checkout creation

Performance
-----------
- Index on stripeCustomerId for webhook lookups
- Pagination for member lists
- Cache subscription status in member record

Business Logic
--------------
- Grandfathered pricing preserved
- Clear upgrade paths
- Grace period for failed payments
- Proration for plan changes

User Experience
---------------
- Clear pricing display
- Smooth checkout flow
- Self-service via Stripe portal
- Transparent billing history


Checklist
=========

Phase 0 – Data Preparation ✅
-----------------------------
☑ Export member data from Convex database
☑ Process billing-actual.csv with active members
☑ Identify and categorize scholarship members
☑ Transform data to members-billing-final.json
☑ Validate all member tiers and statuses

Phase 1 – Database Schema & Migration ✅
-----------------------------------------
☑ Add payment fields to members table (tier, subscriptionStatus, etc.)
☑ Create subscriptions table with Stripe tracking
☑ Create payments table for transaction history
☑ Create stripeWebhookEvents table for idempotency
☑ Update schema export to include new tables
☑ Create setupPaymentSystem.ts migration script
☑ Create Convex accounts for Todd Bonnewell and Jonathan Stokkland (in migration)
☑ Run migration to populate billing data for all 112 members
☑ Verify all members have correct tiers assigned

Phase 2 – Stripe Integration ✅ COMPLETE
=========================================
☑ Set up Stripe account and create price IDs for all tiers
☑ Create 100% off coupon code for free lifetime members
☑ Configure webhook secret in environment variables
☑ Create webhook endpoint in app/api/stripe/webhook/route.ts
☑ Implement webhook handler in convex/stripe/webhooks.ts
☑ Add customer portal integration in convex/stripe/portal.ts
☑ Handle subscription lifecycle events
☑ Process payment success/failure webhooks
☑ Process refund and partial_refund events – update payments table with refundedAmount and status
☑ Create checkout session mutation in convex/stripe/checkout.ts (already existed)
☑ Configure public Stripe price IDs in environment variables (NEXT_PUBLIC_STRIPE_*_PRICE_ID)
☑ Send renewal reminder notifications via notifications.sendRenewalReminder (convex/notifications.ts)
☑ Banner component (components/payment-reminder-banner.tsx) shown 7, 3, and 1 days before due
☑ Expose getSubscriptionInfo query (convex/stripe/getSubscriptionInfo.ts)
☑ Default “Activate Pro” checkout link on pricing/page.tsx triggers member tier Payment Link (calls convex/stripe/checkout.ts)
☑ Cron job to send renewal reminders daily (convex/crons.ts + convex/stripe/renewalReminders.ts)
☑ Extended notification system to support payment_reminder type
☑ Create personalized reactivation page for expired members
☑ Build comprehensive billing settings page
☑ Implement scholarship grant/revoke admin mutations
☑ Update pricing page to use environment variables
☑ Implement tier-specific checkout flows
☑ Create subscription info query with renewal calculations

Phase 3 – Access Control & Paywall ✅ COMPLETE
-----------------------------------------------
☑ Create canViewFullContent helper in convex/helpers/access.ts
☑ Update post queries to check member tier  
☑ Implement paywall logic for free tier members (50 char preview)
☑ Restrict guarded content on/after due date for unpaid members
☑ Surface JoinVaiProModal when content is restricted to prompt upgrade
☑ Create paywall component with upgrade CTA
☑ Test content access for each tier

Phase 4 – UI Components
-----------------------
☐ Rewrite membership CTA modal with tier selection
☑ Add monthly/yearly billing toggle (PricingPage)
☐ Display subscription status in member profile
☑ Update pricing/page.tsx with current tier pricing and “Activate Pro” CTA
☑ Integrate ReactivateBannerInline personalized with member name and tier status
☑ Wire “Activate Pro” CTA to checkout mutation (member tier Payment Link)
☐ Create pricing comparison table
☑ Implement Stripe checkout flow
☑ Add subscription management via customer portal

Phase 5 – Admin Member Management
---------------------------------
☐ Create admin layout with navigation
☐ Build member list page with cards view
☐ Add status filter badges (Active, Cancelled, Churned)
☐ Implement member search and sorting
☐ Create member details modal
☐ Build payment history table
☐ Ensure refunds appear in payment history table with negative amounts and status badge
☐ Implement refundSubscription mutation (convex/stripe/refund.ts) and secure Stripe refund call
☐ Refund mutation inserts payment record with status "refunded" (or updates existing) and logs admin actorId
☐ Add payment details modal with refund capability
☐ Display subscription management actions

Phase 6 – Admin Components
--------------------------
☐ Create components/admin/member-card.tsx
☐ Create components/admin/member-status-filter.tsx
☐ Create components/admin/member-details-modal.tsx
☐ Create components/admin/payment-history.tsx
☐ Create components/admin/payment-details-modal.tsx
☐ Integrate new components into /admin/members page
☐ Add Payments link to admin layout navigation
☐ Write unit tests for component rendering and interactions

Phase 7 – Testing & Monitoring
------------------------------
☐ Write schema migration unit tests
☐ Write canViewFullContent helper tests
☐ Write payment calculation unit tests
☐ Integration tests for Stripe webhook processing
☐ Integration tests for checkout flow
☐ Integration tests for payment history tracking
☐ E2E tests: signup → payment, admin member management, paywall interaction
☐ Implement webhook monitoring and alerting
☐ Implement payment metrics collection dashboards
☐ Add error tracking for Stripe API failures and database consistency


Production Deployment Checklist
================================

**Before Going Live**:

☐ **Stripe Configuration**:
   - ☑ Production API keys in .env.production
   - ☑ All products/prices created in Stripe dashboard
   - ☐ Webhook endpoint verified and tested
   - ☐ Customer portal configured with branding
   - ☐ Email receipts customized

☐ **Testing**:
   - ☐ Complete end-to-end payment flow
   - ☐ Subscription lifecycle (create, update, cancel)
   - ☐ Renewal reminders triggering correctly
   - ☐ Paywall blocking content appropriately
   - ☐ Grandfathered pricing preserved

☐ **Monitoring**:
   - ☐ Error alerting for webhook failures
   - ☐ Payment failure notifications
   - ☐ Daily revenue reports
   - ☐ Churn tracking by tier

☐ **Documentation**:
   - ☐ Customer FAQ for billing questions
   - ☐ Internal runbook for common issues
   - ☐ Admin guide for scholarship grants

☐ **Launch Communication**:
   - ☐ Email to existing members about new billing
   - ☐ Blog post about pricing structure
   - ☐ Support team briefing


Next Steps & Priority Order
============================

**Immediate (This Week)**:

1. **Phase 3 - Access Control** (2-3 days):
   - Implement canViewFullContent helper
   - Update post queries with paywall logic
   - Create and integrate paywall component
   - Test all subscription states

2. **Production Testing** (1-2 days):
   - Test complete payment flow with real cards
   - Verify webhook processing in production
   - Ensure renewal reminders are working
   - Test edge cases (failed payments, cancellations)

**Next Sprint**:

3. **Phase 5 - Admin Dashboard** (1 week):
   - Build member management interface
   - Add payment history views
   - Implement refund functionality
   - Create basic analytics

4. **Conversion Optimization** (ongoing):
   - A/B test pricing displays
   - Optimize paywall messaging
   - Add social proof elements
   - Track conversion metrics

**Future Enhancements**:
- Implement promo codes
- Add free trial periods
- Create referral program
- Build mobile app integration


Summary of Phase 2 Accomplishments
===================================

1. **Full Stripe Integration**:
   - Created all products/prices in Stripe (dev & prod)
   - Implemented checkout session creation
   - Built comprehensive webhook handling
   - Added customer portal integration

2. **Enhanced User Experience**:
   - Personalized reactivation flow for expired members
   - Automated renewal reminders (7, 3, 1 day)
   - Comprehensive billing settings page
   - Environment-based pricing configuration

3. **Admin Capabilities**:
   - Scholarship grant/revoke mutations
   - Foundation for payment management
   - Subscription tracking infrastructure

4. **Technical Infrastructure**:
   - Extended notification system for payments
   - Daily cron job for automated reminders
   - Idempotent webhook processing
   - Proper error handling throughout

**What Makes This Implementation Special**:
- Preserves grandfathered pricing for loyal members
- Only shows $99/mo publicly while maintaining special rates
- Personalized experiences based on subscription history
- Robust handling of edge cases (cancellations, expirations)
- Clean separation between tiers with future flexibility

Summary of Phase 3 Accomplishments
===================================

1. **Access Control Infrastructure**:
   - Created `canViewFullContent` helper that validates member subscription status
   - Handles all tier types including scholarship members
   - Supports grace period for cancelled subscriptions until end date
   - Returns false for expired, past_due, or free tier members

2. **Post Query Updates**:
   - Modified `getPostById` and `getPostBySlug` to check member access
   - Truncates content to 50 characters for non-subscribers
   - Adds `isPaywalled` and `fullContentRequiresTier` flags to response
   - Uses `getAuthenticatedMemberOrNull` for optional authentication

3. **Paywall Component**:
   - Professional paywall UI with content preview and gradient fade
   - Dynamic messaging based on tier requirements
   - Integrated sign-in flow for unauthenticated users
   - Launches JoinVaiProModal for subscription upgrade
   - Responsive design with clear call-to-action

4. **Integration**:
   - Updated PostDetail component to conditionally render paywall
   - Added paywall properties to Post interface
   - Seamless integration with existing post rendering logic
   - All TypeScript types properly defined and validated

Open Questions
--------------

* ✅ Preview length for paywalled posts: 50 characters (updated from 200)
* Should members with `past_due` status be fully paywalled or receive a grace period?
* Confirm placement/usage of **ReactivateBannerInline** component.
* Do scholarship members need distinct badge/messaging inside paywalls?
* Any additional analytics required before launch?