we need to make it so that anywhere a user profile is shown in our app, it links to the user's profile page.

example: on the post detail page, when a user clicks on a member's name, it should link to their profile page.

☑ **Phase 1 – Data plumbing & migration**

  *Affected files*: ``convex/schema.ts``, ``convex/members.ts``, ``convex/migrations/add_member_slug.ts``, ``lib/slug-utils.ts``
  *Summary*: make *slug* REQUIRED, back-fill existing members, and ship ``memberProfileUrl()`` helper.

  • Change schema: ``slug`` → **required** ``v.string()`` in *convex/schema.ts*.
  • Amend migration *add_member_slug.ts* → ensure every member now has a slug; delete optional check lines accordingly.
  • Update any member queries/mutations in *convex/members.ts* to always return ``slug``.
  • Add ``memberProfileUrl(member: { slug: string; _id: Id<"members"> }): string`` in *lib/slug-utils.ts* → returns ``/members/${member.slug}``.
  • Re-export helper from ``lib/utils.ts`` for convenience.

  • Unit test ``memberProfileUrl`` (new *lib/__tests__/slug-utils.test.ts*) for correct URL generation.

☑ **Phase 2 – Component linking**

  *Affected files*: ``components/member-*.tsx``, ``components/post-*.tsx``, ``components/comment-section.tsx``, ``components/global-search.tsx``
  *Summary*: wrap every rendered member avatar/name with ``next/link`` using the helper across all UI surfaces, including global search results.

  • Refactor ``MemberCard``, ``MemberHeader``, ``MemberProfile`` – replace plain ``<span>``/``<Avatar>`` wrappers with ``<Link href={memberProfileUrl(member)}>``.
  • Update post/comment surfaces (``PostHeader``, ``PostDetail``, ``PostCard``, ``CommentSection``) to use the helper for author links.
  • In ``GlobalSearch`` results, make author usernames clickable using the helper (likely via ``data-testid="author-link"``).

  • Jest unit snapshot tests per component verifying link ``href``.

☑ **Phase 3 – E2E validation**

  *Affected files*: ``playwright/theme-visual.spec.ts`` (new test block)
  *Summary*: click member name navigates to profile page.

  • Extend Playwright spec: navigate to a sample post, ``page.click('[data-testid="author-link"]')`` and assert URL contains ``/members/`` and profile header visible.

.. resolved considerations

* *slug* now mandatory; migration updated accordingly.
* ``GlobalSearch`` and any other components outside the core display list identified for updates.