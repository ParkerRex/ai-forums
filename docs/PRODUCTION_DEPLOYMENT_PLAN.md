# Production Deployment Plan - VAI Payment System

## Overview
This document outlines the plan to deploy the payment system from development to production for the VAI platform.

## Current State Analysis

### Development Environment (Completed)
- **Schema**: Payment tables fully implemented
  - `members` table: Extended with payment fields (tier, subscriptionStatus, billing info)
  - `subscriptions` table: Active subscription tracking
  - `payments` table: Transaction history
  - `stripeWebhookEvents` table: Webhook processing
- **Data**: No test payment data in dev
- **Environment Variables**: Test Stripe keys configured

### Production Environment (Current)
- **Schema**: Missing payment-related tables and fields
  - `members` table: Missing payment fields (only has stripeCustomerId from prod)
  - No `payments`, `subscriptions`, or `stripeWebhookEvents` tables
- **Environment Variables**: Production Stripe keys configured
  - Live publishable key: `pk_live_51JEkO6CgIdJ1QglPSnJ9fsbN7SEB0wrIpNXcK7QMg2tTf7UbPxW1Lh1wQIHGJXCJf47dAa7DGcNu0y4OORWgwLHM00GT9YzM64`
  - Live secret key: Configured
  - Webhook secret: `whsec_xxx` (needs actual webhook endpoint secret)

## Deployment Steps

### Phase 1: Pre-Deployment Preparation ✓
1. **Backup Production Data**
   ```bash
   npx convex export --prod
   ```

2. **Verify Stripe Configuration**
   - [ ] Confirm production Stripe account is ready
   - [ ] Verify product/price IDs match between dev and prod
   - [ ] Set up production webhook endpoint in Stripe Dashboard
   - [ ] Get production webhook signing secret

### Phase 2: Schema Migration
1. **Deploy Schema Changes**
   ```bash
   npx convex deploy --prod
   ```
   This will:
   - Add new fields to `members` table
   - Create `subscriptions`, `payments`, `stripeWebhookEvents` tables
   - Create all necessary indexes

2. **Run Data Migration**
   - Deploy migration function to populate default values
   - Set all existing members to:
     - `tier: "free"`
     - `subscriptionStatus: "none"`
     - `stripeCustomerId: ""` (if not already set)

### Phase 3: Environment Variable Updates
1. **Update Production Webhook Secret**
   ```bash
   npx convex env set STRIPE_WEBHOOK_SECRET "whsec_actual_secret_from_stripe" --prod
   ```

2. **Verify All Payment Environment Variables**
   - STRIPE_SECRET_KEY ✓
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ✓
   - STRIPE_WEBHOOK_SECRET (needs update)
   - NEXT_PUBLIC_APP_URL ✓

### Phase 4: Deploy Application Code
1. **Deploy Frontend Changes**
   - Payment UI components
   - Subscription management pages
   - Admin dashboards

2. **Deploy API Routes**
   - Stripe webhook handler
   - Checkout session creation
   - Portal session creation

### Phase 5: Post-Deployment Verification
1. **Test Webhook Connectivity**
   - Use Stripe CLI to send test events
   - Verify events are processed correctly

2. **Test Payment Flow**
   - Create test subscription with Stripe test card
   - Verify subscription is created in database
   - Test customer portal access

3. **Monitor System Health**
   - Check monitoring dashboard
   - Verify no errors in logs
   - Monitor webhook processing

## Rollback Plan

### Immediate Rollback (< 5 minutes)
If critical issues occur immediately after deployment:
1. Revert Convex functions to previous version
2. Frontend will automatically use previous API version

### Database Rollback
If data corruption occurs:
1. Export current data for analysis
2. Remove new tables/fields
3. Restore from pre-deployment backup

### Partial Rollback
For non-critical issues:
1. Disable payment features via feature flag
2. Fix issues in development
3. Re-deploy when ready

## Risk Mitigation

### High-Risk Areas
1. **Schema Migration**: Low risk - additive changes only
2. **Webhook Processing**: Medium risk - needs proper secret configuration
3. **Payment Flow**: Low risk - well-tested in development

### Monitoring Points
- Webhook event processing rate
- Payment success/failure rates
- Database query performance
- Error logs for payment operations

## Success Criteria
- [ ] All schema changes deployed successfully
- [ ] Webhook events processing correctly
- [ ] Test payment completes end-to-end
- [ ] No errors in production logs
- [ ] Monitoring dashboard shows healthy status

## Timeline
- **Preparation**: 30 minutes
- **Schema Migration**: 10 minutes
- **Code Deployment**: 20 minutes
- **Verification**: 30 minutes
- **Total**: ~90 minutes

## Contact Information
- **Technical Lead**: [Your Name]
- **Stripe Support**: dashboard.stripe.com/support
- **On-Call**: [Contact Info]

## Post-Deployment Tasks
1. Enable production payment processing
2. Announce feature availability to users
3. Monitor for 24 hours
4. Document any issues encountered