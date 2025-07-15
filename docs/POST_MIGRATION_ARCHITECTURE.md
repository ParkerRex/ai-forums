# Post-Migration Reactivation Architecture

## Overview

This document outlines the architecture for the post-migration reactivation system where all imported members start with expired subscriptions and need to reactivate their accounts.

## 🏗️ Architecture Principles

### 1. **No Free Tier**
- Eliminate `"free"` as a valid tier option
- All members get paid tiers: `founding_member`, `early_bird`, `member`
- Use scholarship system for special cases

### 2. **Scholarship via Coupons**
- Scholarships granted through 100% discount Stripe coupons
- No direct tier assignment to "scholarship"
- Trackable and manageable through Stripe

### 3. **Post-Migration State**
All imported members start with:
```typescript
{
  tier: "founding_member" | "early_bird" | "member", // Keep original tier
  subscriptionStatus: "expired", // All start expired
  subscriptionEndDate: undefined, // No grace period
  stripeSubscriptionId: undefined, // No active subscription
  stripeCustomerId: "cus_temp_..." // Keep for reactivation
}
```

## 🎯 Reactivation Flow

### 1. **Banner Display Logic**
Members see reactivation banners when:
- `subscriptionStatus !== "active"`
- `tier !== "scholarship"`
- Not dismissed recently

### 2. **Banner Messages**
- **Expired**: "Welcome back [name]! Your Pro access has expired"
- **Cancelled**: "Welcome back [name]! Your Pro access has expired"
- **Past Due**: "[name], please update your payment method to restore Pro access"

### 3. **Reactivation Process**
1. User clicks "Reactivate Pro" in banner
2. Creates Stripe checkout with original tier pricing
3. Redirects to Stripe payment
4. Webhook processes successful payment
5. Member status updated to active

## 💳 Stripe Configuration

### Required Price IDs
```bash
# Founding Member ($39/mo, $375/yr)
STRIPE_FOUNDING_MEMBER_MONTHLY_PRICE_ID=price_...
STRIPE_FOUNDING_MEMBER_YEARLY_PRICE_ID=price_...

# Early Bird ($50/mo, $480/yr)  
STRIPE_EARLY_BIRD_MONTHLY_PRICE_ID=price_...
STRIPE_EARLY_BIRD_YEARLY_PRICE_ID=price_...

# Member ($99/mo, $950/yr)
STRIPE_MEMBER_MONTHLY_PRICE_ID=price_...
STRIPE_MEMBER_YEARLY_PRICE_ID=price_...
```

### Scholarship Coupons
Create 100% discount coupons in Stripe:
- Code: `SCHOLARSHIP_2024`
- Discount: 100% off
- Duration: Forever
- Usage: Limited per scholarship recipient

## 🔧 Implementation Steps

### 1. **Update Environment Variables**
Add missing Stripe price IDs for all tiers and billing intervals.

### 2. **Create Migration Script**
```typescript
// Set all imported members to expired state
await simulateFullMigration();
```

### 3. **Update Banner Logic**
- Remove free tier references
- Add expired status handling
- Preserve tier-specific pricing

### 4. **Test Reactivation Flow**
1. Set test account to expired state
2. Verify banners appear
3. Test checkout process
4. Confirm webhook updates member status

### 5. **Create Scholarship System**
1. Create Stripe coupons for scholarships
2. Update checkout to handle scholarship metadata
3. Webhook recognizes scholarship coupons
4. Sets member tier to "scholarship"

## 📊 Testing Checklist

- [ ] Banners appear for expired members
- [ ] Banners show correct tier-specific messaging
- [ ] Checkout preserves original tier pricing
- [ ] Webhook correctly reactivates members
- [ ] Scholarship coupons work properly
- [ ] Access control respects new states

## 🚀 Deployment Plan

### Phase 1: Setup (Pre-Migration)
1. Create all Stripe products and prices
2. Add environment variables
3. Test reactivation flow in development

### Phase 2: Migration
1. Run migration script to set all members to expired
2. Send reactivation email to all members
3. Monitor reactivation rates

### Phase 3: Scholarship Management
1. Create scholarship coupons as needed
2. Send personalized links to scholarship recipients
3. Track scholarship usage

## 🔍 Monitoring

### Key Metrics
- Reactivation rate by tier
- Time to reactivation
- Scholarship coupon usage
- Support tickets related to reactivation

### Alerts
- Failed webhook processing
- High reactivation abandonment
- Stripe API errors

## 🛠️ Maintenance

### Regular Tasks
- Monitor reactivation rates
- Update pricing as needed
- Manage scholarship coupons
- Clean up expired temp customer IDs

### Troubleshooting
- Check webhook logs for failed events
- Verify Stripe price ID configuration
- Monitor member state consistency
