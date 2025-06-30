☑ **Task Checklist**

*Phase 0 – Tooling setup*
  ☑ add **Vitest** dev dependencies & config
  ☑ add `"test": "vitest run"` script

*Phase 1 – Backend support*
  ☑ extend schema, add ``post_versions`` table
  ☑ implement ``editPost`` & ``deletePost`` mutations
  ☑ implement ``getPostHistory`` query
  ☑ Vitest unit tests for mutations/history

*Phase 2 – UI integration & forms*
  ☑ extract ``post-form-fields.tsx``
  ☑ add ellipsis menu (Edit/Delete/History)
  ☑ implement edit modal and delete confirm
  ☑ implement history modal skeleton
  ☐ Playwright E2E for edit/delete flow

*Phase 3 – Display edited/deleted state*
  ☐ render "edited" badge & relative time
  ☐ hide soft-deleted posts from lists
  ☐ Vitest React component test for header badge (Testing Library)

*Phase 4 – Edit history viewer*
  ☑ diff view for a selected version
  ☑ tabbed layout "Rendered / Diff"
  ☐ Playwright E2E for history modal navigation

*Phase 5 – Legacy cleanup*
  ☐ Remove ``authorId`` optional fields from ``posts`` and ``comments`` tables via migration
  ☐ Delete legacy ``author`` properties in API responses and UI components
  ☐ Remove ``checkAuthorId.ts`` utility and related query/function
  ☐ Update schema, unit tests, and regenerate Convex types
  ☐ Playwright smoke test to ensure no regressions

====================================================================

☑ **Phase 0 – Tooling setup**

☑ **Phase 1 – Backend support**

☐ **Phase 2 – UI integration & forms**

☐ **Phase 3 – Display edited/deleted state**

☐ **Phase 4 – Edit history viewer**

☐ **Phase 5 – Legacy cleanup**

Affected files
``convex/posts.ts``  – new mutations ``editPost`` & ``deletePost`` (update to log history)
``convex/schema.ts`` – add **new table** ``post_versions``: ``{ id, postId, version, title, content, editorId, editedAt }``
``convex/postVersions.ts`` – **new module** with helper queries
``convex/_generated/api.d.ts`` – auto-generated
``convex/test/posts.test.ts`` – Vitest unit tests

Changes
* Schema: ``post_versions`` where ``version`` is auto-increment per ``postId`` using query to count existing.
* **editPost** mutation
  – Before updating, insert entry into ``post_versions`` with current state.
  – Then update post row & ``editedAt``.
* **deletePost** mutation
  – Set ``status = 'deleted'`` (soft delete uses existing status field).
* New query **getPostHistory({ postId })** returning versions desc.
* Unit tests – Vitest: verify history entry count increments, fields preserved.
  • `editPost_logsPreviousVersion` – calling mutation creates new version snapshot and updates post.
  • `deletePost_setsDeletedStatus` – mutation changes status to 'deleted' and timestamp unchanged.
  • `getPostHistory_returnsDescendingVersions` – query returns versions newest-first limited to 20.

Phase 2 – UI integration & forms
--------------------------------

Affected files (additions marked *)
``components/post-detail.tsx`` – add *More* menu (Edit/Delete/View history*)
``components/post-form-fields.tsx`` – shared fields
``components/post-history-modal.tsx`` – **new**, lists previous versions with diff toggle
``app/post/[id]/page-client.tsx`` – wire history modal

Changes
* ``View history`` opens ``post-history-modal``; fetches ``getPostHistory``.
* Each version card shows title, timestamp, editor avatar; clicking reveals rendered content.
* Error handling via ``use-query-error``.
* Playwright tests
  – open history modal, verify latest+older versions present.

Phase 3 – Display edited/deleted state
-------------------------------------

Affected files
``components/post-header.tsx`` – edited badge
``components/post-list.tsx`` / ``post-card.tsx`` – hide deleted
``convex/posts.ts`` queries – filter ``status != 'deleted'``

Changes
* In post header subline, render "• edited <time ago>" using ``utils.formatTimeDistance``.
* Filter queries: update ``getPostsByCategory`` query (convex/posts.ts) to ``where('status', '=', 'active')`` (or not 'deleted').
* Unit tests – Vitest React component test (Testing Library) snapshot of PostHeader with edited flag
  • `PostHeader_rendersEditedBadge` – component displays "edited" badge when editedAt provided.

Phase 4 – Edit history viewer (frontend polish)
----------------------------------------------

Affected files
``components/post-history-modal.tsx`` – diff view using ``render-post-content`` both versions
``components/ui/tabs.tsx`` – reuse for "Rendered" vs "Diff (raw)"

Changes
* Add diff view (e.g., ``diff-match-patch`` library) for text content.
* No pagination necessary (max 20 versions by design).
* Vitest snapshots for modal rendering (Testing Library / @vitest/coverage).
  • `PostHistoryModal_showsVersionsList` – modal lists all versions with timestamps.
  • `PostHistoryModal_displaysDiffView` – diff tab renders content changes between versions.

Phase 5 – Legacy cleanup
------------------------

Affected files
* Remove ``authorId`` optional fields from ``posts`` and ``comments`` tables via migration
* Delete legacy ``author`` properties in API responses and UI components
* Remove ``checkAuthorId.ts`` utility and related query/function
* Update schema, unit tests, and regenerate Convex types
* Playwright smoke test to ensure no regressions

Changes
* Update schema to remove ``authorId`` and ``author`` fields from ``posts`` and ``comments`` tables
* Delete legacy ``author`` properties in API responses and UI components
* Remove ``checkAuthorId.ts`` utility and related query/function
* Update unit tests to reflect changes in schema
* Regenerate Convex types to reflect changes in schema
* Playwright smoke test to ensure no regressions

====================================================================


