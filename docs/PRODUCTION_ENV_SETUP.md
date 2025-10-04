# Production Environment Variables Setup

**Last Updated:** 2025-10-04
**Purpose:** Configure production environment variables for Clerk to Custom Auth migration

---

## Overview

This document provides instructions for setting up all required environment variables in the production environment before deploying the custom auth system.

**IMPORTANT:** Keep both Clerk and Custom Auth variables during the migration period (dual-auth support).

---

## Environment Variables Checklist

### 1. Custom Auth Variables (NEW)

#### JWT_SECRET (REQUIRED)
```bash
JWT_SECRET=<generate-unique-secret-for-production>
```

**How to generate:**
```bash
# Run the generation script
bun scripts/generate-jwt-secret.ts

# Output will be a 32-byte base64 string like:
# hy0rNS+tVT9YNRlFVI5pBHwtkDUe7QbwgDx2KGwcsRs=

# IMPORTANT:
# - Generate a NEW secret for production (don't reuse staging/dev)
# - Store in secure vault (1Password, AWS Secrets Manager, etc.)
# - Never commit to git
# - Never log or expose in client-side code
```

**Verification:**
- [ ] Secret is 32+ characters
- [ ] Secret is base64-encoded
- [ ] Secret is unique (not used in staging/dev)
- [ ] Secret stored securely

---

### 2. Email Service Variables (NEW)

#### RESEND_API_KEY (REQUIRED)
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

**How to obtain:**
1. Log in to Resend dashboard: https://resend.com/
2. Navigate to API Keys section
3. Create new API key with name: "VAI Production"
4. Set permissions: "Send emails"
5. Copy the API key (starts with `re_`)

**IMPORTANT:**
- Use production API key (not test/staging key)
- Verify account limits: 100,000+ emails/month recommended
- Ensure billing is set up to avoid service interruption

**Verification:**
- [ ] API key is production key
- [ ] Account verified and active
- [ ] Billing configured
- [ ] Email sending limits adequate (100k+/month)

#### EMAIL_FROM (REQUIRED)
```bash
EMAIL_FROM=noreply@yourapp.com
```

**Requirements:**
- Must be a verified domain in Resend
- SPF, DKIM, DMARC records configured
- Sender reputation established (email warmup complete)

**Verification:**
- [ ] Domain verified in Resend
- [ ] DNS records configured (SPF, DKIM, DMARC)
- [ ] Email warmup completed (if new domain)
- [ ] Test email sends successfully

---

### 3. Application Variables

#### NEXT_PUBLIC_APP_URL (UPDATE)
```bash
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

**Note:** Should already be set, but verify it's correct for production

**Verification:**
- [ ] URL is production domain
- [ ] HTTPS (not HTTP)
- [ ] No trailing slash

#### NEXT_PUBLIC_USE_CUSTOM_AUTH (NEW - START WITH FALSE)
```bash
NEXT_PUBLIC_USE_CUSTOM_AUTH=false
```

**IMPORTANT:**
- Start with `false` to keep Clerk active during migration
- Flip to `true` on Day 7 after migration emails sent
- This controls which auth system is active

**Verification:**
- [ ] Set to `false` for initial deployment
- [ ] Plan to flip to `true` on Day 7
- [ ] Team aware of flip timeline

---

### 4. Clerk Variables (KEEP DURING MIGRATION)

#### NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (KEEP)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
```

**Note:** Keep this variable during migration period for dual-auth support

**Verification:**
- [ ] This is the LIVE key (not test key)
- [ ] Key is active in Clerk dashboard
- [ ] DO NOT remove until TASK-063

#### CLERK_SECRET_KEY (KEEP)
```bash
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
```

**Note:** Keep this variable during migration period

**Verification:**
- [ ] This is the LIVE secret (not test secret)
- [ ] Secret is active in Clerk dashboard
- [ ] DO NOT remove until TASK-063

---

### 5. Session Configuration (OPTIONAL)

#### SESSION_COOKIE_NAME (OPTIONAL)
```bash
SESSION_COOKIE_NAME=vai_session
```

**Default:** `vai_session` (if not set)

#### SESSION_EXPIRY_DAYS (OPTIONAL)
```bash
SESSION_EXPIRY_DAYS=7
```

**Default:** `7` days (if not set)

---

### 6. Database (Already Configured)

#### CONVEX_DEPLOYMENT (KEEP)
```bash
CONVEX_DEPLOYMENT=<your-production-deployment>
```

**Note:** Should already be configured

**Verification:**
- [ ] Deployment name is production (not dev)
- [ ] Convex dashboard shows correct deployment

---

## Platform-Specific Setup Instructions

### Vercel

1. **Navigate to Project Settings:**
   - Go to Vercel dashboard
   - Select your project
   - Navigate to Settings → Environment Variables

2. **Add Each Variable:**
   ```
   Key: JWT_SECRET
   Value: <your-generated-secret>
   Environment: Production
   ```

3. **Repeat for all variables above**

4. **Redeploy (if needed):**
   ```bash
   # Vercel auto-redeploys on env var change
   # Or trigger manually:
   vercel --prod
   ```

### Netlify

1. **Navigate to Site Settings:**
   - Go to Netlify dashboard
   - Select your site
   - Navigate to Site settings → Build & deploy → Environment

2. **Add Each Variable:**
   ```
   Key: JWT_SECRET
   Value: <your-generated-secret>
   Scopes: Production
   ```

3. **Redeploy:**
   ```bash
   netlify deploy --prod
   ```

### AWS Amplify

1. **Navigate to App Settings:**
   - Go to Amplify console
   - Select your app
   - Navigate to App settings → Environment variables

2. **Add Each Variable:**
   ```
   Variable name: JWT_SECRET
   Value: <your-generated-secret>
   ```

3. **Redeploy:**
   - Trigger build manually or push to branch

### Docker/Custom Hosting

1. **Create `.env.production` file:**
   ```bash
   # DO NOT commit this file to git
   # Add to .gitignore

   # Custom Auth
   JWT_SECRET=<your-generated-secret>
   RESEND_API_KEY=<your-api-key>
   EMAIL_FROM=noreply@yourapp.com

   # Application
   NEXT_PUBLIC_APP_URL=https://yourapp.com
   NEXT_PUBLIC_USE_CUSTOM_AUTH=false

   # Clerk (keep during migration)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-publishable-key>
   CLERK_SECRET_KEY=<clerk-secret-key>

   # Convex
   CONVEX_DEPLOYMENT=<production-deployment>
   ```

2. **Load in Docker Compose:**
   ```yaml
   version: '3'
   services:
     web:
       env_file:
         - .env.production
   ```

3. **Or pass via command line:**
   ```bash
   docker run -e JWT_SECRET=$JWT_SECRET -e RESEND_API_KEY=$RESEND_API_KEY ...
   ```

---

## Security Best Practices

### Secret Management

1. **Use a Secret Vault:**
   - 1Password
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault

2. **Never Commit Secrets:**
   - Add `.env.production` to `.gitignore`
   - Use environment variables in hosting platform
   - Rotate secrets regularly (every 90 days)

3. **Limit Access:**
   - Only engineering leads have access to production secrets
   - Use role-based access control (RBAC)
   - Audit secret access logs

### Verification

1. **Test Secret Access:**
   ```bash
   # In production environment, verify secrets are set
   # Create a test endpoint (remove after verification):
   # GET /api/test/env-check
   # Returns: { jwt_secret_set: true, resend_key_set: true, ... }
   ```

2. **Monitor for Exposure:**
   - Check logs for accidental secret logging
   - Use secret scanning tools (GitHub, GitLab)
   - Alert on public secret exposure

---

## Verification Checklist

Before proceeding with deployment, verify:

### Custom Auth
- [ ] JWT_SECRET generated and stored securely
- [ ] JWT_SECRET is unique for production
- [ ] RESEND_API_KEY is production key
- [ ] EMAIL_FROM domain verified in Resend
- [ ] NEXT_PUBLIC_USE_CUSTOM_AUTH=false (initial)

### Clerk (Dual Auth)
- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is LIVE key
- [ ] CLERK_SECRET_KEY is LIVE secret
- [ ] Both keys active in Clerk dashboard

### Application
- [ ] NEXT_PUBLIC_APP_URL is correct
- [ ] CONVEX_DEPLOYMENT is production

### Security
- [ ] All secrets stored in vault
- [ ] No secrets committed to git
- [ ] Access limited to authorized personnel
- [ ] Audit trail enabled

### Testing
- [ ] Test custom auth sign-up flow (after deployment)
- [ ] Test Clerk auth still works (dual auth)
- [ ] Test email delivery
- [ ] Test session creation

---

## Rollback Plan

If issues occur after environment variable changes:

1. **Revert to Previous Values:**
   - Restore old environment variables from vault
   - Redeploy application

2. **Verify Rollback:**
   - Test authentication flow
   - Check error logs

3. **Document Issue:**
   - Note what went wrong
   - Update this document with fix

---

## Timeline

| Step | Timing | Owner |
|------|--------|-------|
| Generate JWT_SECRET | Day -1 | DevOps |
| Verify Resend account | Day -1 | DevOps |
| Configure all env vars | Day -1 | DevOps |
| Test email delivery | Day -1 | DevOps |
| Deploy infrastructure | Day 0, 10:00 AM | DevOps |
| Verify deployment | Day 0, 10:30 AM | Engineering |
| Send migration emails | Day 0, 12:00 PM | Engineering |
| Flip feature flag | Day 7, 10:00 AM | Engineering Lead |

---

## Support

**Questions?** Contact:
- DevOps Lead: [email]
- Engineering Lead: [email]
- Slack: #engineering-deployment

---

## Appendix: Environment Variable Reference

### Required Variables
| Variable | Type | Example | When to Set |
|----------|------|---------|-------------|
| JWT_SECRET | Secret | `hy0r...csRs=` | Before deployment |
| RESEND_API_KEY | Secret | `re_xxxxx` | Before deployment |
| EMAIL_FROM | Public | `noreply@app.com` | Before deployment |
| NEXT_PUBLIC_APP_URL | Public | `https://app.com` | Already set |
| NEXT_PUBLIC_USE_CUSTOM_AUTH | Public | `false` → `true` | Day 0 → Day 7 |

### Optional Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| SESSION_COOKIE_NAME | Public | `vai_session` | Customize cookie name |
| SESSION_EXPIRY_DAYS | Public | `7` | Session duration |

### Clerk Variables (Keep During Migration)
| Variable | Type | When to Remove |
|----------|------|----------------|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Public | TASK-063 |
| CLERK_SECRET_KEY | Secret | TASK-063 |

---

**Document Status:** READY FOR USE
**Last Updated:** 2025-10-04
**Version:** 1.0
