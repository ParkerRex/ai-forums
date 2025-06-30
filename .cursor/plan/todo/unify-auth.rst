# Unify Auth Integration Plan  
*Convex + Clerk*

☑ **Phase 0 – Exploration & decisions (DONE)**
• Confirmed Convex ⇄ Clerk identity mapping strategy  
• Chosen canonical foreign-key name ``memberId``  
• Enumerated affected tables, functions, and components

────────────────────────────────────────────────────────────────────

**Task Checklist**

*Phase 1 – Schema + Helper*
☑ add ``externalId`` field + index in ``convex/schema.ts``
☑ create ``convex/auth.ts`` with ``getAuthenticatedMember`` helper
☑ write unit tests in ``convex/test/auth.test.ts``

*Phase 2 – Wire-up*
☐ create ``auth.ensureMember`` internal mutation (``convex/auth.ts``)
☐ replace redundant auth code in server modules (posts, comments, etc.)
☐ (opt) add ``useCurrentMember`` hook

*Phase 3 – Schema Evolution*
☐ add ``memberId`` to ``posts`` + ``comments`` with indexes
☐ migration script ``convex/migrations/add_member_id_fields.ts``

*Phase 4 – Backend Refactor*
☐ update Convex modules to use ``memberId`` + helper
☐ update/extend unit tests

*Phase 5 – Frontend Rename*
☐ rename ``author``→``member`` props and logic
☐ fix TS errors

*Phase 6 – Cleanup*
☐ remove ``authorId`` + old indexes via migration
☐ final test suite run

====================================================================

Phase 1 – Schema + Auth Helper
------------------------------

Affected files
• ``convex/schema.ts`` – add ``externalId: v.string()`` + ``by_externalId`` index
• ``convex/auth.ts`` – new helper and internal mutation
• ``convex/test/auth.test.ts`` – new tests

Summary of changes
• update member table schema; externalId is required for new rows (nullable legacy)
• implement *getAuthenticatedMember(ctx)*:
  – fetch ``identity``; error if none
  – lookup by ``externalId``; else by ``email`` (patch externalId)
  – if not found, insert new member (status "free", slug, timestamps)
  – always patch ``lastOnline`` + ``updatedAt``
• unit tests (Vitest):
  1. creates member for new user
  2. returns existing member + updates ``lastOnline``
  3. patches legacy row (email lookup → externalId)

Phase 2 – Wire-up
-----------------

Affected files
• ``convex/auth.ts`` – expose ``auth.ensureMember`` internal mutation
• ``convex/*`` – all server modules using auth
• (opt) ``hooks/use-current-member.ts`` – new React hook

Summary of changes
• mutation invokes helper; client can call on mount
• replace inline member lookup in mutations/queries with helper result
• ensure each mutation checks authorization via helper (drop duplicate code)
• (opt) hook calls ``api.auth.current`` query to expose member to React side
• unit tests: verify ensureMember returns Id and idempotency

Phase 3 – Schema Evolution
-------------------------

Affected files
• ``convex/schema.ts`` – ``memberId`` fields + ``by_memberId`` indexes
• ``convex/migrations/add_member_id_fields.ts`` – new script

Summary of changes
• extend posts/comments tables
• migration: set ``memberId = authorId`` for existing rows
• unit tests: migration inserts correct field values (integration via Convex test harness)

Phase 4 – Backend Refactor
-------------------------

Affected files
• ``convex/posts.ts``
• ``convex/comments.ts``
• ``convex/postVersions.ts``
• ``convex/votes.ts``
• other modules referencing authors

Summary of changes
• swap ``authorId`` → ``memberId``; update queries and indexes
• import helper and use returned member._id
• adjust validators and indexes
• extend unit tests for each module path changed

Phase 5 – Frontend Rename
------------------------

Affected files
• ``components/`` (post-detail, post-card, comment-section, etc.)

Summary of changes
• rename props/interfaces + adjust usage
• update permission checks to compare current memberId
• run TypeScript build to catch stragglers; update snapshot tests if any

Phase 6 – Cleanup
-----------------

Affected files
• ``convex/schema.ts`` – remove ``authorId`` + legacy indexes
• ``convex/migrations/remove_author_id_fields.ts``

Summary of changes
• migration drops columns and indexes
• update search definitions accordingly
• run full unit + Playwright suite; ensure zero regressions

────────────────────────────────────────────────────────────────────

**Optional – Clerk Webhook Sync**
Implement `/clerk-users-webhook` (per Convex docs) to eagerly upsert/delete members via `internal.users.upsertFromClerk` / `deleteFromClerk`.  
Provides immediate consistency but *not required* for MVP because the helper gives lazy sync.

**Key Decisions**
• Use stable **`identity.subject` → externalId`** mapping (email may change)  
• Helper-based lazy creation keeps implementation simple; webhook can be added later without breaking API  
• Maintain backward compatibility during the transition; remove legacy fields last

**Testing & Validation Checklist**
✓ New signup → member auto-created → can create post/comment immediately  
✓ Existing user → member found & `lastOnline` updated  
✓ Legacy rows patched with `externalId` on first login  
✓ All unit + Playwright tests pass  
✓ No "Member not found" errors in production

**Critical Success Factors**
• Zero-downtime migration  
• Data integrity & idempotent helper  
• Type safety (TypeScript + `convex/values` validators)  
• Comprehensive test coverage 