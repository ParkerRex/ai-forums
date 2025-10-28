# Auth Rollback Plan: Custom Auth → Clerk

## Overview

This document provides a comprehensive rollback plan for reverting from custom authentication to Clerk authentication. The rollback is designed to be safe, reversible, and preserve all user data.

**Estimated Time:** 30-60 minutes
**Risk Level:** Low (no data loss)
**Reversibility:** Full (can switch back to custom auth anytime)

## When to Use This Plan

Trigger rollback if:
- Critical auth bug discovered in custom auth system
- Email delivery failure rate >5%
- Sign-in success rate drops below 90%
- Performance degradation (p95 latency >500ms)
- Security vulnerability discovered
- User complaints exceed threshold
- Migration completion rate <50% by Day 7

## Prerequisites

Before starting rollback:
- ✅ Clerk account and credentials available
- ✅ Access to production environment variables
- ✅ Deployment access (Vercel/Railway/etc.)
- ✅ Database backup completed (optional but recommended)
- ✅ Team notified and available
- ✅ Support team prepared for user questions

## Rollback Steps

### Step 1: Check Rollback Readiness (5 minutes)

```bash
# Check current auth system status
bun scripts/rollback-auth.ts --check

# Verify Clerk credentials present
grep CLERK .env.local

# Verify custom auth can be disabled
grep NEXT_PUBLIC_USE_CUSTOM_AUTH .env.local
```

**Expected Output:**
- Current auth system: CUSTOM
- Clerk env vars: PRESENT
- Can rollback: YES

### Step 2: Update Environment Variables (10 minutes)

#### Local Environment

```bash
# Automated rollback (updates .env.local)
bun scripts/rollback-auth.ts --execute

# Or manually update .env.local
# Change:
NEXT_PUBLIC_USE_CUSTOM_AUTH=false

# Ensure Clerk vars present:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### Production Environment (Vercel)

```bash
# Update production env var
vercel env add NEXT_PUBLIC_USE_CUSTOM_AUTH production
# Enter value: false

# Verify other Clerk vars are set
vercel env ls production | grep CLERK
```

#### Production Environment (Other platforms)

- Railway: Update env vars in dashboard
- Render: Update env vars in settings
- AWS: Update parameter store
- Docker: Update environment file

### Step 3: Restore Clerk Middleware (10 minutes)

**File:** `middleware.ts`

```typescript
// ❌ Remove or comment out custom JWT validation:
// if (process.env.NEXT_PUBLIC_USE_CUSTOM_AUTH === 'true') {
//   return customAuthMiddleware(req);
// }

// ✅ Restore Clerk middleware:
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### Step 4: Restore Clerk Providers (10 minutes)

**File:** `app/layout.tsx`

```typescript
// ❌ Remove custom AuthProvider:
// {process.env.NEXT_PUBLIC_USE_CUSTOM_AUTH === 'true' ? (
//   <AuthProvider>
//     <ConvexProvider>
//       {children}
//     </ConvexProvider>
//   </AuthProvider>
// ) : (
//   <ClerkProvider>
//     <ConvexProviderWithClerk>
//       {children}
//     </ConvexProviderWithClerk>
//   </ClerkProvider>
// )}

// ✅ Restore Clerk only:
<ClerkProvider>
  <ConvexProviderWithClerk>
    {children}
  </ConvexProviderWithClerk>
</ClerkProvider>
```

**File:** `components/convex-client-provider.tsx`

```typescript
// Ensure using ConvexProviderWithClerk:
import { ConvexProviderWithClerk } from 'convex/react-clerk';

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk useAuth={useAuth} client={convex}>
      {children}
    </ConvexProviderWithClerk>
  );
}
```

### Step 5: Test Locally (5 minutes)

```bash
# Start dev server
npm run dev

# Test Clerk sign-in
open http://localhost:3000/sign-in

# Verify:
# - Sign-in page loads
# - Clerk sign-in form appears
# - Can sign in with Clerk credentials
# - Dashboard loads after sign-in
# - Protected routes work
```

### Step 6: Deploy to Production (10 minutes)

```bash
# Commit changes
git add .
git commit -m "rollback: Revert to Clerk authentication"

# Push to main branch
git push origin main

# Monitor deployment
# Vercel: Check deployment logs
# Railway: Monitor deployment status
# Other: Check platform-specific logs
```

### Step 7: Validate Rollback (10 minutes)

```bash
# Run validation script
bun scripts/rollback-auth.ts --validate

# Expected output:
# ✅ Custom auth disabled
# ✅ Clerk credentials found
# ✅ Successfully rolled back to Clerk
```

**Manual validation:**
1. Visit production site
2. Test Clerk sign-in flow
3. Verify user dashboard loads
4. Check protected routes work
5. Monitor error logs (no auth errors)
6. Test on multiple browsers

### Step 8: Monitor and Support (1-2 hours)

**Immediate monitoring (first hour):**
- Error rate in logs
- Sign-in success rate
- User complaints/support tickets
- Performance metrics

**Support messaging:**
```
Subject: Authentication System Update

Hi [User],

We've restored our previous authentication system (Clerk).

If you recently set a password with us, you'll now need to use your original Clerk sign-in method.

Questions? Contact support@yourapp.com

Thanks,
The Team
```

## Data Preservation

**✅ What's Preserved:**
- All custom auth data (sessions, passwords, tokens)
- Email verification records
- Password reset tokens
- Rate limiting data
- Password history
- Migration records

**❌ What Becomes Inactive:**
- Custom auth sessions (invalidated)
- JWT tokens (no longer accepted)
- Custom auth cookies (cleared)

**🔄 What's Restored:**
- Clerk sessions
- Clerk user management
- Clerk authentication flow
- Original auth behavior

## Rollback Validation Checklist

After completing rollback, verify:

- [ ] Custom auth flag set to `false` in production
- [ ] Clerk env vars present and valid
- [ ] Middleware uses `clerkMiddleware`
- [ ] Layout uses `ClerkProvider`
- [ ] ConvexProvider uses `ConvexProviderWithClerk`
- [ ] Sign-in page loads with Clerk UI
- [ ] Users can sign in with Clerk credentials
- [ ] Protected routes require auth
- [ ] Dashboard loads correctly
- [ ] No auth-related errors in logs
- [ ] Performance metrics normal
- [ ] Support tickets minimal (<10)

## Troubleshooting

### Issue: Sign-in fails after rollback

**Cause:** Clerk env vars missing or incorrect
**Fix:**
```bash
# Verify Clerk vars
vercel env ls production | grep CLERK

# Update if needed
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
```

### Issue: Middleware errors

**Cause:** Custom auth logic still active
**Fix:**
1. Check middleware.ts for custom JWT validation
2. Ensure only `clerkMiddleware` is exported
3. Redeploy

### Issue: Users can't access dashboard

**Cause:** Provider configuration incorrect
**Fix:**
1. Verify ClerkProvider wraps app
2. Check ConvexProviderWithClerk used
3. Restart Next.js server

### Issue: Some users report they can't sign in

**Cause:** Users trying to use custom auth credentials
**Fix:**
1. Send email explaining rollback
2. Direct users to Clerk sign-in
3. Provide password reset link if needed

## Re-enabling Custom Auth

If you need to switch back to custom auth:

```bash
# Update environment variable
NEXT_PUBLIC_USE_CUSTOM_AUTH=true

# Redeploy
git push origin main

# All custom auth data is still intact
```

## Emergency Contacts

- **Team Lead:** [Add name and contact]
- **DevOps:** [Add name and contact]
- **Support Lead:** [Add name and contact]
- **Clerk Support:** support@clerk.dev

## Post-Rollback Review

Schedule within 24 hours:
1. Review what caused rollback
2. Document lessons learned
3. Update custom auth to fix issues
4. Plan next migration attempt
5. Communicate with stakeholders

## Appendix: Script Commands

```bash
# Check auth status
bun scripts/rollback-auth.ts --check

# Show full instructions
bun scripts/rollback-auth.ts --instructions

# Execute automated rollback
bun scripts/rollback-auth.ts --execute

# Validate rollback
bun scripts/rollback-auth.ts --validate
```

---

**Last Updated:** 2025-10-04
**Version:** 1.0
**Owner:** Engineering Team
