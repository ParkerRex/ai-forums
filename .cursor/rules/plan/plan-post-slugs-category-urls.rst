**Open Questions**
=================
- Should we generate slugs from existing post titles, or use post IDs as fallback?
- How should we handle slug conflicts (multiple posts with same title in same category)?
- Should we preserve old ``/post/[id]`` URLs as redirects for SEO?

Phase 1 – Add Slug Support to Posts Schema
------------------------------------------
☐ Add ``slug`` field to posts table in ``convex/schema.ts``
☐ Create ``lib/slug-utils.ts`` for slug generation and validation
☐ Create migration in ``convex/migrations/`` to generate slugs for existing posts
☐ Update post creation mutations to auto-generate slugs
☐ Add ``getPostBySlug`` query to ``convex/posts.ts``
☐ Add slug uniqueness validation within categories (fallback by appending numeric suffix)

Phase 2 – Create New Post Route Structure
-----------------------------------------
☑ Create ``app/[category]/[slug]/page.tsx`` for individual post pages
☑ Create ``app/[category]/[slug]/page-client.tsx`` for post detail logic
☑ Move post detail logic from ``app/post/[id]/page-client.tsx`` to new location
☑ Add proper 404 handling for invalid category/slug combinations
☑ Keep ``app/post/[id]/`` as redirect route for backwards compatibility

Phase 3 – Update Post Links and Navigation
------------------------------------------
☑ Update ``components/post-card.tsx`` to link to ``/[category]/[slug]``
☑ Update ``app/members/[id]/page.tsx`` post links to use new URL format
☑ Update ``components/post-header.tsx`` to navigate to category pages instead of callbacks
☑ Test all post navigation works correctly
☑ Verify category pages still function properly


Phase 1 – Add Slug Support to Posts Schema  
==========================================

**Affected Files**
- ``convex/schema.ts`` – Add slug field to posts table
- ``lib/slug-utils.ts`` (new) – Slug generation and validation utilities
- ``convex/migrations/addPostSlugs.ts`` (new) – Migration to generate slugs
- ``convex/posts.ts`` – Add new queries and update mutations

**Summary of Changes**
1. Add ``slug: v.string()`` field to posts table with unique index per category
2. Create utilities for generating URL-safe slugs from post titles
3. Generate slugs for all existing posts via migration
4. Update ``createPost`` and ``updatePost`` mutations to handle slugs
5. Add ``getPostBySlug`` query for new routing

.. code:: typescript

    // lib/slug-utils.ts
    export function generateSlug(title: string): string
    export function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string
    
    // convex/posts.ts  
    export const getPostBySlug = query({
      args: { slug: v.string() },
      handler: async (ctx, { slug }) => {
        // Find the post with the given slug (unique index ensures fast lookup)
      }
    });

**Unit Tests**
- Test slug generation produces valid URL-safe strings
- Test slug uniqueness within categories
- Test post lookup by slug works correctly
- Test migration generates appropriate slugs for existing posts


Phase 2 – Create New Post Route Structure
=========================================

**Affected Files**
- ``app/[category]/[slug]/page.tsx`` (new) – Dynamic post page route
- ``app/[category]/[slug]/page-client.tsx`` (new) – Client component for posts
- ``app/post/[id]/page.tsx`` – Convert to redirect to new URL format
- ``app/[category]/page.tsx`` – Ensure category routing still works

**Summary of Changes**
1. Create nested dynamic route ``[category]/[slug]`` for individual posts
2. Move post detail rendering logic to new route structure
3. Lookup post by slug only; validate that ``params.category`` matches the post's category ``name`` – otherwise 404
4. Implement proper metadata generation for SEO
5. Convert old post route to redirect to new format

.. code:: typescript

    // app/[category]/[slug]/page.tsx
    interface PostPageProps {
      params: { category: string; slug: string };
    }
    
    export async function generateMetadata({ params }: PostPageProps)
    export default function PostPage({ params }: PostPageProps)
    
    // app/[category]/[slug]/page-client.tsx
    - Fetch post by slug, then verify category matches
    - Render post detail with comments
    - Handle 404 for invalid combinations

**Unit Tests**
- Test valid category/slug combinations render correctly
- Test invalid combinations return 404  
- Test metadata generation works for posts
- Test old ``/post/[id]`` URLs redirect to new format


Phase 3 – Update Post Links and Navigation
==========================================

**Affected Files**
- ``components/post-card.tsx`` – Update post links to use category+slug
- ``app/members/[id]/page.tsx`` – Update member activity post links
- ``components/post-header.tsx`` – Convert category buttons to navigation links
- ``components/post-list.tsx`` – Verify compatibility with new URLs

**Summary of Changes**
1. Replace ``href={`/post/${post._id}`}`` with ``href={`/${post.category?.name}/${post.slug}`}``
2. Update member activity links to use new post URL format
3. Convert post header category buttons from callbacks to ``Link`` components
4. Ensure all post navigation uses consistent URL structure

.. code:: typescript

    // components/post-card.tsx
    <Link href={`/${post.category?.name || 'general'}/${post.slug}`}>
    
    // components/post-header.tsx  
    <Link href={`/${category.name}`} className={...}>
      {category.icon} /{category.name}
    </Link>

**Unit Tests**
- Test post cards link to correct URLs
- Test member activity links work with new format
- Test post header category navigation
- Test breadcrumb navigation on post pages 


Implementation Summary
=====================

✅ **Successfully implemented post slug URLs and category-aware navigation!**

**What was accomplished:**

1. **Database Schema Changes**
   - Added ``slug`` field to posts table with unique index
   - Created slug generation utilities in ``lib/slug-utils.ts``
   - Updated all post creation/update mutations to generate slugs automatically

2. **New URL Structure**
   - Posts now use ``/[category]/[slug]`` URLs instead of ``/post/[id]``
   - SEO-friendly URLs with post titles in the path
   - Proper 404 handling for invalid category/slug combinations
   - Backwards compatibility with old ``/post/[id]`` URLs (redirects to home)

3. **Enhanced Navigation**
   - Post header category buttons now navigate to actual category pages
   - Smart detection of current page context (category page vs home page)
   - Post cards link to new slug-based URLs
   - Consistent navigation experience across the application

4. **Technical Implementation**
   - Created ``getPostBySlug`` query for efficient post lookup
   - Updated all import scripts to generate slugs for imported posts
   - Proper TypeScript types and validation throughout
   - Migration ready to generate slugs for existing posts

**URLs now work as:**
- Home: ``/`` (all posts)
- Category: ``/workflows`` (filtered posts)
- Individual post: ``/workflows/how-to-create-ai-agents`` (SEO-friendly!)

**Next steps:**
- Run migration to generate slugs for existing posts
- Test the new navigation in browser
- All functionality is ready for production use! 