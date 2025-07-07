OPEN QUESTIONS
--------------
* Do we have authoritative design specs (exact padding, font sizes, border radii) or should we eyeball based on provided screenshots?  
* How should *tall portrait* images be handled inside a landscape-oriented preview – letterbox (``object-contain``) or crop with focus?  
* Confirm desired autoplay policy for videos on mobile (currently hover-based; mobiles have no hover).

Task Checklist
==============

Phase 1 – Compact card primitive
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
☐ **components/ui/card.tsx** – add optional ``size`` prop ("default" | "compact"), exposing slimmer padding & gap utilities; default remains unchanged.  
☐ **components/ui/card.tsx** – export ``cardSizeClass(size)`` helper for internal reuse/tests.  
☐ **post-card.tsx**, **member-card.tsx**, **post-preview.tsx** – pass ``size="compact"`` where rendered inside feeds; remove redundant internal paddings.  
☐ **tests/components/card.test.tsx** – snapshot test both sizes.

Phase 2 – Responsive media preview
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
☐ **lib/post-preview-utils.ts** – refactor ``getPreviewDimensions`` → ``getPreviewClasses(size, asset)`` returning ``aspect-ratio`` + ``max-w`` tailwind classes; detect portrait vs landscape and pick ``object-contain`` vs ``object-cover``.  
☐ **components/post-preview.tsx** – apply new util; replace hard-coded ``w-48 h-36`` etc. with ratio classes; ensure images/video fill area without unwanted crop; preserve video hover-autoplay; add ``playsInline muted`` attr for autoplay on mobile.  
☐ **lib/__tests__/post-preview-utils.test.ts** – unit tests for portrait/landscape dimension mapping.

Phase 3 – Post & member card polish
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
☐ **components/post-card.tsx** – reduce outer padding/border to ``p-3``; tighten vote column width; align stats bar font to ``text-xs``.  
☐ **components/member-card.tsx** – adopt compact variant; avatar ``h-12 w-12``; bio ``line-clamp-2``; shrink gaps.  
☐ **app/page.tsx** – shrink feed gutter ``gap-4`` → ``gap-3`` and ensure ``PostList`` passes ``previewSize="small"`` for default feed.  
☐ **playwright/post-visual.spec.ts** – visual regression ensuring card fits 3 items per desktop row without overflow.

Implementation Phases
=====================

Phase 1 – Compact card primitive
--------------------------------
**Affected files**: ``components/ui/card.tsx``, ``post-card.tsx``, ``member-card.tsx``, ``post-preview.tsx``, ``lib/__tests__/card.test.tsx``

1. Extend ``Card`` component signature: ``function Card({ size = "default", className, ...props })``.  
2. Internally map ``size`` → padding/gap (default: ``py-6 px-6 gap-6``; compact: ``py-3 px-4 gap-4``).  
3. Export helper ``cardSizeClass(size)`` for tests and other sub-components.  
4. Update ``CardHeader``, ``CardContent`` etc. to inherit reduced spacing via Tailwind ``[data-slot=...]`` selectors – no API change.  
5. Touch Post/M​ember/Post-Preview cards to invoke ``<Card size="compact" />`` and delete now-duplicate ``p-*`` classes.  
6. **Tests**: render both sizes, expect class list to include compact modifiers.

Phase 2 – Responsive media preview
----------------------------------
**Affected files**: ``lib/post-preview-utils.ts``, ``components/post-preview.tsx``, ``lib/__tests__/post-preview-utils.test.ts``

1. Replace numeric dimension constants with aspect-ratio classes:  
   * landscape default 16/9 → ``aspect-[16/9] max-h-60``  
   * portrait 3/4 → ``aspect-[3/4] max-h-80``  
   * square → ``aspect-square``.  
2. Add ``getAssetOrientation(asset)`` (looks at naturalWidth/Height via meta fields if available else falls back to ratio heuristics).  
3. ``getPreviewClasses(size, asset)`` returns ``{wrapper:"w-48", media:"object-cover"}`` etc.  
4. ``post-preview.tsx``:  
   * Remove inline ``width``/``height`` props on ``<Image>`` and ``<video>``; rely on CSS.  
   * Use ``object-contain`` for portrait images unless they exceed wrapper aspect.  
   * Add ``preload="metadata"`` attr for video; keep hover autoplay.
5. Unit tests: given asset orientation & size, expect correct class strings.

Phase 3 – Post & member card polish
-----------------------------------
**Affected files**: ``components/post-card.tsx``, ``components/member-card.tsx``, ``app/page.tsx``, ``playwright/post-visual.spec.ts``

1. **post-card.tsx**  
   * Wrap with ``<Card size="compact" className="border-border/70" />``.  
   * Adjust vote column ``p-2 gap-0.5``; ``text-sm`` down to ``text-xs``.  
   * Actions bar: shrink icons to ``w-3 h-3``; reduce padding ``px-3 py-1.5``.  
2. **member-card.tsx**  
   * Switch root card to compact; avatar 48px; compress top/bottom margins; make stats row ``text-[10px]``.  
3. **app/page.tsx**  
   * Change outer grid gap to 3; maybe 2 on sm screens.  
   * Pass ``previewSize="small"`` to ``<PostList>`` (add prop if missing).  
4. **Playwright test**: capture desktop snapshot of / (home) to freeze layout.

Unit tests:
* Snapshot diff of card sizes (Phase 1).  
* Orientation class mapping (Phase 2).  
* Visual regression via Playwright (Phase 3). 