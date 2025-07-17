# Testing Payment Flow

This document outlines how to test the complete payment flow from paywall to successful membership activation.

## Prerequisites

1. **Stripe Webhook Configuration**
   - Webhook endpoint URL: `https://joinvai.com/api/stripe/webhook`
   - ⚠️ **Common Issue**: Make sure webhook URL points to Next.js app, NOT Convex deployment
   - Webhook events: `checkout.session.completed`, `customer.subscription.created`, etc.

2. **Test Coupon Codes**
   - 100% off coupons for testing (e.g., `EARLY_BIRD_100`)
   - Verify coupons are active in Stripe dashboard

## Reset Account for Testing

To reset any account back to paywall state:

```javascript
// Use Convex function to reset account
await ctx.runMutation("migrations/testReactivation.js:simulatePostMigrationState", {
  email: "test@example.com"
});
```

This changes:
- `subscriptionStatus`: `"active"` → `"expired"`
- Triggers paywall on next page load

## Complete Test Flow

### 1. **Trigger Paywall**
- Refresh browser after account reset
- Navigate to premium content
- Verify membership CTA appears

### 2. **Payment Process**
- Click "Upgrade to Member" or similar CTA
- Complete Stripe checkout with 100% off coupon
- Verify checkout success page loads

### 3. **Webhook Processing**
- Check Stripe webhook logs for successful delivery
- Verify `checkout.session.completed` event processed
- Check Convex `stripeWebhookEvents` table for event record

### 4. **Member Activation**
- Verify member record updated with:
  - `subscriptionStatus`: `"active"`
  - `tier`: `"early_bird"` (or appropriate tier)
  - `stripeCustomerId`: populated
  - `signInToken`: generated

### 5. **Auto-Login**
- Verify user is automatically signed in after payment
- Check that premium content is now accessible
- Verify no more paywall prompts appear

## Troubleshooting

### Webhook Issues
- **404 Not Found**: Check webhook URL points to Next.js app
- **500 Server Error**: Check webhook signing secret matches
- **No events received**: Verify webhook is active in Stripe

### Payment Issues
- **Stuck loading**: Usually webhook delivery failure
- **No auto-login**: Check `signInToken` generation
- **Still seeing paywall**: Check `subscriptionStatus` update

### Debug Commands

```javascript
// Check member status
await ctx.runQuery("members.js:getMemberByEmail", { email: "test@example.com" });

// Check recent webhook events
await ctx.runQuery("stripe/monitoring.js:getRecentFailures", { limit: 10 });

// Check payment records
await ctx.runQuery("admin/payments.js:getAllPayments", { limit: 10 });
```

## Test Accounts

For consistent testing, use these dedicated test accounts:
- `test-member@joinvai.com` - For member tier testing
- `test-early-bird@joinvai.com` - For early bird tier testing

## Reset Commands

```javascript
// Reset specific account
await ctx.runMutation("migrations/testReactivation.js:simulatePostMigrationState", {
  email: "test@example.com"
});

// Reset to active state (if needed)
await ctx.runMutation("migrations/testReactivation.js:resetToActiveState", {
  email: "test@example.com"
});
```

## Success Criteria

✅ **Payment flow is working when:**
1. Paywall appears for expired/non-members
2. Stripe checkout completes successfully
3. Webhooks are delivered and processed
4. Member status updates correctly
5. User is auto-logged in after payment
6. Premium content becomes accessible

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 404 webhook errors | Wrong webhook URL | Update to `https://joinvai.com/api/stripe/webhook` |
| Stuck loading screen | Webhook not processed | Check webhook delivery in Stripe |
| No auto-login | Missing signInToken | Check webhook processing logic |
| Still see paywall | Status not updated | Verify webhook event handling |

---

**Last Updated**: 2025-01-17
**Next Review**: After any webhook or payment flow changes
