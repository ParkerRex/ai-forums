# Staging Migration Test Plan

## Overview
This document outlines the procedure for testing the Clerk to Custom Auth migration on a staging environment before production deployment.

## Prerequisites

### Environment Setup
- [ ] Staging environment deployed with latest code
- [ ] Convex staging deployment active
- [ ] All environment variables configured (see below)
- [ ] Email delivery configured (Resend API key set)

### Required Environment Variables
```bash
# Custom Auth
JWT_SECRET=<generate-new-for-staging>
NEXT_PUBLIC_USE_CUSTOM_AUTH=false  # Start with Clerk active

# Email
RESEND_API_KEY=<staging-or-test-api-key>
EMAIL_FROM=noreply@staging.yourapp.com

# Clerk (keep active during dual-auth phase)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<staging-clerk-key>
CLERK_SECRET_KEY=<staging-clerk-secret>

# App
NEXT_PUBLIC_APP_URL=https://staging.yourapp.com
```

## Phase 1: Create Test Users (30 minutes)

### Create 100 Test Clerk Users

**Option A: Manual Creation via UI**
1. Navigate to staging app
2. Use Clerk sign-up flow
3. Create users with pattern: `test-user-001@example.com` through `test-user-100@example.com`
4. Use password: `TestPassword123!`
5. Verify all users in Clerk dashboard

**Option B: Automated Script**
```typescript
// scripts/create-test-users.ts
// Create 100 Clerk users via Clerk API
// Use clerk-sdk-node for bulk user creation
```

### Verify Test Users
```bash
# Query Convex to verify users exist
# In Convex dashboard, run:
db.query("members").filter(q => q.eq(q.field("externalId"), q.neq(null))).collect()

# Should return 100 users
```

## Phase 2: Dry Run Migration (15 minutes)

### Run Migration Script in Dry-Run Mode
```bash
# Generate migration plan
bun scripts/plan-migration.ts

# Review output
cat migration-data/migration-plan-*.csv
cat migration-data/migration-summary.json

# Expected output:
# - Total users: 100
# - Batches: 1 (100 users < 1000 batch size)
# - Estimated time: ~6 minutes
```

### Verify Dry Run Output
- [ ] CSV contains all 100 test users
- [ ] All users have externalId (Clerk ID)
- [ ] Summary JSON shows correct counts
- [ ] No errors in console output

## Phase 3: Execute Migration (30 minutes)

### Send Migration Emails
```bash
# Execute migration (this will send real emails!)
bun scripts/execute-migration.ts --dry-run=false --batch-size=100

# Monitor output:
# - Progress: [1/100] Processing test-user-001@example.com...
# - Rate limit: Wait 3.6s before next email
# - Checkpoint saved every 100 users
```

### Monitor Execution
- [ ] Script runs without errors
- [ ] Progress logged to `migration-data/execution-*.log`
- [ ] Checkpoint file created: `migration-data/checkpoint-*.json`
- [ ] No rate limit errors (should respect 1000/hour limit)

### Verify Email Delivery
1. Check Resend dashboard:
   - [ ] 100 emails sent
   - [ ] Delivery rate: 98%+ (allow for test email bounces)
   - [ ] No spam complaints
   - [ ] Average send time: <5s per email

2. Check test inboxes (if using real test emails):
   - [ ] Email received with correct subject: "Action Required: Set Your Password"
   - [ ] Migration link valid and includes token
   - [ ] Email template renders correctly
   - [ ] Token link format: `https://staging.yourapp.com/auth/set-password?token=...`

## Phase 4: Test Migration Flow (45 minutes)

### Test Happy Path (10 users)
For users `test-user-001@example.com` through `test-user-010@example.com`:

1. **Receive migration email**
   - [ ] Email delivered within 5 minutes
   - [ ] Subject line correct
   - [ ] CTA button visible and clickable

2. **Click migration link**
   - [ ] Redirects to `/auth/set-password?token=...`
   - [ ] Page loads successfully
   - [ ] Token is valid (no expiry error)
   - [ ] User email displayed on page

3. **Set password**
   - [ ] PasswordStrengthMeter works
   - [ ] Weak password rejected: `test123`
   - [ ] Strong password accepted: `StrongPass123!@#`
   - [ ] Confirm password validation works
   - [ ] Success message shown

4. **Verify email**
   - [ ] Redirected to `/auth/verify-email-sent`
   - [ ] Verification email sent
   - [ ] Click verification link
   - [ ] Email verified successfully
   - [ ] Auto-signed in with session cookie

5. **Access app**
   - [ ] Redirected to home/dashboard
   - [ ] User authenticated
   - [ ] vai_session cookie set (HTTP-only, Secure)
   - [ ] No Clerk cookie present (using custom auth)

### Test Error Cases (5 users)

**Test 1: Expired Token (test-user-011)**
1. Wait 1 hour or manually expire token in DB
2. Click migration link
3. [ ] Error shown: "This link has expired"
4. [ ] Resend option available or contact support message

**Test 2: Weak Password (test-user-012)**
1. Click migration link
2. Enter weak password: `abc123`
3. [ ] Error shown with password requirements
4. [ ] PasswordStrengthMeter shows red/weak
5. [ ] Cannot submit form

**Test 3: Token Reuse (test-user-013)**
1. Complete migration successfully
2. Try to use same token again
3. [ ] Error shown: "This link has already been used"
4. [ ] Redirected to sign-in page

**Test 4: Invalid Token (test-user-014)**
1. Modify token in URL: `?token=invalid-token-xyz`
2. [ ] Error shown: "Invalid link"
3. [ ] Cannot proceed with migration

**Test 5: Rate Limit Email Resend (test-user-015)**
1. Click "Resend verification email" 4 times rapidly
2. [ ] Rate limit error shown after 3rd attempt
3. [ ] Clear error message with time remaining

### Test Migration Dashboard (10 minutes)

Navigate to `/admin/migration`:

1. **Overview Cards**
   - [ ] Total users: 100
   - [ ] Migrated: ~10-15 (from testing)
   - [ ] Pending: ~85-90
   - [ ] Progress percentage: ~10-15%

2. **Progress Bar**
   - [ ] Visual progress bar matches percentage
   - [ ] Shows migrated vs remaining count

3. **Statistics Breakdown**
   - [ ] By verification: verified/unverified split
   - [ ] By activity: last 7/30 days, inactive counts
   - [ ] By token status: sent/not sent/expired counts

4. **Pending Users Table**
   - [ ] Lists unmigrated users
   - [ ] Shows email, name, last login, token status
   - [ ] Token status badge: "Sent" or "Not Sent"

5. **Alerts**
   - [ ] Low migration rate alert shown (if <50%)
   - [ ] Expired tokens alert shown (if >10 expired)

6. **Auto-refresh**
   - [ ] Dashboard updates every 10 seconds (check timestamp)

## Phase 5: Monitor Metrics (15 minutes)

### Check Monitoring Dashboard

Navigate to Convex dashboard or `/admin/monitoring`:

1. **Auth Metrics**
   - [ ] Sign-up success rate: 100% (for new users)
   - [ ] Sign-in success rate: >95%
   - [ ] Email delivery rate: >98%
   - [ ] Password reset success rate: tracked

2. **Performance Metrics**
   - [ ] p95 sign-in latency: <500ms
   - [ ] p95 sign-up latency: <1000ms
   - [ ] JWT verification: <50ms

3. **Security Metrics**
   - [ ] Rate limit triggers: some (from testing)
   - [ ] Account lockouts: 0 (unless tested)
   - [ ] Failed login attempts: tracked

4. **Migration Metrics**
   - [ ] Migration completion rate: ~10-15%
   - [ ] Token expiry rate: 0% (all fresh tokens)
   - [ ] Email bounce rate: <2%

### Check Logs

In Convex dashboard logs:
```
Filter: "migration" OR "auth"

Expected entries:
- [Migration Event] Member abc123: token_created
- [Migration Event] Member abc123: password_set
- [Migration Event] Member abc123: email_verified
- [Auth] Sign-in successful: test-user-001@example.com
- [Email] Verification email sent: test-user-001@example.com
```

## Phase 6: Cleanup and Report (15 minutes)

### Verify Database State

In Convex dashboard:

1. **Members table**
   - [ ] 100 test users exist
   - [ ] ~10-15 have `passwordHash` set
   - [ ] ~10-15 have `emailVerified: true`
   - [ ] All have `externalId` (Clerk ID)

2. **Password_resets table**
   - [ ] 100 migration tokens created
   - [ ] ~10-15 marked as `usedAt: <timestamp>`
   - [ ] ~85-90 still unused and valid

3. **Sessions table**
   - [ ] ~10-15 active sessions for migrated users
   - [ ] All sessions have valid `expiresAt` (7 days from creation)

4. **Email_verifications table**
   - [ ] ~10-15 verification records
   - [ ] Some marked as `verifiedAt: <timestamp>`

### Generate Report

Create `docs/STAGING_TEST_REPORT.md`:

```markdown
# Staging Migration Test Report

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:** Staging
**Duration:** ~2 hours

## Summary

- Total test users: 100
- Migration emails sent: 100
- Successful migrations: 10
- Migration completion rate: 10%
- Email delivery rate: 98%
- Issues found: [0-5]

## Test Results

### Happy Path: PASS ✅
- 10/10 users completed migration successfully
- Email delivery: 100%
- Password set: 100%
- Email verification: 100%
- Sign-in after migration: 100%

### Error Cases: PASS ✅
- Expired token: Handled correctly
- Weak password: Rejected with clear message
- Token reuse: Prevented successfully
- Invalid token: Error shown appropriately
- Rate limiting: Working as expected

### Migration Dashboard: PASS ✅
- All metrics accurate
- Real-time updates working
- Alerts triggering correctly

### Monitoring: PASS ✅
- All metrics tracked correctly
- Performance within SLAs
- No security incidents

## Issues Found

1. [Issue 1]: [Description] - **Priority**: [High/Medium/Low]
   - **Status**: [Open/Fixed]
   - **Fix**: [Description of fix]

2. [Issue 2]: [Description] - **Priority**: [High/Medium/Low]
   - **Status**: [Open/Fixed]
   - **Fix**: [Description of fix]

## Recommendations

- [ ] Ready for production migration
- [ ] Need to fix [X] issues first
- [ ] Recommend batch size: 1000
- [ ] Recommend migration schedule: [Specify dates]

## Next Steps

1. Fix any critical issues found
2. Re-test if necessary
3. Create production deployment runbook
4. Schedule production migration
5. Prepare support team for user questions
```

## Success Criteria

- [ ] All 100 test users received migration emails
- [ ] Email delivery rate >98%
- [ ] Happy path test: 10/10 users migrated successfully
- [ ] Error cases: All 5 scenarios handled correctly
- [ ] Migration dashboard: All metrics accurate
- [ ] Monitoring: All metrics within SLAs
- [ ] No critical bugs found
- [ ] Performance: p95 latency <500ms for sign-in

## Rollback Plan

If critical issues found:

1. **Stop migration script** (Ctrl+C or kill process)
2. **Keep NEXT_PUBLIC_USE_CUSTOM_AUTH=false** (Clerk still active)
3. **Document issues** in test report
4. **Fix bugs** in development
5. **Re-deploy to staging** with fixes
6. **Re-run test plan** from Phase 1

## Notes

- Test users can be deleted after testing: `db.query("members").filter(q => q.startsWith(q.field("email"), "test-user-")).delete()`
- Keep test data for 7 days in case of follow-up testing
- Migration tokens expire after 7 days (no manual cleanup needed)

## Appendix

### Useful Commands

**Check migration status:**
```bash
bun scripts/plan-migration.ts
```

**Monitor email delivery:**
```bash
# Check Resend dashboard
open https://resend.com/emails
```

**Query migrated users:**
```javascript
// In Convex dashboard
db.query("members")
  .filter(q => q.and(
    q.neq(q.field("externalId"), null),
    q.neq(q.field("passwordHash"), null)
  ))
  .collect()
```

**Reset test user password (for re-testing):**
```javascript
// In Convex dashboard
db.patch("<member-id>", { passwordHash: undefined, emailVerified: false })
```
