# Production Deployment Runbook: Clerk to Custom Auth Migration

**Version:** 1.0
**Last Updated:** 2025-10-04
**Owner:** Engineering Team
**Estimated Duration:** 7 days (migration period) + 2 hours (deployment)

---

## Table of Contents
1. [Overview](#overview)
2. [Pre-Flight Checklist](#pre-flight-checklist)
3. [Deployment Steps](#deployment-steps)
4. [Migration Execution](#migration-execution)
5. [Monitoring Checklist](#monitoring-checklist)
6. [Rollback Procedure](#rollback-procedure)
7. [Incident Response](#incident-response)
8. [Post-Migration Cleanup](#post-migration-cleanup)

---

## Overview

### Migration Strategy
- **Approach:** Dual-auth system with phased cutover
- **Duration:** 7-day migration window
- **Risk Level:** Medium (extensive testing completed)
- **Rollback Time:** <1 hour

### Timeline
```
Day 0 (Today):     Deploy infrastructure, send migration emails
Day 1-2:           Monitor email delivery and early migrations
Day 3:             Send first reminder to unmigrated users
Day 5:             Send second reminder
Day 6:             Send final reminder (24-hour warning)
Day 7:             Flip feature flag to custom auth
Day 8-14:          Monitor, support stragglers, verify stability
Day 15+:           Remove Clerk code and packages
```

### Key Stakeholders
- **Engineering Lead:** [Name] - Overall coordination
- **DevOps:** [Name] - Deployment and infrastructure
- **QA Lead:** [Name] - Testing verification
- **Support Lead:** [Name] - User communication and tickets
- **Product Manager:** [Name] - Go/No-go decision authority

---

## Pre-Flight Checklist

### 1. Code Readiness
- [ ] All 51 implementation tasks completed
- [ ] All unit tests passing: `bun test`
- [ ] All integration tests passing
- [ ] All E2E tests passing: `bunx playwright test`
- [ ] TypeScript compilation successful: `npx tsc --noEmit`
- [ ] Linting passed: `npm run lint`
- [ ] No known critical bugs

### 2. Staging Verification
- [ ] Staging migration test completed (see `STAGING_MIGRATION_TEST.md`)
- [ ] Staging test report reviewed and approved
- [ ] All critical issues from staging resolved
- [ ] Email delivery rate >98% on staging
- [ ] Performance metrics within SLAs on staging

### 3. Infrastructure
- [ ] Convex production deployment healthy
- [ ] Database schema changes deployed and verified
- [ ] All Convex functions deployed and tested
- [ ] Cron jobs scheduled and verified
- [ ] CDN/Edge functions updated (if applicable)

### 4. Environment Variables
- [ ] JWT_SECRET generated for production (unique, secure)
- [ ] All SESSION_* variables configured
- [ ] RESEND_API_KEY configured (production key)
- [ ] EMAIL_FROM set to production email
- [ ] NEXT_PUBLIC_APP_URL set to production domain
- [ ] Clerk variables still present (dual-auth phase)
- [ ] NEXT_PUBLIC_USE_CUSTOM_AUTH=false (start with Clerk active)
- [ ] All secrets stored securely (1Password/Vault)

### 5. Third-Party Services
- [ ] Resend account verified and ready (production mode)
- [ ] Email sending limits verified: 100k/month or higher
- [ ] Email domain DNS configured (SPF, DKIM, DMARC)
- [ ] Email warmup completed (if new domain)
- [ ] Monitoring/alerting configured (Sentry, Datadog, etc.)
- [ ] Status page updated (if applicable)

### 6. Documentation
- [ ] This runbook reviewed by team
- [ ] Rollback plan reviewed (see `ROLLBACK_PLAN.md`)
- [ ] Support team briefed on migration process
- [ ] User-facing FAQ prepared
- [ ] Internal wiki/docs updated

### 7. Communication
- [ ] Migration announcement email drafted
- [ ] Social media posts prepared (if applicable)
- [ ] In-app banner/notification prepared
- [ ] Support team scripts prepared
- [ ] Escalation contacts confirmed

### 8. Team Availability
- [ ] Engineering on-call scheduled for Day 0-7
- [ ] Support team briefed and available
- [ ] DevOps on standby for rollback (if needed)
- [ ] Product manager available for decisions
- [ ] War room/Slack channel created for migration

---

## Deployment Steps

### Phase 1: Infrastructure Deployment (2 hours)

**Timing:** Day 0, 10:00 AM (low-traffic period recommended)

#### Step 1.1: Deploy Database Schema (15 min)
```bash
# 1. Verify Convex CLI authenticated
npx convex dev --once

# 2. Deploy schema to production
npx convex deploy --prod

# 3. Verify tables created
# In Convex dashboard, check:
# - sessions, email_verifications, password_resets, rate_limits, password_history
# - All indexes created correctly

# 4. Verify members table updated
# Check new fields: passwordHash, emailVerified, lastLoginAt, etc.
```

**Verification:**
- [ ] All 5 new tables exist
- [ ] All indexes created
- [ ] Members table has new fields
- [ ] No deployment errors in Convex logs

#### Step 1.2: Deploy Backend Functions (15 min)
```bash
# 1. Deploy all Convex functions
npx convex deploy --prod

# 2. Verify functions deployed
# In Convex dashboard, check:
# - api.auth.signUp, signIn, verifyEmail, etc.
# - api.emails.sendVerificationEmail, etc.
# - api.migration.getMigrationStatus, etc.
# - api.monitoring.getAuthMetrics, etc.

# 3. Test a function manually
# In Convex dashboard, run:
# api.auth.current() -> should return null (no session)
```

**Verification:**
- [ ] All auth functions deployed
- [ ] All email functions deployed
- [ ] All migration functions deployed
- [ ] All monitoring functions deployed
- [ ] No function errors

#### Step 1.3: Deploy Cron Jobs (5 min)
```bash
# Cron jobs deploy with main deployment
# Verify in Convex dashboard -> Crons tab

# Expected jobs:
# - Hourly: cleanupExpiredSessions
# - Daily: cleanupExpiredTokens
# - Daily: cleanupPasswordHistory
```

**Verification:**
- [ ] All 3 cron jobs scheduled
- [ ] Next run times correct
- [ ] No scheduling errors

#### Step 1.4: Deploy Frontend (30 min)
```bash
# 1. Ensure feature flag is FALSE (Clerk still active)
# Verify in .env.production or Vercel dashboard:
NEXT_PUBLIC_USE_CUSTOM_AUTH=false

# 2. Deploy to production (Vercel, Netlify, etc.)
git push origin main  # or deploy via CI/CD

# 3. Wait for build to complete

# 4. Verify deployment
# Check:
# - Build successful
# - No build errors
# - Environment variables loaded correctly
```

**Verification:**
- [ ] Frontend deployed successfully
- [ ] Build completed without errors
- [ ] Feature flag is FALSE (Clerk active)
- [ ] Both auth systems available (dual-auth)

#### Step 1.5: Smoke Tests (15 min)
```bash
# Test existing auth (Clerk) still works
1. Sign in with existing account -> Should work
2. Sign out -> Should work
3. Check user profile -> Should work

# Test custom auth is available but not active
1. Visit /auth/sign-up -> Page loads (but not used yet)
2. Visit /admin/migration -> Dashboard loads
3. Check feature flag in browser console:
   console.log(process.env.NEXT_PUBLIC_USE_CUSTOM_AUTH) -> "false"

# Test monitoring
1. Visit Convex dashboard -> Monitoring
2. Check metrics are being tracked
3. Verify no errors in logs
```

**Verification:**
- [ ] Clerk auth working (existing users can sign in)
- [ ] Custom auth pages load (but not active)
- [ ] Migration dashboard accessible
- [ ] Monitoring tracking correctly
- [ ] No errors in logs

#### Step 1.6: Configure Production Secrets (10 min)
```bash
# Set environment variables in production
# (Vercel, Netlify, or hosting platform)

# Required variables:
JWT_SECRET=<from-secure-storage>
RESEND_API_KEY=<production-key>
EMAIL_FROM=noreply@yourapp.com
NEXT_PUBLIC_APP_URL=https://yourapp.com

# Verify secrets set correctly
# In hosting dashboard, check all secrets present and not empty
```

**Verification:**
- [ ] All secrets configured
- [ ] No secrets logged or exposed
- [ ] JWT_SECRET is unique (not from staging)
- [ ] RESEND_API_KEY is production key

### Phase 2: Migration Email Blast (1 hour)

**Timing:** Day 0, 12:00 PM (after infrastructure verified stable)

#### Step 2.1: Generate Migration Plan
```bash
# 1. Run planning script
bun scripts/plan-migration.ts

# 2. Review output
cat migration-data/migration-plan-*.csv
cat migration-data/migration-summary.json

# 3. Verify counts match expected
# Check:
# - Total users matches Clerk dashboard count
# - All users have externalId
# - Batch count reasonable (1000/batch)
# - Estimated time realistic
```

**Verification:**
- [ ] Migration plan generated
- [ ] User count matches expectations
- [ ] CSV contains all Clerk users
- [ ] No errors in planning script

#### Step 2.2: Execute Migration (Dry Run First!)
```bash
# 1. DRY RUN: Test migration without sending emails
bun scripts/execute-migration.ts --dry-run

# Output should show:
# - DRY RUN MODE: No emails will be sent
# - Processing batches...
# - Would send X emails total
# - Estimated time: Y hours

# 2. Review dry run results
# - No errors encountered
# - All users processable
# - Rate limiting calculated correctly

# 3. REAL RUN: Execute migration
bun scripts/execute-migration.ts

# Confirm when prompted:
# "This will send migration emails to X users. Continue? (yes/no)"
# Type: yes

# Monitor output:
# - [Batch 1/N] Sending emails to 1000 users...
# - [1/1000] Processing user@example.com... ✓
# - Rate limit: Waiting 3.6s before next email
# - Checkpoint saved: checkpoint-batch-1.json
```

**Verification:**
- [ ] Dry run completed successfully
- [ ] Real run executing without errors
- [ ] Emails sending (check Resend dashboard)
- [ ] Rate limiting respected (no rate limit errors)
- [ ] Checkpoints saved (for resume capability)

#### Step 2.3: Monitor Email Delivery (30 min)
```bash
# 1. Check Resend dashboard
# Metrics to monitor:
# - Sent: Should match migration user count
# - Delivered: Should be >98%
# - Bounced: Should be <1%
# - Complained: Should be 0%

# 2. Check sample emails
# - Verify email template renders correctly
# - Check migration link format: https://yourapp.com/auth/set-password?token=...
# - Confirm token is valid (click link to test)

# 3. Monitor Convex logs
# Filter for "migration" and "email"
# Look for:
# - [Migration] Token created for user@example.com
# - [Email] Sent verification email to user@example.com
# - No errors or exceptions
```

**Verification:**
- [ ] All emails sent (100%)
- [ ] Delivery rate >98%
- [ ] Bounce rate <2%
- [ ] Email template correct
- [ ] Migration links valid
- [ ] No errors in logs

---

## Migration Execution (Days 1-7)

### Day 1-2: Early Monitoring

**Tasks:**
- [ ] Monitor migration dashboard: `/admin/migration`
- [ ] Check migration rate: expect 10-20% in first 48 hours
- [ ] Monitor auth metrics: sign-in success rate, email delivery
- [ ] Track support tickets: respond to migration questions
- [ ] Verify first migrations successful (sample 10 users)

**Metrics to Watch:**
- Migration completion rate: 10-20% by Day 2
- Email delivery rate: >98%
- Sign-in success rate: >95% (existing users + new migrations)
- Support tickets: <50
- No critical errors

**Alert Thresholds:**
- Email delivery <95%: Investigate Resend/DNS issues
- Migration rate <5%: Consider email deliverability or UX issues
- Support tickets >100: Prepare additional support capacity

### Day 3: First Reminder

**Tasks:**
- [ ] Query unmigrated users
- [ ] Send reminder email: "Reminder: Set Your Password (4 days left)"
- [ ] Monitor response rate
- [ ] Update migration dashboard

**Script:**
```bash
# Send reminder to unmigrated users
bun scripts/send-reminder.ts --template=reminder-1

# Or manually trigger via Convex action
# api.emails.sendMigrationReminder({ daysRemaining: 4 })
```

**Expected Outcome:**
- Reminder emails sent to 70-80% of users
- Migration rate increase: +10-15% in 24 hours
- Support tickets: slight increase

### Day 5: Second Reminder

**Tasks:**
- [ ] Query unmigrated users
- [ ] Send reminder email: "Important: Set Your Password (2 days left)"
- [ ] Escalate tone slightly (still friendly)
- [ ] Monitor response rate

**Script:**
```bash
bun scripts/send-reminder.ts --template=reminder-2
```

**Expected Outcome:**
- Reminder emails sent to 40-60% of users
- Migration rate: 60-70% total
- Support tickets: moderate increase

### Day 6: Final Reminder

**Tasks:**
- [ ] Query unmigrated users
- [ ] Send final reminder: "Final Reminder: Set Your Password (24 hours left)"
- [ ] Emphasize urgency but remain helpful
- [ ] Prepare support for influx

**Script:**
```bash
bun scripts/send-reminder.ts --template=final-reminder
```

**Expected Outcome:**
- Reminder emails sent to 20-40% of users
- Migration rate: 70-80% total
- Support tickets: significant increase

### Day 7: Feature Flag Flip

**Timing:** 10:00 AM (low-traffic period)

**Pre-Flip Checklist:**
- [ ] Migration rate >70% (ideally >80%)
- [ ] No critical bugs in custom auth
- [ ] Support team ready
- [ ] Rollback plan reviewed
- [ ] Engineering team on standby

**Flip Procedure:**
```bash
# 1. Update feature flag in production
# In Vercel/Netlify/hosting dashboard:
NEXT_PUBLIC_USE_CUSTOM_AUTH=true

# 2. Redeploy frontend (if needed for env var)
# Some platforms auto-redeploy on env var change

# 3. Verify flag change
# Visit app, check browser console:
console.log(process.env.NEXT_PUBLIC_USE_CUSTOM_AUTH) -> "true"

# 4. Test sign-in flow
# - Sign in with migrated user -> Should work (custom auth)
# - Sign in with unmigrated user -> Should force password reset
# - Sign up new user -> Should use custom auth

# 5. Monitor closely for 2 hours
# Watch for:
# - Sign-in success rate: should stay >90%
# - Error rate: should not spike
# - Support tickets: expect increase
```

**Verification:**
- [ ] Feature flag is TRUE
- [ ] Custom auth active
- [ ] Clerk auth disabled
- [ ] Migrated users can sign in
- [ ] Unmigrated users forced to reset password
- [ ] New sign-ups use custom auth
- [ ] No spike in errors

**Rollback Trigger:**
- Sign-in success rate <80%
- Critical errors affecting >10% of users
- Email delivery failure
- Database issues

---

## Monitoring Checklist

### Real-Time Monitoring (During Migration)

**Dashboard:** `/admin/migration`
- [ ] Check every 2 hours during business hours
- [ ] Check once daily during off-hours
- [ ] Escalate if migration rate <50% by Day 5

**Metrics Dashboard:** Convex Dashboard or `/admin/monitoring`
- [ ] Sign-in success rate: >95%
- [ ] Sign-up success rate: 100%
- [ ] Email delivery rate: >98%
- [ ] p95 sign-in latency: <500ms
- [ ] Rate limit triggers: normal activity
- [ ] Account lockouts: <10/day

**Logs:**
- [ ] Filter for "ERROR" level: should be minimal
- [ ] Filter for "migration": track progress
- [ ] Filter for "auth": verify auth events
- [ ] Check for spikes or anomalies

**Support Tickets:**
- [ ] Track migration-related tickets
- [ ] Common issues: expired token, email not received, password requirements
- [ ] Resolution time: <24 hours
- [ ] Escalate if tickets >200

### Automated Alerts

**Configure alerts for:**
- Email delivery rate <95%
- Sign-in success rate <90%
- Migration rate <50% by Day 5
- Error rate >5%
- p95 latency >1000ms
- Database errors
- Cron job failures

**Alert Channels:**
- PagerDuty/OpsGenie (critical)
- Slack #engineering-alerts
- Email to on-call team

---

## Rollback Procedure

**Trigger Conditions:**
- Critical bug affecting >10% of users
- Sign-in success rate <80%
- Email delivery failure
- Database corruption
- Performance degradation
- Security incident

**Rollback Steps (Target: <1 hour)**

See detailed procedure in `docs/ROLLBACK_PLAN.md`

**Quick Summary:**
1. Set NEXT_PUBLIC_USE_CUSTOM_AUTH=false
2. Redeploy frontend
3. Verify Clerk auth working
4. Communicate to team and users
5. Post-mortem after rollback

**Important:**
- DO NOT delete custom auth data (keep for retry)
- DO NOT remove Clerk credentials
- DO communicate clearly to users

---

## Incident Response

### Severity Levels

**P0 - Critical (Response: Immediate)**
- Complete service outage
- Data loss or corruption
- Security breach
- Sign-in broken for >50% of users

**P1 - High (Response: <30 min)**
- Partial service degradation
- Email delivery failure
- Sign-in issues for 10-50% of users
- Migration script failure

**P2 - Medium (Response: <2 hours)**
- Single feature broken
- Performance degradation
- Migration rate lower than expected
- Support ticket backlog

**P3 - Low (Response: <24 hours)**
- Minor bugs
- UI issues
- Documentation gaps

### Incident Response Process

1. **Detect:**
   - Monitor alerts
   - Support tickets
   - User reports

2. **Assess:**
   - Severity level (P0-P3)
   - Impact (% users affected)
   - Root cause (if obvious)

3. **Communicate:**
   - Alert on-call team
   - Create Slack thread in #incidents
   - Update status page (if P0/P1)

4. **Respond:**
   - P0: Immediate rollback if needed
   - P1: Deploy hotfix or rollback
   - P2: Schedule fix within 2 hours
   - P3: Add to backlog

5. **Resolve:**
   - Fix deployed
   - Verify resolution
   - Monitor for recurrence

6. **Post-Mortem:**
   - Document root cause
   - Action items to prevent recurrence
   - Update runbook if needed

### Escalation Path

1. **First Responder:** On-call engineer
2. **Escalate to:** Engineering lead (if not resolved in 30 min)
3. **Escalate to:** CTO/VP Engineering (if P0 lasting >1 hour)
4. **Notify:** Product manager, Support lead (for user communication)

---

## Post-Migration Cleanup (Days 8-14)

### Day 8-10: Verify Stability

**Tasks:**
- [ ] Monitor metrics: ensure stable
- [ ] Review support tickets: address remaining issues
- [ ] Check migration rate: expect >80%
- [ ] Verify all systems healthy

**Metrics:**
- Sign-in success rate: >95%
- Migration rate: >80%
- Support tickets: declining
- No critical bugs

### Day 11-14: Prepare for Clerk Removal

**Tasks:**
- [ ] Verify migration rate >80%
- [ ] Plan Clerk removal timeline
- [ ] Review TASK-057 to TASK-064 (Clerk removal tasks)
- [ ] Schedule code cleanup

---

## Appendix

### Emergency Contacts

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| Engineering Lead | [Name] | [Phone] | [Email] | @handle |
| DevOps Lead | [Name] | [Phone] | [Email] | @handle |
| Product Manager | [Name] | [Phone] | [Email] | @handle |
| Support Lead | [Name] | [Phone] | [Email] | @handle |
| On-Call Engineer | [Name] | [Phone] | [Email] | @handle |

### Useful Commands

**Check migration status:**
```bash
bun scripts/plan-migration.ts
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

**Check email delivery (Resend):**
```bash
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json"
```

**Force password reset for user:**
```javascript
// In Convex dashboard
api.auth.requestPasswordReset({ email: "user@example.com" })
```

### Sign-Off

**Pre-Deployment:**
- [ ] Engineering Lead: [Signature] [Date]
- [ ] DevOps Lead: [Signature] [Date]
- [ ] Product Manager: [Signature] [Date]

**Post-Deployment:**
- [ ] Deployment successful: [Signature] [Date]
- [ ] Migration emails sent: [Signature] [Date]

**Day 7 Feature Flag Flip:**
- [ ] Go/No-Go decision: [Signature] [Date]
- [ ] Feature flag flipped: [Signature] [Date]

**Post-Migration:**
- [ ] Migration complete (>80%): [Signature] [Date]
- [ ] System stable: [Signature] [Date]
- [ ] Ready for Clerk removal: [Signature] [Date]

---

**Document Version:** 1.0
**Last Updated:** 2025-10-04
**Next Review:** Before production deployment
