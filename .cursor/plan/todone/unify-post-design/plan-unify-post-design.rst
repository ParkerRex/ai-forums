We need to udpate the post design to be more unified. This makes the home page more engaging and easier to navigate. 

The idea is that this will be similar to reddit, where posts are displayed in a list, and the user can click on a post to view it. 

This means that images with only text display the same amount inside of a preview. 

This means that if the post includes a video, that it's displayed differently than a post with only text. 

This means that a post including links should display prominently in the preivew. 

If a post has a video, imge, and text, we can show that as well. 

For instance the way that reddit posts look, we can improve on that implementation. 

Here are examples from reddit: 

Video example (autoplays, this means we need to store video uploaded to our storage bucket. We dont have one at the moment I believe.)

Users can also upload images, which means that we need to store those. 

Users can link to existing youtube videos which display differently. 


I provided UI examples below separated by the viewer experience, and the post creator experience. 

## Viewer Experience: 
Example of uploaded video: 
.cursor/plan/video-example-playing.png
.cursor/plan/video-example.png

Example of uploaded link post: 

Example of uploaded image: 
.cursor/plan/viewer-image.png
.cursor/plan/creator-images-and-videos-image-uploaded-onhover.png

Example of text only post: 
.cursor/plan/viewer-text-only.png

### Post experience: 
Example of uploaded video: 
.cursor/plan/creator-images-and-videos-empty.png
.cursor/plan/creator-images-and-videos-uploaded.png

Example of uploaded link post: 
.cursor/plan/creator-example-of-uploaded-link-post.png
.cursor/plan/creator-example-of-link-post-complete.png

Example of uploaded image: 
.cursor/plan/creator-images-and-videos-image-uploaded.png

Example of text only post: 
.cursor/plan/creator-text-only-empty.png
.cursor/plan/creator-text-only-rich-text-editor.png

.. DECISIONS (confirmed)

* Media storage: **Cloudflare R2** (use presigned PUT URLs for direct client uploads).
* Videos autoplay **muted** in list previews and detail view.
* Thumbnails: use intrinsic image/video aspect, constrain by preview container; lazy-load with automatic fetch priority.
* Link previews: fetch OpenGraph metadata **server-side** for performance.

========================================================
TASK CHECKLIST
========================================================

Phase 1 – Backend data model & API
    ☑ Add ``PostType`` enum and media/link fields in ``convex/schema.ts``
    ☑ Generate migration ``convex/migrations/add_post_media_fields.ts``
    ☑ **Integrate Cloudflare R2:** create ``convex/storage.ts`` action returning presigned URL
    ☑ Extend ``createPost`` & ``updatePost`` mutations in ``convex/posts.ts``
    ☑ **Server-side OG fetch:** add ``convex/linkPreview.ts`` query to scrape and cache OG data
    ☑ Back-fill existing posts with ``type: "text"`` via script ``convex/migration.ts``

Phase 2 – Post creation & editing UI
    ☑ Refactor ``components/post-creation-form.tsx`` → split into *Text*, *Media*, *Link* tabs
    ☑ Integrate file-upload helper ``lib/upload-media.ts`` (stub)
    ☑ Persist ``postType`` + media data via updated mutations
    ☑ Add unit test ``scripts/__tests__/post-create.test.ts``

Phase 3 – Unified post presentation
    ☑ Create ``components/post-preview.tsx`` (single entry point for list & sidebar)
    ☑ Update ``components/post-card.tsx`` & list pages to use new preview
    ☑ Update ``components/post-detail.tsx`` to render media blocks responsively
    ☑ Add helper ``lib/post-preview-utils.ts`` + unit tests ``scripts/__tests__/post-preview-utils.test.ts``

========================================================
PHASE 1 – Backend data model & API
========================================================

Affected files
--------------
* ``convex/schema.ts`` – add ``PostType`` enum ("text" | "image" | "video" | "link") and new optional fields ``mediaUrl``, ``thumbnailUrl``, ``linkUrl``
* ``convex/migrations/add_post_media_fields.ts`` – forward migration adding fields, back-fill script
* ``convex/posts.ts`` – update ``createPost`` / ``updatePost`` arg validators & writes
* ``convex/migration.ts`` – one-off back-fill existing posts

Summary of changes
------------------
1. Extend schema with enum & fields.  All new fields default ``null`` so legacy data stays valid.
2. Create migration to add new fields & populate ``type: 'text'`` for existing rows.
3. Enhance mutations to validate per-type requirements (e.g., ``image`` requires ``mediaUrl``).
4. Update generated types via ``npx convex codegen`` after migration.

Unit tests
~~~~~~~~~~
* ``posts.createPost`` validator throws on missing mandatory fields.
* Migration script marks all existing posts as ``type: 'text'``.

========================================================
PHASE 2 – Post creation & editing UI
========================================================

Affected files
--------------
* ``components/post-creation-form.tsx`` – convert to controlled form with tabbed input
* ``lib/upload-media.ts`` – wrapper around upload endpoint (stub; returns URL)
* ``components/rich-text-editor.tsx`` – ensure still functional inside form

Summary of changes
------------------
1. Provide tabs: **Text**, **Image/Video**, **Link**.  Each tab shows relevant inputs.
2. On submit, build payload matching enum & fields then call Convex mutation.
3. Image/Video tab uses ``upload-media.ts`` helper + drag-and-drop.
4. The form itself is WYSIWYG—inputs are styled so the content appears exactly as it will after publishing (no separate preview pane).

Unit tests
~~~~~~~~~~
* Form validates required fields per tab.
* Mock upload helper returns URL and payload is constructed correctly.

========================================================
PHASE 3 – Unified post presentation
========================================================

Affected files
--------------
* ``components/post-preview.tsx`` (NEW)
* ``components/post-card.tsx`` – thin wrapper, removed type-specific code
* ``components/post-detail.tsx`` – media rendering
* List pages: ``app/[category]/[slug]/page-client.tsx`` & home ``app/page.tsx``
* ``lib/post-preview-utils.ts`` (NEW)

Summary of changes
------------------
1. Introduce ``post-preview.tsx`` that renders:
   * text-only excerpt (clamped lines)
   * image thumbnail (object-cover)
   * GIF/video thumbnail with play overlay; lazily auto-play on hover if approved
   * link card using OG image + title
2. Factor shared sizing & hover styles here; parent components supply ``size`` prop.
3. ``post-detail.tsx`` uses same logic but full-width media player / image grid.
4. Utility selects best preview asset from post record.

Unit tests
~~~~~~~~~~
* Utility returns expected thumbnail for each ``PostType``.
* Preview component renders correct JSX snapshot for each type using RTL + Jest.

Performance optimizations
-------------------------
* **List virtualization:** wrap post list in ``react-window`` (or Convex pagination) so only visible items mount.
* **Media placeholders:** serve low-quality blurred placeholders via ``<Image placeholder="blur" />`` until full image/video loads.
* **Intersection-based eager load:** reuse existing ``hooks/use-intersection-prefetch.ts`` to trigger media fetch only when card is near viewport.
* **Next.js dynamic imports:** code-split heavy media player component (e.g., HLS.js) with ``next/dynamic``.
* **OG cache TTL:** store fetched OpenGraph data with 24 h TTL; background refresh via Cron action to avoid blocking requests.
* **CDN cache headers:** set ``Cache-Control`` headers on R2 assets for long-lived edge caching.

Convex-specific implementation notes
-----------------------------------
* **R2 integration**
  1. Add env vars ``R2_ACCOUNT_ID``, ``R2_ACCESS_KEY``, ``R2_SECRET_KEY``, ``R2_BUCKET`` via ``convex env``.
  2. New action ``convex/storage.ts``
     * `generateUploadUrl({ contentType }): { url, objectKey }` – returns presigned PUT URL (15 min validity) using an **S3-compatible client** (e.g., ``@aws-sdk/client-s3``) pointed at R2 endpoint ``https://<account>.r2.cloudflarestorage.com`` (no AWS account required).
     * `deleteObject({ objectKey })` – remove abandoned uploads (used by post deletion Cron).
  3. Client uploads file directly to the presigned URL, then sends Convex mutation with returned ``objectKey`` → stored as ``mediaUrl`` (R2 public base URL + key).

* **Cron jobs** (``convex/_crons``)
  * ``cleanupOrphanMedia.ts`` – nightly; scans post table for missing ``mediaUrl`` keys and deletes strays in R2.
  * ``refreshOpenGraph.ts`` – hourly; refetches OG metadata for stale link previews (>24 h).
  * ``stats.recomputeDaily`` (existing) can be left untouched.
  * Register in ``convex/_generated/crons.ts`` via `defineCronTrigger`.




