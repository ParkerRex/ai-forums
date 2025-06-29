**Open Questions**
===================
- Should the `/` keyboard shortcut *replace* ⌘K/Ctrl-K entirely, or coexist (both open search)?
- Any performance concerns with eager `router.prefetch` on many links (e.g. large post lists)?
- Do we need loading analytics for new skeleton components?

.. task checklist (update as completed)

Phase 1 – Simplify & Re-bind Global Search
-----------------------------------------
☑ Update `hooks/use-command-k.ts` → rename to `use-search-hotkey.ts` and listen for `/` *and* ⌘K (configurable)
☑ Remove legacy per-page search triggers; ensure single provider controls dialog
☑ Add focus trap for immediate typing on open
☐ Unit tests: keydown `/` opens dialog; Escape closes; typing funnels to input

Phase 2 – Add Sidebar & PostHeader Skeletons
-------------------------------------------
☑ Create `components/post-header-skeleton.tsx` (shadcn card shimmer)
☑ Create `components/post-sidebar-skeleton.tsx`
☑ Render skeletons while related queries are `undefined`
☐ Unit tests: skeleton visible during loading, hidden once data arrives

Phase 3 – Link Prefetching
--------------------------
☑ Wrap all `<Link>` in `PostCard`, `PostHeader`, `PostSidebar`, `MemberCard` with `prefetch={true}` (Next 15)
☑ Add `useIntersectionPrefetch.ts` hook for non-visible links (e.g. infinite lists)
☐ Integrate hook in `PostList` to prefetch next page slugs
☐ Unit tests: mock router.prefetch called on intersection, debounce verified


Phase 1 – Simplify & Re-bind Global Search
==========================================

Affected Files
~~~~~~~~~~~~~~
- `hooks/use-command-k.ts` → rename `use-search-hotkey.ts`
- `components/global-search.tsx` – import new hook, remove unused props
- `app/layout.tsx` – update provider import path

Summary of Changes
~~~~~~~~~~~~~~~~~~
1. Consolidate keyboard shortcut handling:
   ::
       export default function useSearchHotkey(open: () => void, close: () => void) {
         useEffect(() => {
           function onKey(e: KeyboardEvent) {
             if (e.key === '/' && isInputFree(e)) { e.preventDefault(); open(); }
             if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
             if (e.key === 'Escape') close();
           }
           window.addEventListener('keydown', onKey);
           return () => window.removeEventListener('keydown', onKey);
         }, []);
       }
2. Remove other listeners; ensure `GlobalSearch` dialog focuses input on mount.

Unit Tests
~~~~~~~~~~
- RTL: simulate keydown `/` → expect `open` callback invoked once.
- RTL: `/` inside `<input>` should not trigger (isInputFree guards).
- RTL: Escape closes dialog.


Phase 2 – Add Sidebar & PostHeader Skeletons
===========================================

Affected Files
~~~~~~~~~~~~~~
- `components/post-header-skeleton.tsx` (new)
- `components/post-sidebar-skeleton.tsx` (new)
- `components/post-header.tsx` – render skeleton when `categories` query `undefined`
- `components/post-sidebar.tsx` – render skeleton when `stats` query `undefined`

Summary of Changes
~~~~~~~~~~~~~~~~~~
1. Skeleton components mirror layout of real components but with animated placeholders using Tailwind `animate-pulse` and token classes.
2. Swap rendering based on query state (loading → skeleton, error → fallback UI, success → real component).

Unit Tests
~~~~~~~~~~
- RTL: during mocked undefined query result, skeleton is present.
- RTL: after resolving mock to data, skeleton disappears and real content renders.


Phase 3 – Link Prefetching
==========================

Affected Files
~~~~~~~~~~~~~~
- `components/post-card.tsx`
- `components/post-header.tsx`
- `components/post-sidebar.tsx`
- `components/member-card.tsx`
- `hooks/use-intersection-prefetch.ts` (new)

Summary of Changes
~~~~~~~~~~~~~~~~~~
1. Add `prefetch={true}` prop to each static `<Link>` (Next.js automatically prefetches in viewport).
2. Implement `useIntersectionPrefetch` hook:
   ::
       export const useIntersectionPrefetch = (href: string) => {
         const ref = useRef<HTMLAnchorElement>(null);
         useEffect(() => {
           if (!ref.current) return;
           const observer = new IntersectionObserver(entries => {
             entries.forEach(e => {
               if (e.isIntersecting) {
                 router.prefetch(href);
                 observer.disconnect();
               }
             });
           });
           observer.observe(ref.current);
           return () => observer.disconnect();
         }, [href]);
         return ref;
       };
3. Apply hook to dynamic list links (e.g. `PostCard`) so next-page items prefetch just-in-time.

Unit Tests
~~~~~~~~~~
- Jest: mock `router.prefetch` and assert call after intersection triggers.
- Integration test (Playwright): scroll list, observe network prefetch requests. 