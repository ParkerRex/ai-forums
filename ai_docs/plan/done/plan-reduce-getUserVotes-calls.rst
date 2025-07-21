☑ Phase 1 – Backend batch query
☑ Phase 2 – Front-end batch hook & Post list integration
☑ Phase 3 – Comment votes batching & deprecation cleanup

Open Questions (address before Phase 2)
* Should we extend batching to comments/resources in the same rollout, or ship posts first?
* Naming preference for new hook (`useUserVotes` vs `useBatchVotes`)?

..

Phase 1 – Backend batch query
Affected Files
* ``convex/votes.ts`` – add ``getUserVotesBatch`` query
* ``convex/votes.test.ts`` (new) – unit tests

Summary of Changes
* Implement a single Convex query that accepts ``targetIds: string[]`` and ``targetType`` and returns a mapping ``{ [id]: "upvote" | null }`` for the current member.
* Auth check once per call; unauthenticated ⇒ empty mapping.
* Internally query ``votes`` by ``userId`` then filter for ``targetIds`` (avoids N queries).
* Re-export via generated API.

Unit Tests
* call with authenticated user, mix of voted/unvoted ids ⇒ expect correct map
* unauthenticated context ⇒ expect empty object
* empty ``targetIds`` ⇒ immediate empty response

Phase 2 – Front-end batching for post lists
Affected Files
* ``hooks/use-user-votes.ts`` (new)
* ``components/posts/post-list.tsx`` – fetch votes once per render & pass down
* ``components/posts/post-card.tsx`` – accept optional ``userVote`` prop; only falls back to legacy query when prop === undefined
* ``components/__tests__/post-card.test.tsx`` – update/extend tests

Summary of Changes
* Create React hook that wraps the new batch query; accepts ``postIds`` array, returns vote map + loading.
* Inside ``PostList`` compute ids, call hook, pass ``votes[post._id]`` to each ``PostCard``.
* ``PostCard`` displays vote state from prop; retains legacy query for standalone usage (detail pages).
* Memoise ids array to avoid refetch churn.

Unit Tests
* Hook: render with list of ids, mock Convex client ⇒ expect single query.
* PostList: assert no per-card ``getUserVote`` queries fired (spy on client).

Phase 3 – Comment votes batching & cleanup
Affected Files
* ``hooks/use-comment-votes.ts`` (new, wrapper around same batch query with ``targetType="comment"``)
* ``components/comments/comment-section*.tsx`` – batch fetch + prop-drilling like posts
* ``components/comments/comment-actions-menu.tsx`` – consume prop
* ``components/__tests__/comment-section.test.tsx`` – update tests
* ``convex/votes.ts`` – mark ``getUserVote`` as @deprecated (doc-comment)

Summary of Changes
* Repeat pattern for comments to eliminate per-comment calls.
* Add JSDoc @deprecated tag + console.warn inside ``getUserVote`` to surface usage during dev.
* After migration, monitor invocation counts; when near-zero, schedule removal task.

Unit Tests
* Ensure comment hook mirrors post behaviour.
* Regression: voting mutations still update map correctly after optimistic updates. 