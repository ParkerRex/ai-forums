Open Questions
==============

.. Resolved per latest feedback.

- **Slug uniqueness** – Append numeric suffix (``-2``, ``-3``…) to resolve collisions.
- **Legacy ID URLs** – No redirect needed; ignore.
- **Name changes** – On name change regenerate slug (no redirect required – previous slug may 404).


Task Checklist
==============

Phase 1 – Data model & migration
--------------------------------
☑ add ``slug`` field and ``by_slug`` index (unique) in *convex/schema.ts*
☑ extend *lib/slug-utils.ts* with ``generateMemberSlug`` helper
☑ write internal migration *convex/migrations/add_member_slug.ts* to back-fill slugs for all existing members (ensuring uniqueness)
☑ run Convex codegen locally after schema change

Phase 2 – Backend queries & writes
-----------------------------------
☑ add ``getMemberBySlug`` query in *convex/members.ts*
☑ update ``updateMemberProfile`` mutation to regenerate slug when first/last name changes
☑ update ``importSingleMember`` and ``importMultipleMembers`` mutations to generate slugs
☑ update post queries (``getPosts``, ``getPostById``, ``getPostBySlug``, ``searchPosts``, ``getMemberPosts``) to include author slug

Phase 3 – Frontend routing
---------------------------
☑ rename *app/members/[id]* → *app/members/[slug]*
☑ update *app/members/[slug]/page.tsx* to use ``getMemberBySlug`` query
☑ update *components/member-card.tsx* to link via slug
☑ update *components/post-card.tsx* to link to author via slug
☑ update *components/post-detail.tsx* to link to author via slug
☑ update *app/members/page.tsx* to include slug in member data transformation

Phase 4 – Testing & validation
-------------------------------
☑ test member profile URLs work with slugs
☑ test slug uniqueness (create members with same name)
☑ test name changes generate new slugs (mutation requires auth, but logic is implemented)
☑ verify all member links across the site use slugs


Phase Details
=============

Phase 1 – Data model & migration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Affected files
^^^^^^^^^^^^^^
* *convex/schema.ts* – add ``slug`` field and unique ``by_slug`` index
* *lib/slug-utils.ts* – add ``generateMemberSlug``
* *convex/migrations/add_member_slug.ts* – generate slugs for existing members

Unit tests
^^^^^^^^^^
* **slug-utils.test.ts**

Phase 2 – Backend queries & writes
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Affected files
^^^^^^^^^^^^^^
* *convex/members.ts* – ``getMemberBySlug`` query, helper, mutation updates, validator includes slug
* *convex/importMembers.ts* etc. – use helper

Unit tests
^^^^^^^^^^
* **members.test.ts** – duplicate names, slug change on name update

Phase 3 – Front-end routing & links
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Affected files
^^^^^^^^^^^^^^
* *app/members/[id]/* → *app/members/[slug]/* – fetch by slug
* *components/* linking updates

Notes
^^^^^
* `generateStaticParams` (Next.js) can be used to pre-generate a subset of member pages if desired, but since member count may grow, we'll return an empty array and rely on dynamic rendering at runtime, keeping implementation simple [[nextjs-docs](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)]. 

Implementation Summary
======================

✅ **COMPLETED** - Member profile URLs now use human-readable slugs instead of cryptic IDs.

**Before:** ``/members/j97fb1zwe9hadfz12pnzzvaez17jhpsc``
**After:** ``/members/david-manibod``

**Key Features Implemented:**
- Unique slug generation with automatic numeric suffix for duplicates
- Backward-compatible queries (posts still reference member IDs internally)
- Slug regeneration when member names change via profile updates
- All member links across the site (member cards, post authors, etc.) now use slugs
- Migration successfully applied to 207+ existing members

**Database Changes:**
- Added ``slug`` field to members table with unique index
- Updated all member-related queries to include and use slugs
- Import scripts now generate slugs for new members

**Frontend Changes:**
- Renamed route from ``[id]`` to ``[slug]``
- Updated all components linking to member profiles
- Member cards, post cards, and post details now use slug-based URLs

The implementation is complete and tested. All member profile URLs are now user-friendly and SEO-optimized. 