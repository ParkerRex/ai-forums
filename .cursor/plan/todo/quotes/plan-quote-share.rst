☐ **Phase 1 – Quote selection & tooltip**
    ☐ Modify ``components/post-detail.tsx`` to detect text selection
    ☐ Create new *``QuoteShareTooltip``* component that appears near the selection and triggers the modal

☐ **Phase 2 – Share Quote modal UI & state**
    ☐ Create new *``QuoteShareModal``* component with:
        ☐ theme-aware preview frame
        ☐ background-color picker (monochrome palette)
        ☐ aspect-ratio selector (portrait, square, story)
    ☐ Wire modal open/close state into ``PostDetail`` page

☐ **Phase 3 – Image generation, download & tests**
    ☐ Implement ``generateQuoteImage`` utility (uses *html2canvas* to render modal content to PNG)
    ☐ Trigger download in a transient tab, auto-close when complete
    ☐ Unit tests for ``generateQuoteImage``
    ☐ Playwright flow test: highlight → share → download


==============================
Open questions
==============================

1. Should image generation be fully client-side (*html2canvas*) or server-side (e.g. *@vercel/og*) for higher fidelity? (Impacts Phase 3 design.)
2. Acceptable maximum export resolution? (Affects memory/CPU.)


==============================
Phase 1 – Quote selection & tooltip
==============================

*Affected files*
  • ``components/post-detail.tsx`` – add selection listener, maintain *selectedQuote* state; import & render tooltip.  
  • **NEW** ``components/quote-share-tooltip.tsx`` – floating UI (ShadCN *Popover*) showing share icon + "Share" label.

*Changes*
  • On *mouseup* inside post content, capture ``window.getSelection()`` text and range.  
  • If non-empty, compute bounding box, position ``QuoteShareTooltip`` absolutely.  
  • Tooltip click raises *onShare(quoteText)* callback (lifted to ``PostDetail``).

*Unit tests*
  • Jest DOM test: selecting text fires ``onSelection`` and renders tooltip.  
  • Playwright test stub (completed in Phase 3).


==============================
Phase 2 – Share Quote modal UI & state
==============================

*Affected files*
  • **NEW** ``components/quote-share-modal.tsx``  
  • ``components/post-detail.tsx`` – open modal with *selectedQuote* string.

*Changes*
  • Modal presents preview frame – quote text, author, site branding.  
  • Controls: background swatches (array of tailwind classes), aspect ratios (1:1, 4:5, 9:16).  
  • Maintain internal state ``{bg, ratio}``; re-render preview on change.

*Unit tests*
  • React Testing-Library: switching bg/ratio updates preview container class.  


==============================
Phase 3 – Image generation & download
==============================

*Affected files*
  • **NEW** ``lib/generate-quote-image.ts``  
  • ``components/quote-share-modal.tsx`` – invoke generator & handle download.  
  • **NEW** ``__tests__/generate-quote-image.test.ts``  
  • ``playwright/quote-share.spec.ts``

*Changes*
  • ``generateQuoteImage(element, options)`` → returns ``{blob, filename}``.  
  • On "Download" button: open ``window.open()`` with object URL, trigger ``a.download``, close tab after *onload*.

*Unit tests*
  • Mock ``html2canvas`` to assert canvas size & returned blob.  
  • Playwright: user highlights quote, clicks share, selects options, downloads; assert file name pattern ``post-{slug}-quote.png``.





