**Open Questions**
=================
- Should we include *post content* in addition to titles when searching?
- Should comment *content* be indexed entirely or limited to links only?
- Do we display a snippet/preview of matched text in the result list?
- Any access-control considerations (e.g. private categories)?

Phase 1 – Backend Search API
----------------------------
☑ Add ``search_comments`` search index on ``comments.content`` in *convex/schema.ts*
☑ Create ``convex/search.ts`` with a ``globalSearch`` query

Phase 2 – Front-End Search Dialog
---------------------------------
☑ Add ``components/global-search.tsx`` implementing a 🏷️ *CommandDialog* (shadcn)
☑ Create ``hooks/use-command-k.ts`` to open/close dialog on ⌘K / Ctrl K
☑ Style results with a badge (Post | Comment | Link)

Phase 3 – Integration & Routing
-------------------------------
☑ Inject *GlobalSearch* in ``app/layout.tsx``
☑ Navigate to ``/[category]/[slug]`` (or ``/[category]/[slug]?commentId=``) on select
☑ Open external links in a new tab


Phase 1 – Backend Search API
============================

**Affected Files**
- ``convex/schema.ts`` – Add ``search_comments`` index **and** ``search_posts_content`` index on ``posts.content``
- ``convex/posts.ts`` – Extend ``searchPosts`` query to combine title + content results
- ``convex/search.ts`` (new) – Implement ``globalSearch`` query (updated logic)

**Summary of Changes**
1. Extend *comments* table definition:

   .. code:: typescript

       .searchIndex("search_comments", {
           searchField: "content",
           filterFields: ["status", "postId", "authorId"]
       })

2. Extend *posts* table definition with new content index:

   .. code:: typescript

       .searchIndex("search_posts_content", {
           searchField: "content",
           filterFields: ["categoryId", "status", "authorId"]
       })

3. New ``globalSearch`` query:

   .. code:: typescript

       export const globalSearch = query({
         args: { searchTerm: v.string(), limit: v.optional(v.number()) },
         handler: async (ctx, { searchTerm, limit = 30 }) => {
           if (!searchTerm.trim()) return [];

           const identity = await ctx.auth.getUserIdentity();
           const viewer = identity
             ? await ctx.db
                 .query("members")
                 .filter(q => q.eq(q.field("email"), identity.email))
                 .first()
             : undefined;

           const [posts, comments] = await Promise.all([
             ctx.runQuery("posts:searchPosts", { searchTerm, limit, includeContent: true }),
             ctx.db
               .query("comments")
               .withSearchIndex("search_comments", q => q.search("content", searchTerm).eq("status", "active"))
               .take(limit),
           ]);

           // Flatten links from comments
           const linkRegex = /(https?:\/\/\S+)/gi;
           const linkResults = comments.flatMap(c => {
             const links = c.content.match(linkRegex) ?? [];
             return links.map(l => ({ _id: `${c._id}:${l}`, type: "link", link: l, postId: c.postId }));
           });

           // Mark visibility for private-category content
           const mappedPosts = posts.map(p => {
             const isPrivate = p.category?.status === "private";
             const restricted = isPrivate && (!viewer || viewer.status === "free");
             return { _id: p._id, type: "post", title: p.title, highlight: p.title, restricted, slug: p.slug, categoryName: p.category?.name };
           });

           const mappedComments = comments.map(c => {
             const parentPost = posts.find(p => p._id === c.postId);
             const isPrivate = parentPost?.category?.status === "private";
             const restricted = isPrivate && (!viewer || viewer.status === "free");
             return { _id: c._id, type: "comment", content: c.content, authorId: c.authorId, postId: c.postId, restricted, slug: parentPost?.slug, categoryName: parentPost?.category?.name };
           });

           return [
             ...mappedPosts,
             ...mappedComments,
             ...linkResults,
           ].filter(r => r.type !== "link" || !r.restricted) // links not affected
            .slice(0, limit);
         },
       });

**Unit Tests**
- Verify post title **and content** search returns relevant posts
- Verify comment content search returns comment items
- Verify links within comments are extracted correctly
- Verify results for free users exclude private categories
- Verify private results are returned with ``restricted: true`` flag
- Verify highlight snippets include the search term
- Verify comment result includes author data


Phase 2 – Front-End Search Dialog
=================================

**Affected Files**
- ``components/global-search.tsx`` (new) – Dialog UI & logic
- ``hooks/use-command-k.ts`` (new) – Keyboard shortcut handling
- ``components/ui/command.tsx`` – already exists (shadcn)

**Summary of Changes**
1. *useCommandK* hook listens for ``meta+k`` or ``ctrl+k`` to toggle dialog state.
2. *GlobalSearch* component:
   - Uses ``useQuery(globalSearch)`` with debounced input
   - Displays ``CommandDialog`` & ``CommandList`` items
   - Each item shows preview:
     * **Post** – title with `<Mark>` highlight around matches.
     * **Comment** – first ~80 chars of comment with highlight + avatar + username.
     * **Link** – domain extracted from URL.
   - Each item shows badge variant: ``<Badge variant="secondary">Post</Badge>`` | ``Comment`` | ``Link``.
3. On ``onSelect`` navigate:
   - Post ➜ ``router.push(`/${categoryName}/${slug}`)``
   - Comment ➜ ``router.push(`/${categoryName}/${slug}?commentId=${id}`)``
   - Link ➜ ``window.open(link, '_blank')``
4. If ``restricted`` flag is true:
   * Item is greyed-out, shows 🔒 ``<Badge variant="destructive">Private</Badge>``
   * On select → opens ``MembershipCTAModal`` instead of navigation
   * Tooltip explains membership requirement

**Unit Tests**
- Dialog opens via ⌘K
- Typing triggers query debounce & shows results
- Selecting an item routes correctly
- Highlight component wraps matching substring
- Badges render per type
- Restricted items open CTA modal not navigation
- Selecting a Post navigates to slug URL (`/[category]/[slug]`)
- Selecting Comment navigates with `commentId` param


Phase 3 – Integration & Routing
===============================

**Affected Files**
- ``app/layout.tsx`` – Wrap app with *GlobalSearchProvider*
- ``components/post-detail.tsx`` – Scroll to ``commentId`` if present (optional)

**Summary of Changes**
1. Provide context to render *GlobalSearch* and manage state globally.
2. Enhance *PostDetail* to auto-scroll when ``commentId`` query param present.

**Unit Tests**
- End-to-end: search & navigate to comment scrolls into view

**Additional Considerations**
============================
- **Content Leak Prevention** – For restricted items, *do not* send full ``content``/``title`` preview to free viewers. Instead send placeholder text (e.g. "Hidden content – join to view"). Adjust API accordingly.
- **Keyboard Navigation** – Ensure up/down arrow, ⏎ select, and Esc close behaviors in dialog.
- **Search Debounce & Abort** – Cancel stale requests on rapid input.
- **Duplicate Link Deduping** – De-duplicate identical link results originating from multiple comments.
- **Accessibility** – Provide ARIA roles on CommandDialog, ensure badges have accessible labels.
- **XSS Safety** – Highlight markup uses ``<Mark>`` with ``dangerouslySetInnerHTML`` avoided. 