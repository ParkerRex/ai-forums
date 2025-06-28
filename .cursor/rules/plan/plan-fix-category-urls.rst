**Open Questions**
=================
- Should we use the category ``name`` (slug) or ``displayName`` in URLs?
- Do we want to maintain any URL redirects from old /ai/[category] to new /[category]?
- Should the category pages have different layouts/features than the home page?

Phase 1 – Fix Category URL References
-------------------------------------
☑ Update ``components/post-card.tsx`` to use ``/${category.name}`` instead of ``/ai/${category.name}``
☑ Update ``components/post-detail.tsx`` to use same URL pattern
☑ Search and replace any other ``/ai/`` references in the codebase

Phase 2 – Create Category Page Structure
----------------------------------------
☑ Create ``app/[category]/page.tsx`` for dynamic category routes
☑ Create ``app/[category]/page-client.tsx`` for client-side logic
☑ Implement category validation (404 for invalid categories)
☑ Add category metadata (title, description) for SEO

Phase 3 – Category Page Features
--------------------------------
☑ Filter posts by selected category using existing ``PostList`` component
☑ Display category info (name, description, post count) at top
☑ Add category-specific sorting/filtering options
☑ Update navigation to highlight active category


Phase 1 – Fix Category URL References
=====================================

**Affected Files**
- ``components/post-card.tsx`` – Update category link from ``/ai/{name}`` to ``/{name}``
- ``components/post-detail.tsx`` – Update category link to match
- Any other components with ``/ai/`` references

**Summary of Changes**
1. Replace ``href={`/ai/${post.category?.name || 'general'}`}`` with ``href={`/${post.category?.name || 'general'}`}``
2. Update display text to match (remove ``/ai/`` prefix)
3. Ensure consistency across all components

**Unit Tests**
- Test that PostCard renders correct category URLs
- Test navigation to category pages works correctly


Phase 2 – Create Category Page Structure
========================================

**Affected Files**
- ``app/[category]/page.tsx`` (new) – Dynamic category page
- ``app/[category]/page-client.tsx`` (new) – Client component for category page
- ``convex/categories.ts`` – Add ``getCategoryByName`` query

**Summary of Changes**
1. Create dynamic route ``[category]`` to catch category URLs
2. Validate category exists in database, show 404 if not
3. Pass category ID to existing ``PostList`` component
4. Add proper metadata for SEO

.. code:: typescript

    // app/[category]/page.tsx
    export async function generateMetadata({ params })
    export default function CategoryPage({ params })
    
    // app/[category]/page-client.tsx  
    - Fetch category by name
    - Display category header with stats
    - Render PostList filtered by categoryId

**Unit Tests**
- Test valid category routes render correctly
- Test invalid categories return 404
- Test metadata generation for categories


Phase 3 – Category Page Features
================================

**Affected Files**
- ``components/category-header.tsx`` (new) – Category info display
- ``components/post-header.tsx`` – Update to highlight active category
- ``app/[category]/page-client.tsx`` – Integrate new components

**Summary of Changes**
1. Create category header showing name, description, post count
2. Add breadcrumb navigation (Home > Category)
3. Integrate existing PostHeader for sorting options
4. Update navigation to show active category state

**Unit Tests**
- Test category header displays correct information
- Test breadcrumb navigation works
- Test active category highlighting in navigation 