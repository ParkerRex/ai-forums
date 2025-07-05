we need to update our post, post previews, sidebar news component to look exactly like reddit. 

it looks to crowded at the moment. 

big things to change: 
- posts arent in chunky card
- they only have backgrounds appear on hover.
example here .cursor/plan/todo/onhove.png
the post action buttons have backgrounds (vote, comment, share)
- the date is relative to the current day... eg. 2 days ago, 1 hr ago 
the category is small, and has the date. category • date 
the overall design is a lot more minimal and data dense. 

the recent news section: 
- needs to be 2 lines max for each story. 
- has the source above it. 
- shows how long ago the article was posted.



cards appear on the home page, the post detail page, the members page... theyre all the same. 

**OPEN QUESTIONS**
* Do we want to keep the current drop-shadow on cards when the hover background appears, or remove it entirely?  
* What exact palette values (bg-hover, icon-hover) should be used – follow Reddit colours or use our design system tokens?

===========================
☐ **Phase 1 – Card & Post Metadata Refactor**
===========================
Files affected
  * ``components/post-card.tsx`` – restructure markup, hover bg, spacing
  * ``components/post-preview.tsx`` – share card wrapper, remove hard bg
  * ``components/post-detail.tsx`` + ``post-header.tsx`` – reuse new wrapper
  * ``components/ui/card.tsx`` – add ``variant="hoverable"``
  * ``lib/time-utils.ts`` – expose ``formatRelativeDate``
  * tailwind / globals – new util classes (e.g. ``card-hover``)

Summary per file
  * **post-card.tsx** – wrap entire card in new ``<HoverCard>``, drop fixed bg/radius, add ``group-hover:bg-muted`` transition.
  * **post-preview.tsx** – replace local wrapper with ``HoverCard``.
  * **post-header.tsx** – compress metadata line: ``<CategoryBadge /> • {formatRelativeDate(createdAt)}``.
  * **card.tsx** – accept ``hoverable`` variant that renders children in ``group`` with bg on hover.
  * **time-utils.ts** – new ``formatRelativeDate(date: Date): string`` returning values like "2 h ago".

Implementation notes
  #. Introduce ``HoverCard`` pattern in ``ui/card.tsx``.
  #. Replace hard-coded paddings with ``space-y-2`` for denser layout.
  #. Move vote / actions bar into a flex row with ``hover:bg-muted/40 rounded-md p-1`` on each icon button.

Unit tests
  * ``components/__tests__/post-card.spec.tsx``  
    - renders without bg by default  
    - applies bg on ``mouseEnter`` (use ``@testing-library/user-event`` hover).
  * ``lib/__tests__/time-utils.test.ts``  
    - "2024-07-01" produces "2 days ago" (mock ``Date.now``).

========================
☐ **Phase 2 – Sidebar "Recent News" Tight Layout**
========================
Files affected
  * ``components/post-sidebar.tsx`` – reduce story height & add source line
  * ``components/sidebar-roadmap-component.tsx`` (CSS tweak only)
  * ``lib/utils.ts`` – helper ``truncateLines(text, 2)``

Summary per file
  * Limit each news item title to **2 lines** via ``line-clamp-2``.
  * Prepend source (domain) in smaller, muted text.
  * Replace absolute timestamps with ``formatRelativeDate``.

Unit tests
  * ``components/__tests__/post-sidebar.spec.tsx``  
    - renders source line & relative time  
    - ensures titles are truncated (check ``line-clamp-2`` class).

========================
☐ **Phase 3 – Visual Polish & Regression Tests**
========================
Files affected
  * ``playwright/post-card-visual.spec.ts`` – new visual diff for hover state
  * ``components/globals.css`` – transient bg transition token

Summary
  * Add Playwright visual test that hovers first post on home and snapshots.
  * Run ``pnpm test --filter @components`` to update snapshots.

Unit tests
  * Adjust any failing snapshots (header, preview, sidebar).
