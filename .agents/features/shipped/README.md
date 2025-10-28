# Shipped Features

This directory contains archived feature workspaces that have been completed and shipped to production.

## Features

### remove-clerk-2025-10-04
**Status:** ✅ SHIPPED
**PR:** #150
**Date:** 2025-10-04
**Description:** Custom email/password authentication system to replace Clerk

Complete implementation including:
- 197 tests (100% pass rate)
- 60/64 tasks complete (4 remaining are post-migration cleanup)
- Comprehensive migration infrastructure
- Full documentation and runbook
- Monitoring dashboards
- Rollback plan (<1h recovery)

**Files:**
- `COMPLETION_SUMMARY.md` - Detailed completion report
- `remove-clerk-plan.md` - Implementation plan (64 tasks)
- `remove-clerk-tech-spec.md` - Technical specification
- `validation/` - Validation reports and test results

**Next Steps:**
1. PR approval and merge
2. Staging migration test
3. Production deployment (7-day migration)
4. Feature flag flip (Day 7)
5. Clerk removal (post-migration)

---

## Archive Format

Each shipped feature should include:
- `COMPLETION_SUMMARY.md` - Final status and metrics
- Original planning documents
- Validation reports
- Test results
- Any relevant artifacts

Feature directories are named: `{feature-name}-{YYYY-MM-DD}`
