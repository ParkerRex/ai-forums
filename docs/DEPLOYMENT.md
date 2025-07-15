# VAI-VEX Deployment Guide

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Step 1: Database Setup (Convex)](#step-1-database-setup-convex)
- [Step 2: Stripe Configuration](#step-2-stripe-configuration)
- [Step 3: Clerk Configuration](#step-3-clerk-configuration)
- [Step 4: Frontend Deployment (Vercel)](#step-4-frontend-deployment-vercel)
- [Step 5: Post-Deployment Tasks](#step-5-post-deployment-tasks)
- [Step 6: Testing Production](#step-6-testing-production)
- [Step 7: DNS Configuration](#step-7-dns-configuration)
- [Step 8: Launch Checklist](#step-8-launch-checklist)
- [Rollback Plan](#rollback-plan)
- [Maintenance](#maintenance)
- [Support Contacts](#support-contacts)
- [Troubleshooting](#troubleshooting)
- [Security Checklist](#security-checklist)

## Overview

This guide covers deploying the VAI-VEX platform to production, including the Next.js frontend, Convex backend, and all necessary integrations.

## Prerequisites

- Node.js 18+ installed locally
- Vercel account (for frontend hosting)
- Convex account (for backend)
- Clerk account (for authentication)
- Stripe account (for payments)
- Cloudflare R2 account (for file storage)

## Environment Variables

### Required Variables

Create a `.env.production` file with:

```bash
# Convex
CONVEX_DEPLOYMENT=production
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/welcome

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_FOUNDING_MEMBER_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_EARLY_BIRD_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_MEMBER_PRICE_ID=price_...

# Cloudflare R2 (File Storage)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=vai-vex-production
R2_PUBLIC_URL=https://files.vai.community

# Application
NEXT_PUBLIC_APP_URL=https://app.vai.community
NODE_ENV=production
```

## Step 1: Database Setup (Convex)

### 1.1 Deploy Convex Backend

```bash
# Install Convex CLI if not already installed
npm install -g convex

# Deploy to production
npx convex deploy --prod

# This will:
# - Create a production deployment
# - Run all schema migrations
# - Set up indexes
# - Deploy all functions
```

### 1.2 Run Initial Migrations

```bash
# Set production environment
npx convex env set STRIPE_SECRET_KEY sk_live_... --prod
npx convex env set STRIPE_WEBHOOK_SECRET whsec_... --prod

# Run setup migrations
npx convex run setupPaymentSystem --prod
```

### 1.3 Verify Database Schema

```bash
# Check that all tables are created
npx convex dashboard --prod

# Verify tables:
# - members (with payment fields)
# - posts
# - comments
# - subscriptions
# - payments
# - stripeWebhookEvents
```

## Step 2: Stripe Configuration

### 2.1 Create Products and Prices

In Stripe Dashboard:

1. **Founding Member Tier**
   - Monthly: $39/month
   - Yearly: $375/year
   - Product ID: `prod_founding_member`

2. **Early Bird Tier**
   - Monthly: $50/month
   - Yearly: $480/year
   - Product ID: `prod_early_bird`

3. **Member Tier**
   - Monthly: $99/month
   - Product ID: `prod_member`

### 2.2 Configure Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://app.vai.community/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `charge.refunded`

4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 2.3 Configure Customer Portal

1. Go to Stripe Dashboard → Customer Portal
2. Enable features:
   - Update payment methods
   - Cancel subscriptions
   - View invoices
   - Update billing address

3. Set branding:
   - Logo
   - Brand colors
   - Custom domain: `billing.vai.community`

## Step 3: Clerk Configuration

### 3.1 Production Instance Setup

1. Create production instance in Clerk Dashboard
2. Configure OAuth providers:
   - Google
   - GitHub
   - Discord (optional)

3. Set allowed redirect URLs:
   - `https://app.vai.community/*`
   - `https://vai.community/*`

### 3.2 Webhook Configuration

1. Add webhook endpoint: `https://app.vai.community/api/clerk/webhook`
2. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`

### 3.3 Custom Domain

1. Add custom domain: `auth.vai.community`
2. Update DNS records as instructed
3. Update environment variables with new URLs

## Step 4: Frontend Deployment (Vercel)

### 4.1 Connect Repository

```bash
# In Vercel Dashboard
1. Import Git Repository
2. Select vai-vex repository
3. Choose Next.js framework preset
```

### 4.2 Configure Build Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### 4.3 Environment Variables

Add all production environment variables in Vercel:
1. Go to Project Settings → Environment Variables
2. Add each variable from `.env.production`
3. Ensure "Production" environment is selected

### 4.4 Deploy

```bash
# Trigger deployment
git push origin main

# Or manually
vercel --prod
```

## Step 5: Post-Deployment Tasks

### 5.1 Database Seeding

```bash
# Create admin user
npx convex run createAdminUser --prod --email admin@vai.community

# Import existing members (if migrating)
npx convex run importMembers --prod --file members-export.json
```

### 5.2 Monitoring Setup

1. **Vercel Analytics**
   - Enable Web Analytics
   - Enable Speed Insights

2. **Convex Monitoring**
   - Set up alerts for function errors
   - Configure dashboard access

3. **Stripe Monitoring**
   - Enable payment failure notifications
   - Set up daily revenue reports

4. **Error Tracking (Sentry)**
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard -i nextjs
   ```

### 5.3 Backup Configuration

1. **Database Backups**
   - Convex automatically backs up data
   - Configure export schedule for compliance

2. **File Storage Backups**
   - Set up R2 bucket replication
   - Enable versioning

## Step 6: Testing Production

### 6.1 Payment Flow Test

1. Create test account
2. Subscribe with test card: `4242 4242 4242 4242`
3. Verify:
   - Checkout completes
   - Webhook processes
   - Access granted
   - Email receipt sent

### 6.2 Content Access Test

1. Create free account
2. Verify paywall appears
3. Subscribe and verify access
4. Cancel and verify grace period

### 6.3 Performance Test

```bash
# Run Lighthouse audit
lighthouse https://app.vai.community --view

# Load test with k6
k6 run load-test.js
```

## Step 7: DNS Configuration

### 7.1 Domain Setup

Add these DNS records:

```
# Main app
A     app      76.76.21.21
AAAA  app      2606:4700:3030::6815:1515

# API subdomain
CNAME api      cname.vercel-dns.com

# Auth subdomain
CNAME auth     frontend-api.clerk.dev

# File storage
CNAME files    r2.cloudflarestorage.com
```

### 7.2 SSL Certificates

- Vercel handles SSL automatically
- Cloudflare provides SSL for R2
- Clerk manages auth subdomain SSL

## Step 8: Launch Checklist

### Pre-Launch
- [ ] All environment variables set
- [ ] Database migrations complete
- [ ] Stripe products configured
- [ ] Webhooks tested
- [ ] Admin accounts created
- [ ] Monitoring configured
- [ ] Backups verified
- [ ] SSL certificates active

### Launch Day
- [ ] Enable production mode
- [ ] Monitor error logs
- [ ] Check payment processing
- [ ] Verify email delivery
- [ ] Test customer portal
- [ ] Monitor performance

### Post-Launch
- [ ] Review analytics
- [ ] Check conversion rates
- [ ] Monitor churn
- [ ] Gather user feedback
- [ ] Plan optimizations

## Rollback Plan

If issues arise:

1. **Frontend Rollback**
   ```bash
   vercel rollback
   ```

2. **Backend Rollback**
   ```bash
   npx convex deploy --prod --version previous
   ```

3. **Database Restore**
   - Contact Convex support for point-in-time restore

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Check payment failures
   - Monitor performance metrics

2. **Monthly**
   - Security updates
   - Dependency updates
   - Database optimization
   - Cost analysis

3. **Quarterly**
   - Full backup test
   - Disaster recovery drill
   - Security audit

### Updating Production

```bash
# Test in staging first
npm run test
npm run build

# Deploy frontend
git push origin main

# Deploy backend functions
npx convex deploy --prod
```

## Support Contacts

- **Vercel Support**: support@vercel.com
- **Convex Support**: support@convex.dev
- **Clerk Support**: support@clerk.dev
- **Stripe Support**: support.stripe.com

## Troubleshooting

### Common Issues

1. **Webhook Failures**
   - Check webhook secret.
   - Verify endpoint URL.
   - Check Convex function logs.

2. **Authentication Issues**
   - Verify Clerk keys.
   - Check redirect URLs.
   - Review CORS settings.

3. **Payment Failures**
   - Check Stripe API keys.
   - Verify webhook processing.
   - Review customer portal settings.

### Debug Commands

```bash
# Check Convex logs
npx convex logs --prod

# Verify environment
npx convex env list --prod

# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Security Checklist

- [x] All secrets in environment variables
- [x] HTTPS enforced everywhere
- [x] CORS properly configured
- [ ] Rate limiting enabled (consider implementing)
- [x] Input validation on all endpoints
- [x] SQL injection prevention (N/A for Convex)
- [x] XSS protection headers
- [x] CSP headers configured