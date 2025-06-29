Bug: Member Activity Stats Missing (Only Parker Rex shows counts)
===============================================================

Observed
--------
• Members directory shows **0 Posts / 0 Comments / 0 Votes** for every member except Parker Rex.
• Dev database contains posts/comments only under one member ID per email (Parker's), all other authors either have duplicated member docs or their stats were never cached.
• `members:getAllMembers` and `searchMembers` return the **cached** fields ``postCount``, ``commentCount``, ``netVoteCount``.  Most member docs have these as **null/0**.

Root-cause
~~~~~~~~~~
1. Stats are cached via internal mutations in ``convex/stats.ts`` but **never scheduled**; they were only run manually for Parker.
2. Comment import logic frequently created **duplicate member documents** (same email, different Convex ID).  Stats for one doc don't reflect activity written under another doc's ID.
3. Members directory blindly trusts cached fields and never compensates for missing data.

Fix strategy at a glance
------------------------
* Establish a **single canonical member document per email** and migrate activity + stats into it.
* Provide a public query that always returns **correct, up-to-date stats** (computes when missing; otherwise uses cached).
* Schedule nightly cron to refresh the cached counts.
* Point UI at the new query – no extra round-trips per card.


Task checklist
==============

Phase 1 – Canonical-member migration
-----------------------------------
☐ **migration/merge_duplicate_members.ts** – internal mutation to:
   • scan `members` table, group by `email`, pick the doc with highest activity (posts+comments)
   • for each duplicate: re-wire foreign keys (`posts.authorId`, `comments.authorId`, `votes.authorId`) to the keeper ID
   • patch duplicates with `status:"duplicate"` & `mergedInto:<keeperId>`
☐ Add unit test **convex/test/merge_duplicate_members.test.ts** using in-memory Convex mocks.

Phase 2 – Reliable stats query
------------------------------
☐ **convex/members.ts** – new public query ``getMembersWithStats``:
   • identical signature to ``getAllMembers`` but
   • for each member: if any stat field is ``undefined`` → call internal ``stats:recalcSingleMemberStats`` then return transformed result.
☐ Update existing ``getAllMembers`` & ``searchMembers`` to **delegate** to the new query (thin wrappers).
☐ Unit tests **convex/test/get_members_with_stats.test.ts**.

Phase 3 – Background maintenance
--------------------------------
☐ **convex/crons.ts** – register daily cron that runs ``stats:recalcMemberStats``.
☐ **convex/crons.ts** – register weekly cron that runs ``migration/merge_duplicate_members`` (dry-run false).

Phase 4 – Front-end swap & clean-up
-----------------------------------
☐ **app/members/page.tsx** – replace API call to ``getAllMembers`` with ``getMembersWithStats``.
☐ **components/member-card.tsx** – remove inline placeholder counts (already done earlier).
☐ Playwright test **playwright/member-stats.spec.ts**: open directory, assert >1 card shows non-zero posts or comments.

Open questions
--------------
* How often should duplicate-member merge run? (daily vs weekly)
* Do we soft-delete duplicates or leave them with `status:"duplicate"`? 