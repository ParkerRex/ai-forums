# Payment System Documentation

## Table of Contents

- [Overview](#overview)
- [Membership Tiers](#membership-tiers)
- [Technical Architecture](#technical-architecture)
- [Payment Flow](#payment-flow)
- [Webhook Events](#webhook-events)
- [Content Access Rules](#content-access-rules)
- [Admin Features](#admin-features)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Security Considerations](#security-considerations)
- [Production Checklist](#production-checklist)
- [Support Resources](#support-resources)
- [Future Enhancements](#future-enhancements)

## Overview

The VAI platform implements a comprehensive payment system using Stripe for subscription management, content paywalls, and member tier tracking. The system operates with **zero free users** and supports 3 paid membership tiers with grandfathered pricing for early supporters.

**Important**: Scholarships are now handled via Stripe coupon codes (100% discount) applied to the Early Bird tier, rather than as a separate tier.

## Membership Tiers

### 1. **Founding Member** - $39/mo or $375/yr
- Early supporter pricing (locked forever)
- Full access to all content
- 20% savings on yearly plan

### 2. **Early Bird** - $50/mo or $480/yr
- Grandfathered rate for existing members
- Full access to all content
- 20% savings on yearly plan
- **Scholarship discounts applied via Stripe coupons**

### 3. **Member** - $99/mo
- Standard pricing for new members
- Full access to all content
- Monthly billing only

## Technical Architecture

### Database Schema

#### Members Table Extensions
```typescript
{
  // Payment tier tracking
  tier: "free" | "scholarship" | "founding_member" | "early_bird" | "member",
  
  // Subscription management
  subscriptionStatus: "active" | "cancelled" | "past_due" | "expired" | "none",
  subscriptionEndDate?: number, // Unix timestamp
  billingInterval?: "monthly" | "yearly",
  
  // Stripe integration
  stripeCustomerId: string,
  stripeSubscriptionId?: string,
  
  // Payment history tracking
  lastPaymentDate?: number,
  amountCents?: number,
}
```

#### Additional Tables
- **subscriptions**: Active subscription tracking
- **payments**: Complete payment history with refunds
- **stripeWebhookEvents**: Webhook idempotency and monitoring

### Key Components

#### Access Control (`convex/helpers/subscription-access.ts`)
```typescript
export function canViewFullContent(member: Doc<"members"> | null): boolean
export function needsSubscriptionUpgrade(member: Doc<"members"> | null): boolean
export function getSubscriptionStatusMessage(member: Doc<"members">): string
```

#### Stripe Integration (`convex/stripe/`)
- `checkout.ts` - Create checkout sessions
- `webhooks.ts` - Handle Stripe events
- `portal.ts` - Customer portal access
- `refund.ts` - Process refunds
- `monitoring.ts` - Webhook health tracking

#### Admin Tools (`app/admin/`)
- `/admin/members` - Member management with subscription info
- `/admin/payments` - Payment history and refunds
- `/admin/analytics` - Revenue metrics and MRR tracking
- `/admin/monitoring` - Webhook health dashboard

## Payment Flow

### New Subscription
1. User clicks upgrade CTA
2. System creates Stripe checkout session
3. User completes payment on Stripe
4. Webhook updates member status
5. User gains immediate access

### Renewal
1. Stripe charges card automatically
2. Webhook records successful payment
3. Subscription continues uninterrupted

### Failed Payment
1. Stripe retry logic attempts collection
2. Member status set to `past_due`
3. Content access restricted
4. Email notifications sent

### Cancellation
1. User cancels via customer portal
2. Status set to `cancelled`
3. Access continues until period end
4. Status changes to `expired` after end date

## Webhook Events

The system processes these Stripe events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `charge.refunded`

All events are processed idempotently with monitoring.

## Content Access Rules

### Full Access Granted
- Active subscription with paid tier
- Scholarship tier (regardless of payment)
- Cancelled subscription within grace period

### Access Restricted
- Free tier members
- Expired subscriptions
- Past due subscriptions
- Unauthenticated users

## Admin Features

### Member Management
- View all members with subscription status
- Filter by active/cancelled/churned
- Grant/revoke scholarship status
- View individual payment history

### Payment Processing
- View all payments with details
- Process full or partial refunds
- Transaction fee tracking
- Net revenue calculations

### Analytics Dashboard
- Monthly Recurring Revenue (MRR)
- Growth trends and charts
- Churn analysis by tier
- Revenue breakdown
- Payment method statistics

### Monitoring
- Real-time webhook health
- Processing time metrics
- Failure rate tracking
- Event type breakdown

## Testing

The payment system includes comprehensive test coverage:

### Unit Tests (63 tests)
- Schema migration validation
- Access control logic
- Payment calculations

### Integration Tests (39 tests)
- Webhook processing
- Checkout flows
- Payment history

### Test Files
- `convex/test/schema-migration.test.ts`
- `convex/test/access-control.test.ts`
- `convex/test/payment-calculations.test.ts`
- `convex/test/stripe-webhooks.test.ts`
- `convex/test/checkout-flow.test.ts`
- `convex/test/payment-history.test.ts`

## Environment Variables

Required Stripe configuration:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Public Price IDs
NEXT_PUBLIC_STRIPE_FOUNDING_MEMBER_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_EARLY_BIRD_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_MEMBER_PRICE_ID=price_...
```

## Security Considerations

1. **Webhook Signature Validation**: All webhooks verified using Stripe signature
2. **Minimal Data Storage**: Only essential payment data stored
3. **Admin Access Control**: All admin mutations require authentication
4. **Idempotent Processing**: Duplicate webhooks handled gracefully
5. **Secure Refund Process**: Admin-only with audit logging

## Production Checklist

Before going live:
- [ ] Configure production Stripe keys
- [ ] Verify webhook endpoint URL
- [ ] Test complete payment flow
- [ ] Configure customer portal branding
- [ ] Set up monitoring alerts
- [ ] Create support documentation
- [ ] Train support team

## Support Resources

### Common Issues
1. **Payment Failed**: Check card details, try different payment method.
2. **Access Not Granted**: Allow 1-2 minutes for webhook processing.
3. **Cancellation**: Use customer portal for self-service.
4. **Refunds**: Contact admin for processing.

### Admin Tools
- Payment history: `/admin/payments`
- Member details: `/admin/members`
- System health: `/admin/monitoring`
- Revenue metrics: `/admin/analytics`

## Future Enhancements

Planned improvements:
- Promo code support
- Free trial periods
- Team/organization billing
- Invoice customization
- Advanced dunning management