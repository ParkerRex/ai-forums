We need to update our links that exist inside of the posts to be more approachable. When a user adds a link to their post, the link should have a special component.

This component uses the shadcn badge, and has a simple monochromatic look to it. When they enter the link it can have link text and the link itself as you would expect from markdown. 

Example: [icon] [spacebar] [link]

I like these animated icons that can be added via the shadcn CLI. 

Theyre built with motion and lucide.

Icon link: npx shadcn@latest add "https://icons.pqoqubbw.dev/c/link.json"

This would show up when a user previews their post, and when a reader views the post. 

RESOLVED ASSUMPTIONS
====================

• ``post.content`` is **plain UTF-8 text** with paragraphs separated by ``\n`` / ``\n\n``.  
• It contains *no pre-rendered HTML*.  
• Links appear either in Markdown form ``[label](https://domain)`` **or** as bare URLs ``https://domain/path``.

These findings come from sampling the *posts* table in the dev deployment via Convex MCP.

Parsing strategy: keep regex replacement, and add a second regex for bare URLs so they also become ``<LinkBadge href="…">{hostname}</LinkBadge>`` (hostname for display if no label).

TASK CHECKLIST
==============

**Phase 1 – Editor-side LinkBadge**

☑ create ``components/link-badge.tsx`` (animated badge)  
☑ create ``extensions/link-badge.ts`` TipTap extension (inline mark)  
☑ register extension inside ``components/rich-text-editor-full.tsx``  
☑ add unit test ``components/__tests__/link-badge.test.tsx``

**Phase 2 – Link metadata + storage hardening**

☑ add ``convex/linkPreviews.ts`` action to fetch & cache OpenGraph data  
☑ extend TipTap extension to fetch preview onPaste/onEnter via Convex mutation  
☑ update posts mutation (`api.posts.createPost`) to run URL validation (http/https only, block disallowed schemes)  
☑ migrate DB: add optional ``linkPreviews`` field to posts  
☑ update ``post-detail.tsx`` + ``post-preview.tsx`` to render content safely with ``RenderPostContent`` component  
☑ unit tests: ``convex/__tests__/linkPreviews.test.ts`` (mock fetch) + ``lib/__tests__/render-post-content.test.tsx``


PHASE 1 – LinkBadge component
=============================

Affected files
--------------
* **``components/link-badge.tsx`` (NEW)** –
  React component wrapping ShadCN ``Badge``; renders Lucide *Link* icon (animated with *framer-motion*) followed by link text; opens target in new tab with ``rel="noopener noreferrer"``.
* **``package.json``** – *add* ``framer-motion`` if not present (peer of ShadCN icon animations).
* **``components/__tests__/link-badge.test.tsx`` (NEW)** – Jest + React Testing Library test ensuring:
  • correct ``href`` attribute  
  • icon & text both render  
  • external link security attrs present.

Implementation notes
--------------------
1. Export ``interface LinkBadgeProps { href: string; children: React.ReactNode }``.  
2. Icon animation: small 360° rotate on hover using ``motion``.
3. Accessibility: ``aria-label={children}`` on anchor.

Unit tests
~~~~~~~~~~
* Shallow render component; assert ``getByRole('link')`` has ``href`` and text.  
* Simulate hover – animation not asserted (library-internal), but ensure no crash.


PHASE 2 – Post rendering integration
===================================

Affected files
--------------
* **``lib/render-links.tsx`` (NEW)** –
  Export ``function renderLinks(raw: string): React.ReactNode[]`` which:
  • splits input into paragraphs ``/\n{2,}/``  
  • within each paragraph, replace ``[text](url)`` regex with ``<LinkBadge href={url}>{text}</LinkBadge>``  
  • returns array of ``<p>`` elements (preserving existing prose styling).
* **``components/post-detail.tsx`` (UPDATE)** –
  remove manual ``split('\n')`` mapping; instead call ``renderLinks(post.content)``.
* **``components/post-preview.tsx`` (UPDATE)** –
  same renderLinks usage.
* **``lib/__tests__/render-links.test.tsx`` (NEW)** – tests:
  • single link paragraph  
  • multiple links  
  • paragraphs without links untouched  
  • malformed ``[text](url)`` left as-is.

Implementation notes
--------------------
1. Regex: ``/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g``.  
2. Escaping: ignore in-code segments (backticks) – simplest initial pass: perform substitution outside code blocks.

Unit tests
~~~~~~~~~~
* snapshot of ``renderLinks`` output for a sample with 2 paragraphs & mixed links.



