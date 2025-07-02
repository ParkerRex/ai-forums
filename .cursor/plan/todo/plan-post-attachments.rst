✓ Phase 1 – Back-end support for multi-attachments
✓ Phase 2 – Front-end creation & display of multi-attachments

============================================================
Phase 1 – Back-end support for multi-attachments ✓ COMPLETED
============================================================

Affected files
--------------
* ✓ ``convex/schema.ts`` – added ``attachments`` field in ``posts`` and ``post_versions`` tables
* ✓ ``convex/posts.ts`` – updated ``createPost`` / ``editPost`` to handle attachments
* ✓ ``convex/migrations/migrate_post_attachments.ts`` – created migration script
* ✓ ``scripts/run-post-attachments-migration.ts`` – created executable migration runner
* ✓ ``convex/test/posts.test.ts`` – added comprehensive attachment tests

Changes Implemented
-------------------
1. **Schema**
   - Added ``attachments`` field as optional array matching ``MediaItem`` interface
   - Includes all fields: id, type, url, thumbnailUrl, dimensions, order, and type-specific fields
   - Added to both ``posts`` and ``post_versions`` tables

2. **Mutations**
   - ``createPost`` and ``editPost`` now accept optional ``attachments`` array
   - Legacy fields (``mediaUrl``, ``thumbnailUrl``, etc.) automatically set from first attachment
   - Type mapping: image→image, video→video, youtube→video, pdf→keeps existing type
   - Attachments preserved in version history

3. **Migration**
   - ``migratePostAttachments`` - converts posts with ``mediaUrl`` to attachments array
   - ``migrateLinkedPostAttachments`` - handles posts with ``linkImage``
   - Batch processing with configurable batch size
   - Executable script for running migrations

4. **Tests**
   - Test creating posts with multiple attachments
   - Test legacy field mapping from first attachment
   - Test YouTube attachment type mapping
   - Test editing posts with attachments
   - Test attachments preserved in version history

============================================================
Phase 2 – Front-end creation & display ✓ COMPLETED
============================================================

Affected files
--------------
* ✓ ``components/post-creation-form.tsx`` – updated to submit ``mediaItems`` as ``attachments``
* ✓ ``components/post-detail.tsx`` – added grid of secondary attachments under main media
* ✓ ``components/attachment-grid.tsx`` – created read-only variant of MediaPreviewGrid
* ✓ ``playwright/post-multimedia.spec.ts`` – created end-to-end tests
* ✓ ``scripts/__tests__/post-create.test.ts`` – added attachment validation tests

Changes Implemented
-------------------
1. **PostCreationForm**
   - Updated submission logic to pass ``mediaItems`` as ``attachments`` array
   - Each attachment includes all fields from MediaItem interface
   - Maintains backward compatibility by setting legacy fields

2. **AttachmentGrid Component**
   - Created read-only grid component for displaying attachments
   - Shows attachment type badges
   - Supports image, video, PDF, and YouTube previews
   - Only displays when there are multiple attachments (slice(1))

3. **PostDetail Updates**
   - Added attachments field to Post interface
   - Renders AttachmentGrid for posts with > 1 attachment
   - Secondary attachments shown below main content

4. **List Views**
   - Confirmed PostCard/PostPreview still use legacy fields
   - No changes needed - backward compatible

5. **Tests**
   - Created Playwright tests for multi-attachment creation and display
   - Added unit tests for attachment validation
   - Tests cover order validation, required fields, and media types 