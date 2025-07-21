# Comment Vote Batching Performance Improvement

## Overview

This document describes the performance optimization implemented for fetching user votes on comments. The previous implementation made individual API calls for each comment's vote status, resulting in an N+1 query pattern. The new implementation uses a single batched query.

## Problem

### Before Optimization
- Each comment component made an individual `getUserVote` query
- For a post with 50 comments, this resulted in 51 API calls (1 for comments + 50 for votes)
- Performance degraded linearly with the number of comments

### After Optimization
- All comment IDs are collected and sent in a single `getUserVotesBatch` query
- For a post with 50 comments, this results in 2 API calls (1 for comments + 1 for all votes)
- Performance remains constant regardless of comment count

## Implementation Details

### 1. Created a Batch Vote Hook (`/hooks/use-user-votes.ts`)
```typescript
export function useUserVotes(
  targetIds: string[],
  targetType: "post" | "comment" | "resource"
) {
  const votes = useQuery(
    api.votes.getUserVotesBatch,
    targetIds.length > 0 ? { targetIds, targetType } : "skip"
  );
  
  return {
    votes: votes ?? {},
    isLoading: votes === undefined && targetIds.length > 0,
  };
}
```

### 2. Updated Comment Components

Both `comment-section.tsx` and `comment-section-flat.tsx` were updated to:
- Collect all comment IDs recursively (including nested replies)
- Use the batched vote query
- Pass vote data down as props instead of querying individually

### 3. API Endpoint (`/convex/votes.ts`)

The existing `getUserVotesBatch` function efficiently fetches all user votes in a single database query:
```typescript
export const getUserVotesBatch = query({
  args: {
    targetIds: v.array(v.string()),
    targetType: v.union(v.literal("post"), v.literal("comment"), v.literal("resource")),
  },
  handler: async (ctx, { targetIds, targetType }) => {
    // Fetches all votes for the user and filters by targetIds
    // Returns a map of targetId -> voteType
  },
});
```

## Performance Metrics

### Before Batching
- 1 post with 20 comments: **21 API calls**
- 1 post with 50 comments: **51 API calls**
- 1 post with 100 comments: **101 API calls**

### After Batching
- 1 post with 20 comments: **2 API calls** (90% reduction)
- 1 post with 50 comments: **2 API calls** (96% reduction)
- 1 post with 100 comments: **2 API calls** (98% reduction)

## Benefits

1. **Reduced Server Load**: Dramatically fewer API calls reduce database queries and server processing
2. **Improved User Experience**: Faster initial page load and smoother interactions
3. **Better Scalability**: Performance remains constant regardless of comment count
4. **Network Efficiency**: Fewer HTTP requests mean less bandwidth usage

## Testing

Test coverage includes:
- Unit tests for the `useUserVotes` hook
- Integration tests for comment sections with batched votes
- Performance tests verifying the reduction in API calls

## Future Considerations

1. **Caching**: Consider implementing client-side caching for vote states
2. **Optimistic Updates**: Already implemented for individual vote mutations
3. **Pagination**: For extremely large comment threads, consider paginating both comments and votes