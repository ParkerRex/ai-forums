**Open Questions**
===================
- Do we need to support user-selectable *"system"* theme detection or strictly light/dark toggle?
- Do any third-party iframes/content (e.g. Stripe checkout) require bespoke dark-mode handling?

.. task checklist (update as completed)

Phase 1 – Global Theming Setup
--------------------------------
☐ Create ``tailwind.config.ts`` with ``darkMode = "class"`` and color tokens
☑ Define CSS variables for light & dark palettes in ``app/globals.css``
☑ Wrap ``app/layout.tsx`` with ``<ThemeProvider>``
☐ Remove redundant color utilities where shadcn vars suffice

Phase 2 – Component Adaptation
------------------------------
☐ Audit custom components for hard-coded colors
☐ Replace with Tailwind utility variants *or* CSS variables (e.g. ``text-foreground``)
☐ Export shared utility ``cnDark()`` (wrapper around ``clsx``) for conditional classes
☐ Update Storybook/Chromatic snapshots (if present)

Phase 3 – UI Controls & Persistence
-----------------------------------
☑ Integrate ``ThemeToggle`` into ``components/header.tsx``
☐ Persist preference with *next-themes* (already in deps)
☐ Implement SSR theme script to avoid flash of wrong theme (FART)
☐ Add Cypress/Playwright test toggling themes across pages


Phase 1 – Global Theming Setup
==============================

Affected Files
~~~~~~~~~~~~~~
- ``tailwind.config.ts`` – enable ``darkMode: 'class'``; extend theme tokens via CSS vars
- ``app/globals.css`` – define :root & *.dark* palettes (using shadcn token names)
- ``components/theme-provider.tsx`` – ensure ``attribute="class"`` and ``defaultTheme="system"``
- ``app/layout.tsx`` – wrap children in provider & pass ``className`` from *next-themes*

Summary of Changes
~~~~~~~~~~~~~~~~~~
1. *Already done*: **centralized CSS variable palette** is present in ``app/globals.css`` with light & dark values.
2. *Already done*: Layout uses ``ThemeProvider`` to control ``class="dark"`` on <html>.
3. Remaining: add **tailwind.config.ts** to enable ``darkMode: 'class'`` and map shadcn token utilities if missing.
4. Remaining: remove component-level hard-coded colors once Tailwind mapping is finalized.

Unit Tests
~~~~~~~~~~
- Jest + React Testing Library: assert that toggling context updates ``document.documentElement.classList``.
- Snapshot test for ``app/layout`` renders expected HTML class.


Phase 2 – Component Adaptation
==============================

Affected Files
~~~~~~~~~~~~~~
- ``components/**/*`` (custom only)
- ``lib/utils.ts`` – add ``cnDark()`` helper

Summary of Changes
~~~~~~~~~~~~~~~~~~
1. Script (optional) to grep for hex colors and flag for review.
2. Replace hard-coded colors with utility classes (`text-muted-foreground`, `bg-card`, etc.) already mapped to tokens.
3. Where dynamic, use ``cnDark('text-gray-900', 'text-gray-100')`` helper.

Unit Tests
~~~~~~~~~~
- RTL tests for representative components (e.g. ``post-card``) asserting correct classes in both themes via mocked context.


Phase 3 – UI Controls & Persistence
===================================

Affected Files
~~~~~~~~~~~~~~
- ``components/theme-toggle.tsx`` – confirm logic & animations
- ``components/header.tsx`` – inject toggle button
- ``middleware.ts`` – add optional cookie read for initial theme (SSR)
- ``e2e/`` tests (new)

Summary of Changes
~~~~~~~~~~~~~~~~~~
1. Mount toggle in header; ensure mobile menu also contains toggle.
2. Configure *next-themes* to store preference in cookie, enabling SSR detection.
3. Inject small inline script in ``_document`` (optional) to set class early.
4. End-to-end test verifies persistence across refresh and navigation.

Unit / E2E Tests
~~~~~~~~~~~~~~~~
- Cypress test: toggle to dark, reload, assert dark persists.
- Playwright visual diff across pages in both themes (if configured). 