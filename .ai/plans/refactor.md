# Codebase Refactoring Specification

> **Status:** Draft
> **Created:** 2026-01-01
> **Last Updated:** 2026-01-01
> **Context:** Post-migration from Convex to PostgreSQL + Drizzle + React Query

---

## Executive Summary

This document outlines refactoring opportunities identified during the Convex-to-Drizzle migration. The codebase is functional but has accumulated technical debt that impacts maintainability, performance, and developer experience.

**Key Themes:**
- Type duplication and inconsistency
- Missing abstraction layers (API client, repositories)
- Duplicated patterns (auth checks, optimistic updates, fetch logic)
- No testing infrastructure
- Performance optimization opportunities

---

## Table of Contents

1. [Architecture & Structure](#1-architecture--structure)
2. [Code Quality](#2-code-quality)
3. [Performance](#3-performance)
4. [Security & Auth](#4-security--auth)
5. [Database & Data Layer](#5-database--data-layer)
6. [UI/UX Components](#6-uiux-components)
7. [Testing & Quality](#7-testing--quality)
8. [DevEx & Maintenance](#8-devex--maintenance)
9. [Implementation Priority](#9-implementation-priority)
10. [Migration Strategy](#10-migration-strategy)

---

## 1. Architecture & Structure

### 1.1 Centralize Type Definitions

**Problem:**
The same types are defined multiple times across different files:
- `Post` type exists in `hooks/use-posts.ts`, `components/posts/post-card.tsx`, `components/posts/post-detail.tsx`
- `Member` type exists in `hooks/use-members.ts`, `components/members/member-profile.tsx`, `components/members/member-card.tsx`

This leads to:
- Drift between definitions
- Tedious updates when schema changes
- Type errors at component boundaries

**Solution:**
Create a centralized `types/` directory:

```
types/
├── post.ts          # Post, CreatePostInput, UpdatePostInput
├── member.ts        # Member, MemberProfile, UpdateMemberInput
├── comment.ts       # Comment, CreateCommentInput
├── category.ts      # Category
├── notification.ts  # Notification
├── api.ts           # ApiResponse<T>, PaginatedResponse<T>, ApiError
├── auth.ts          # User, Session, AuthState
└── index.ts         # Re-exports all types
```

**Example Implementation:**

```typescript
// types/post.ts
export type PostStatus = "active" | "deleted" | "hidden" | "archived";
export type PostType = "text" | "image" | "video" | "link" | "poll";

export interface PostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  avatarUrl: string | null;
  username?: string;
}

export interface PostCategory {
  id: string;
  name: string;
  displayName: string;
  icon: string | null;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  slug: string;
  preview: string | null;
  type: PostType;
  status: PostStatus;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  editedAt?: string | null;
  memberId: string;
  categoryId: string;
  isPinned?: boolean;
  pinScope?: "category" | "global" | "both";
  isLocked?: boolean;
  // ... media fields
  member: PostAuthor;
  category: PostCategory;
}

export interface CreatePostInput {
  title: string;
  content: string;
  categoryId: string;
  type?: PostType;
  // ...
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  categoryId?: string;
  // ...
}
```

**Files to Update:**
- `hooks/use-posts.ts` - Import from `@/types`
- `hooks/use-members.ts` - Import from `@/types`
- `components/posts/*.tsx` - Import from `@/types`
- `components/members/*.tsx` - Import from `@/types`
- All API routes - Import from `@/types`

---

### 1.2 Standardize API Response Format

**Problem:**
API responses are inconsistent:
- Some return `{ items: T[] }`
- Some return `T[]` directly
- Some return `{ data: T }`
- Pagination varies between `nextCursor`, `hasMore`, `total`

**Solution:**
Define standard response types:

```typescript
// types/api.ts
export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiMeta {
  cursor?: string;
  hasMore?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}
```

**Migration Path:**
1. Define response types
2. Create response helpers in `lib/api-utils.ts`
3. Update API routes incrementally
4. Update frontend hooks to match

---

### 1.3 Feature-Based Hook Organization

**Problem:**
All hooks are flat in `/hooks`, making it hard to find related functionality:
```
hooks/
├── use-posts.ts
├── use-members.ts
├── use-comments.ts
├── use-user-votes.ts
├── use-bookmarks.ts
├── use-categories.ts
├── use-notifications.ts
├── use-current-member.ts
├── use-admin.ts
├── use-events.ts
├── use-polls.ts
├── use-resources.ts
├── use-topics.ts
└── ... (13+ files)
```

**Solution:**
Organize by feature domain:

```
hooks/
├── posts/
│   ├── use-posts.ts
│   ├── use-post-votes.ts
│   ├── use-post-history.ts
│   └── index.ts
├── members/
│   ├── use-members.ts
│   ├── use-current-member.ts
│   ├── use-member-posts.ts
│   └── index.ts
├── comments/
│   ├── use-comments.ts
│   ├── use-comment-votes.ts
│   └── index.ts
├── common/
│   ├── use-bookmarks.ts
│   ├── use-notifications.ts
│   └── index.ts
└── index.ts  # Re-exports for backwards compatibility
```

**Note:** This is a lower-priority change. Maintain backwards compatibility via re-exports.

---

## 2. Code Quality

### 2.1 Create Shared API Client

**Problem:**
Every hook file duplicates fetch logic:

```typescript
// hooks/use-posts.ts
async function fetchPosts(params) {
  const searchParams = new URLSearchParams();
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  // ... more params
  const response = await fetch(`/api/posts?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to fetch posts");
  }
  return response.json();
}

// hooks/use-members.ts
async function fetchMembers(options) {
  const searchParams = new URLSearchParams();
  if (options?.limit) searchParams.set("limit", options.limit.toString());
  // ... same pattern repeated
  const response = await fetch(`/api/members?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to fetch members");
  }
  return response.json();
}
```

**Solution:**
Create a centralized API client:

```typescript
// lib/api-client.ts
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
    }
  ): Promise<T> {
    const url = new URL(path, this.baseUrl || window.location.origin);

    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: options?.body ? { "Content-Type": "application/json" } : undefined,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.error || `Request failed: ${response.status}`,
        response.status,
        error.code
      );
    }

    return response.json();
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>("GET", path, { params });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, { body });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, { body });
  }

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = new ApiClient();
```

**Usage After Refactor:**

```typescript
// hooks/use-posts.ts
import { api } from "@/lib/api-client";
import type { Post, PaginatedResponse } from "@/types";

async function fetchPosts(params: PostQueryParams): Promise<PaginatedResponse<Post>> {
  return api.get("/api/posts", params);
}
```

---

### 2.2 Extract Optimistic Update Hook

**Problem:**
`post-card.tsx` and `post-detail.tsx` have nearly identical optimistic voting logic:

```typescript
// Both files have this pattern:
const [optimisticNetVotes, setOptimisticNetVotes] = useState(post.netVotes);
const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(null);

const handleUpvote = async (e: React.MouseEvent) => {
  e.stopPropagation();
  if (isVoting) return;
  setIsVoting(true);

  const voteType = currentUserVote === "upvote" ? "remove" : "upvote";

  // Calculate optimistic state
  let newNetVotes = optimisticNetVotes;
  let newUserVote: string | null = null;

  if (voteType === "upvote") {
    newNetVotes = optimisticNetVotes + 1;
    newUserVote = "upvote";
  } else {
    newNetVotes = optimisticNetVotes - 1;
    newUserVote = null;
  }

  setOptimisticNetVotes(newNetVotes);
  setOptimisticUserVote(newUserVote);

  try {
    const result = await voteOnPost.mutateAsync({ postId, voteType });
    setOptimisticNetVotes(result.netVotes);
    setOptimisticUserVote(result.newVoteType);
  } catch (error) {
    // Rollback
    setOptimisticNetVotes(post.netVotes);
    setOptimisticUserVote(actualUserVote || null);
  } finally {
    setIsVoting(false);
  }
};
```

**Solution:**
Extract to a reusable hook:

```typescript
// hooks/common/use-optimistic-vote.ts
import { useState, useCallback } from "react";
import { useVoteOnPost } from "@/hooks/use-posts";

type VoteType = "upvote" | "downvote" | "remove";

interface UseOptimisticVoteOptions {
  targetId: string;
  targetType: "post" | "comment" | "resource";
  initialNetVotes: number;
  initialUserVote: string | null;
  onError?: (error: Error) => void;
}

export function useOptimisticVote({
  targetId,
  targetType,
  initialNetVotes,
  initialUserVote,
  onError,
}: UseOptimisticVoteOptions) {
  const [netVotes, setNetVotes] = useState(initialNetVotes);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);

  const voteMutation = useVoteOnPost(); // or generic vote mutation

  const vote = useCallback(async (voteType: VoteType) => {
    if (isVoting) return;

    setIsVoting(true);

    // Store previous state for rollback
    const prevNetVotes = netVotes;
    const prevUserVote = userVote;

    // Optimistic update
    const delta = voteType === "upvote" ? 1 : voteType === "downvote" ? -1 : 0;
    const wasVoted = userVote === voteType.replace("remove", "");

    if (voteType === "remove") {
      setNetVotes(prev => prev - (userVote === "upvote" ? 1 : -1));
      setUserVote(null);
    } else {
      const adjustment = userVote ? (userVote === "upvote" ? -1 : 1) : 0;
      setNetVotes(prev => prev + delta + adjustment);
      setUserVote(voteType);
    }

    try {
      const result = await voteMutation.mutateAsync({
        postId: targetId,
        voteType,
      });
      setNetVotes(result.netVotes);
      setUserVote(result.newVoteType);
    } catch (error) {
      // Rollback on error
      setNetVotes(prevNetVotes);
      setUserVote(prevUserVote);
      onError?.(error as Error);
    } finally {
      setIsVoting(false);
    }
  }, [targetId, netVotes, userVote, isVoting, voteMutation, onError]);

  const upvote = useCallback(() => {
    vote(userVote === "upvote" ? "remove" : "upvote");
  }, [vote, userVote]);

  const downvote = useCallback(() => {
    vote(userVote === "downvote" ? "remove" : "downvote");
  }, [vote, userVote]);

  return {
    netVotes,
    userVote,
    isVoting,
    upvote,
    downvote,
    vote,
  };
}
```

---

### 2.3 Create Constants for Magic Strings

**Problem:**
Status values, tier names, vote types are scattered as string literals:

```typescript
// Scattered throughout codebase
status: "active" | "deleted" | "hidden" | "archived"
voteType: "upvote" | "downvote" | "remove"
tier: "founding_member" | "early_bird" | "member" | "scholarship"
```

**Solution:**
Create centralized constants:

```typescript
// lib/constants.ts
export const POST_STATUS = {
  ACTIVE: "active",
  DELETED: "deleted",
  HIDDEN: "hidden",
  ARCHIVED: "archived",
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

export const MEMBER_STATUS = {
  ACTIVE: "active",
  CHURNED: "churned",
  FREE: "free",
} as const;

export type MemberStatus = (typeof MEMBER_STATUS)[keyof typeof MEMBER_STATUS];

export const MEMBER_TIER = {
  FREE: "free",
  SCHOLARSHIP: "scholarship",
  MEMBER: "member",
  EARLY_BIRD: "early_bird",
  FOUNDING_MEMBER: "founding_member",
} as const;

export type MemberTier = (typeof MEMBER_TIER)[keyof typeof MEMBER_TIER];

export const VOTE_TYPE = {
  UPVOTE: "upvote",
  DOWNVOTE: "downvote",
  REMOVE: "remove",
} as const;

export type VoteType = (typeof VOTE_TYPE)[keyof typeof VOTE_TYPE];

export const POST_TYPE = {
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  LINK: "link",
  POLL: "poll",
} as const;

export type PostType = (typeof POST_TYPE)[keyof typeof POST_TYPE];

// Tier display names and colors
export const TIER_CONFIG = {
  [MEMBER_TIER.FOUNDING_MEMBER]: {
    label: "Founding Member",
    color: "gold",
    priority: 5,
  },
  [MEMBER_TIER.EARLY_BIRD]: {
    label: "Early Bird",
    color: "blue",
    priority: 4,
  },
  // ...
} as const;
```

---

### 2.4 Standardize Null/Undefined Handling

**Problem:**
Inconsistent use of `null` vs `undefined`:
- Database fields use `null`
- Optional TypeScript fields use `undefined`
- Requires `?? undefined` conversions everywhere

**Solution:**
Establish conventions:
- Database values: Use `null` (matches Drizzle/PostgreSQL)
- Optional function parameters: Use `undefined`
- Create utility functions for conversions when needed

```typescript
// lib/utils.ts
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

export function undefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}
```

---

## 3. Performance

### 3.1 Implement Query Key Factory

**Problem:**
Query keys are manually constructed strings, leading to:
- Typos causing cache misses
- Inconsistent invalidation
- Hard to track dependencies

```typescript
// Current state - scattered and error-prone
queryKey: ["posts", options]
queryKey: ["posts", postId]
queryKey: ["posts", "bySlug", slug]
queryKey: ["userVote", postId]
queryKey: ["userVotes", targetType, targetIds]
```

**Solution:**
Create a query key factory:

```typescript
// lib/query-keys.ts
export const queryKeys = {
  posts: {
    all: ["posts"] as const,
    lists: () => [...queryKeys.posts.all, "list"] as const,
    list: (filters: { categoryId?: string; sortBy?: string }) =>
      [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
    bySlug: (slug: string) => [...queryKeys.posts.all, "bySlug", slug] as const,
    history: (id: string) => [...queryKeys.posts.detail(id), "history"] as const,
    voters: (id: string) => [...queryKeys.posts.detail(id), "voters"] as const,
  },

  members: {
    all: ["members"] as const,
    lists: () => [...queryKeys.members.all, "list"] as const,
    list: (filters?: { search?: string; status?: string }) =>
      [...queryKeys.members.lists(), filters] as const,
    details: () => [...queryKeys.members.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.members.details(), id] as const,
    online: () => [...queryKeys.members.all, "online"] as const,
    posts: (id: string) => [...queryKeys.members.detail(id), "posts"] as const,
    activity: (id: string) => [...queryKeys.members.detail(id), "activity"] as const,
  },

  comments: {
    all: ["comments"] as const,
    byPost: (postId: string) => [...queryKeys.comments.all, "post", postId] as const,
  },

  votes: {
    all: ["votes"] as const,
    user: (targetType: string, targetId: string) =>
      [...queryKeys.votes.all, "user", targetType, targetId] as const,
    batch: (targetType: string, targetIds: string[]) =>
      [...queryKeys.votes.all, "batch", targetType, targetIds] as const,
  },

  bookmarks: {
    all: ["bookmarks"] as const,
    list: () => [...queryKeys.bookmarks.all, "list"] as const,
  },

  categories: {
    all: ["categories"] as const,
    list: () => [...queryKeys.categories.all, "list"] as const,
    detail: (id: string) => [...queryKeys.categories.all, "detail", id] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    list: () => [...queryKeys.notifications.all, "list"] as const,
    unreadCount: () => [...queryKeys.notifications.all, "unread"] as const,
  },

  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },
} as const;
```

**Usage:**

```typescript
// hooks/use-posts.ts
import { queryKeys } from "@/lib/query-keys";

export function usePosts(options?: PostQueryOptions) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.list(options),
    queryFn: ({ pageParam }) => fetchPosts({ ...options, cursor: pageParam }),
    // ...
  });
}

// Invalidation becomes type-safe and predictable
queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
```

---

### 3.2 Configure React Query Defaults

**Problem:**
No global configuration for React Query, leading to:
- No consistent stale time
- Default retry behavior may not fit all queries
- No global error handling

**Solution:**
Configure QueryClient with sensible defaults:

```typescript
// lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        refetchOnWindowFocus: false, // Disable for better UX
      },
      mutations: {
        retry: false, // Don't retry mutations by default
        onError: (error) => {
          // Global mutation error handling
          console.error("Mutation error:", error);
        },
      },
    },
  });
}
```

---

### 3.3 Server Components & Streaming

**Problem:**
All data fetching is client-side. For Next.js 15, this misses opportunities for:
- Server-side rendering with streaming
- Reduced client JavaScript
- Better SEO
- Faster initial page loads

**Solution:**
Identify pages that can benefit from server components:

```typescript
// app/[category]/[slug]/page.tsx - Server Component
import { Suspense } from "react";
import { PostDetail } from "./post-detail";
import { CommentSection } from "./comment-section";
import { PostDetailSkeleton, CommentsSkeleton } from "./skeletons";

// Fetch post data on server
async function getPost(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/posts?slug=${slug}`, {
    next: { revalidate: 60 }, // ISR
  });
  return res.json();
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);

  return (
    <div>
      {/* Post loads immediately */}
      <PostDetail post={post} />

      {/* Comments stream in */}
      <Suspense fallback={<CommentsSkeleton />}>
        <CommentSection postId={post.id} />
      </Suspense>
    </div>
  );
}
```

**Candidates for Server Components:**
- Post detail pages
- Member profile pages
- Blog pages (already static)
- Category pages (initial load)

---

## 4. Security & Auth

### 4.1 Create Auth Middleware for API Routes

**Problem:**
Every protected API route duplicates auth checking:

```typescript
// Repeated in every route
export async function GET(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... actual logic
}
```

**Solution:**
Create composable route handlers:

```typescript
// lib/api/middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import type { Member } from "@/types";

type RouteContext = { params: Promise<Record<string, string>> };

type AuthenticatedHandler = (
  request: NextRequest,
  context: RouteContext,
  member: Member
) => Promise<NextResponse>;

type AdminHandler = (
  request: NextRequest,
  context: RouteContext,
  member: Member
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: RouteContext) => {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, context, member);
  };
}

export function withAdmin(handler: AdminHandler) {
  return async (request: NextRequest, context: RouteContext) => {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, context, member);
  };
}

export function withOptionalAuth<T>(
  handler: (
    request: NextRequest,
    context: RouteContext,
    member: Member | null
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: RouteContext) => {
    const member = await getCurrentMember();
    return handler(request, context, member);
  };
}
```

**Usage:**

```typescript
// app/api/posts/route.ts
import { withAuth, withOptionalAuth } from "@/lib/api/middleware";

// Public route with optional auth
export const GET = withOptionalAuth(async (request, context, member) => {
  const posts = await fetchPosts(/* member for personalization */);
  return NextResponse.json(posts);
});

// Protected route
export const POST = withAuth(async (request, context, member) => {
  const data = await request.json();
  const post = await createPost(data, member.id);
  return NextResponse.json(post);
});
```

---

### 4.2 Add Rate Limiting

**Problem:**
No rate limiting on API routes makes them vulnerable to abuse.

**Solution:**
Implement rate limiting using Upstash Redis:

```typescript
// lib/api/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limits for different operations
export const rateLimits = {
  default: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
  }),

  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
  }),

  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  }),
};

export async function checkRateLimit(
  identifier: string,
  type: keyof typeof rateLimits = "default"
) {
  const { success, limit, remaining, reset } = await rateLimits[type].limit(identifier);

  return {
    success,
    headers: {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    },
  };
}
```

---

## 5. Database & Data Layer

### 5.1 Implement Repository Pattern

**Problem:**
Database queries are directly in API routes, mixing HTTP concerns with data access:

```typescript
// app/api/posts/route.ts
export async function GET(request: NextRequest) {
  // URL parsing mixed with database queries
  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get("categoryId");

  // Direct Drizzle query in route handler
  const result = await db
    .select({ /* ... */ })
    .from(posts)
    .innerJoin(members, eq(posts.memberId, members.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(limit + 1);

  // Response formatting
  return NextResponse.json({ items: result, nextCursor });
}
```

**Solution:**
Create repository layer:

```typescript
// lib/repositories/post-repository.ts
import { db } from "@/db";
import { posts, members, categories } from "@/db/schema";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import type { Post, CreatePostInput, UpdatePostInput } from "@/types";

export interface PostQueryOptions {
  categoryId?: string;
  sortBy?: "recent" | "popular";
  cursor?: string;
  limit?: number;
  status?: string;
}

export const postRepository = {
  async findMany(options: PostQueryOptions = {}): Promise<{
    items: Post[];
    nextCursor: string | null;
  }> {
    const { categoryId, sortBy = "recent", cursor, limit = 20, status = "active" } = options;

    const conditions = [eq(posts.status, status)];
    if (categoryId) conditions.push(eq(posts.categoryId, categoryId));
    if (cursor) conditions.push(lt(posts.createdAt, new Date(cursor)));

    const result = await db
      .select({
        id: posts.id,
        title: posts.title,
        // ... all fields
      })
      .from(posts)
      .innerJoin(members, eq(posts.memberId, members.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(sortBy === "popular" ? desc(posts.netVotes) : desc(posts.createdAt))
      .limit(limit + 1);

    const hasMore = result.length > limit;
    const items = hasMore ? result.slice(0, -1) : result;
    const nextCursor = hasMore ? items[items.length - 1].createdAt : null;

    return { items, nextCursor };
  },

  async findById(id: string): Promise<Post | null> {
    const result = await db
      .select()
      .from(posts)
      .innerJoin(members, eq(posts.memberId, members.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.id, id))
      .limit(1);

    return result[0] ?? null;
  },

  async findBySlug(slug: string): Promise<Post | null> {
    const result = await db
      .select()
      .from(posts)
      .innerJoin(members, eq(posts.memberId, members.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.slug, slug))
      .limit(1);

    return result[0] ?? null;
  },

  async create(data: CreatePostInput, memberId: string): Promise<Post> {
    const slug = generateSlug(data.title);

    const [post] = await db
      .insert(posts)
      .values({
        ...data,
        slug,
        memberId,
        status: "active",
      })
      .returning();

    return this.findById(post.id)!;
  },

  async update(id: string, data: UpdatePostInput): Promise<Post> {
    await db
      .update(posts)
      .set({
        ...data,
        editedAt: new Date(),
      })
      .where(eq(posts.id, id));

    return this.findById(id)!;
  },

  async delete(id: string): Promise<void> {
    await db
      .update(posts)
      .set({ status: "deleted" })
      .where(eq(posts.id, id));
  },

  async incrementViewCount(id: string): Promise<void> {
    await db
      .update(posts)
      .set({ viewCount: sql`${posts.viewCount} + 1` })
      .where(eq(posts.id, id));
  },
};
```

**Usage in Routes:**

```typescript
// app/api/posts/route.ts
import { postRepository } from "@/lib/repositories/post-repository";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const result = await postRepository.findMany({
    categoryId: searchParams.get("categoryId") ?? undefined,
    sortBy: searchParams.get("sortBy") as "recent" | "popular" ?? "recent",
    cursor: searchParams.get("cursor") ?? undefined,
    limit: Number(searchParams.get("limit")) || 20,
  });

  return NextResponse.json(result);
}
```

---

### 5.2 Add Transaction Support

**Problem:**
Complex operations aren't wrapped in transactions:

```typescript
// Creating a post with attachments and poll - not atomic
const post = await db.insert(posts).values(postData).returning();
await db.insert(attachments).values(attachmentData);
await db.insert(pollOptions).values(pollData);
// If pollOptions insert fails, post and attachments are orphaned
```

**Solution:**
Use Drizzle transactions:

```typescript
// lib/repositories/post-repository.ts
async createWithAttachments(
  data: CreatePostInput,
  memberId: string
): Promise<Post> {
  return db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({ ...data, memberId })
      .returning();

    if (data.attachments?.length) {
      await tx.insert(attachments).values(
        data.attachments.map((a, i) => ({
          ...a,
          postId: post.id,
          order: i,
        }))
      );
    }

    if (data.pollOptions?.length) {
      await tx.insert(pollOptions).values(
        data.pollOptions.map((text, i) => ({
          postId: post.id,
          text,
          order: i,
        }))
      );
    }

    return post;
  });
}
```

---

## 6. UI/UX Components

### 6.1 Split Large Component Files

**Problem:**
Several component files exceed 500 lines with mixed concerns:
- `post-detail.tsx` - 600+ lines
- `comment-section.tsx` - 700+ lines
- `member-profile.tsx` - 400+ lines

**Solution:**
Break into focused sub-components:

```
components/posts/
├── post-detail/
│   ├── index.tsx           # Main export
│   ├── PostDetail.tsx      # Orchestrator component
│   ├── PostHeader.tsx      # Title, author, timestamp
│   ├── PostContent.tsx     # Body, media, attachments
│   ├── PostActions.tsx     # Vote, bookmark, share buttons
│   ├── PostMeta.tsx        # View count, edit history
│   ├── PostPoll.tsx        # Poll display and voting
│   └── types.ts            # Component-specific types

components/comments/
├── comment-section/
│   ├── index.tsx
│   ├── CommentSection.tsx  # Main orchestrator
│   ├── CommentList.tsx     # List of comments
│   ├── CommentItem.tsx     # Single comment
│   ├── CommentInput.tsx    # New comment form
│   ├── CommentActions.tsx  # Vote, reply, edit, delete
│   ├── CommentThread.tsx   # Threaded replies
│   └── hooks.ts            # useCommentSection, useCommentVoting
```

---

### 6.2 Standardize Form Handling

**Problem:**
Inconsistent form handling:
- Some use react-hook-form
- Others use manual useState
- Validation logic varies

**Solution:**
Standardize on react-hook-form + zod:

```typescript
// lib/schemas/post.ts
import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
  categoryId: z.string().min(1, "Category is required"),
  type: z.enum(["text", "image", "video", "link", "poll"]).default("text"),
  attachments: z.array(z.object({
    type: z.enum(["image", "video", "pdf", "youtube"]),
    url: z.string().url(),
    // ...
  })).optional(),
});

export type CreatePostSchema = z.infer<typeof createPostSchema>;
```

```typescript
// components/posts/post-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPostSchema, type CreatePostSchema } from "@/lib/schemas/post";

export function PostForm({ onSubmit }: PostFormProps) {
  const form = useForm<CreatePostSchema>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "text",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* ... */}
      </form>
    </Form>
  );
}
```

---

## 7. Testing & Quality

### 7.1 Add Testing Infrastructure

**Problem:**
No test files exist despite Bun test runner being configured.

**Solution:**
Add tests incrementally, starting with critical paths:

```
__tests__/
├── api/
│   ├── posts.test.ts
│   ├── members.test.ts
│   └── auth.test.ts
├── hooks/
│   ├── use-posts.test.ts
│   └── use-optimistic-vote.test.ts
├── repositories/
│   ├── post-repository.test.ts
│   └── member-repository.test.ts
└── utils/
    ├── api-client.test.ts
    └── query-keys.test.ts
```

**Example Test:**

```typescript
// __tests__/repositories/post-repository.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { postRepository } from "@/lib/repositories/post-repository";
import { db } from "@/db";
import { posts, members, categories } from "@/db/schema";

describe("postRepository", () => {
  beforeEach(async () => {
    // Setup test data
    await db.delete(posts);
    await db.insert(posts).values([
      { id: "1", title: "Test Post", /* ... */ },
    ]);
  });

  test("findMany returns paginated posts", async () => {
    const result = await postRepository.findMany({ limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Test Post");
    expect(result.nextCursor).toBeNull();
  });

  test("findById returns post or null", async () => {
    const found = await postRepository.findById("1");
    expect(found?.title).toBe("Test Post");

    const notFound = await postRepository.findById("nonexistent");
    expect(notFound).toBeNull();
  });
});
```

---

### 7.2 Add Error Boundaries

**Problem:**
No error boundaries for graceful failure handling.

**Solution:**
Create error boundaries at multiple levels:

```typescript
// components/error-boundary.tsx
"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground">
            {this.state.error?.message}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 8. DevEx & Maintenance

### 8.1 Validate Environment Variables

**Problem:**
Environment variables accessed directly without validation:

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
// Fails silently with empty string
```

**Solution:**
Validate at startup:

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_MEMBER_MONTHLY_PRICE_ID: z.string().startsWith("price_"),
  STRIPE_MEMBER_YEARLY_PRICE_ID: z.string().startsWith("price_"),

  // Storage
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET_NAME: z.string(),
  R2_ENDPOINT: z.string().url(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Optional
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.format());
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

export const env = validateEnv();
```

**Usage:**

```typescript
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});
```

---

### 8.2 Implement Structured Logging

**Problem:**
Using `console.error` directly without context:

```typescript
catch (error) {
  console.error("Error:", error);
  // No context, no level, hard to search
}
```

**Solution:**
Implement structured logging:

```typescript
// lib/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  child(context: LogContext) {
    const child = new Logger();
    child.context = { ...this.context, ...context };
    return child;
  }

  private log(level: LogLevel, message: string, data?: LogContext) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };

    if (process.env.NODE_ENV === "production") {
      // Send to logging service (Axiom, Logtail, etc.)
      console[level](JSON.stringify(entry));
    } else {
      console[level](message, { ...this.context, ...data });
    }
  }

  debug(message: string, data?: LogContext) {
    this.log("debug", message, data);
  }

  info(message: string, data?: LogContext) {
    this.log("info", message, data);
  }

  warn(message: string, data?: LogContext) {
    this.log("warn", message, data);
  }

  error(message: string, error?: Error, data?: LogContext) {
    this.log("error", message, {
      ...data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }
}

export const logger = new Logger();
```

**Usage:**

```typescript
const log = logger.child({ route: "/api/posts", method: "POST" });

try {
  const post = await postRepository.create(data, member.id);
  log.info("Post created", { postId: post.id });
  return NextResponse.json(post);
} catch (error) {
  log.error("Failed to create post", error as Error, { memberId: member.id });
  return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
}
```

---

### 8.3 Remove Dead Code

**Problem:**
Convex dependencies and migration scripts still exist:
- `scripts/` folder with Convex imports
- `@clerk/*` packages in dependencies (unused)
- Potentially other dead code

**Solution:**
1. Remove unused dependencies:
```bash
bun remove convex @clerk/nextjs @clerk/clerk-react
```

2. Run dead code detection:
```bash
bunx knip
```

3. Remove or archive migration scripts

---

## 9. Implementation Priority

### Tier 1: High Impact, Lower Effort (Do First)
| Item | Effort | Impact | Dependencies |
|------|--------|--------|--------------|
| 1.1 Centralize Types | 2-3 days | High | None |
| 2.1 API Client | 1-2 days | High | None |
| 3.1 Query Key Factory | 1 day | High | None |
| 4.1 Auth Middleware | 1 day | High | None |
| 8.1 Env Validation | 0.5 day | High | None |

### Tier 2: High Impact, Higher Effort
| Item | Effort | Impact | Dependencies |
|------|--------|--------|--------------|
| 5.1 Repository Pattern | 3-4 days | High | 1.1 |
| 6.1 Split Components | 2-3 days | Medium | None |
| 7.1 Add Tests | 3-5 days | High | 5.1 |
| 1.2 Standardize Responses | 2 days | Medium | 2.1 |

### Tier 3: Medium Priority
| Item | Effort | Impact | Dependencies |
|------|--------|--------|--------------|
| 2.3 Constants/Enums | 1 day | Medium | None |
| 2.2 Optimistic Vote Hook | 1 day | Medium | None |
| 6.2 Form Standardization | 2 days | Medium | None |
| 3.2 Query Defaults | 0.5 day | Medium | 3.1 |

### Tier 4: Lower Priority (Nice to Have)
| Item | Effort | Impact | Dependencies |
|------|--------|--------|--------------|
| 1.3 Feature-Based Hooks | 1-2 days | Low | 1.1 |
| 3.3 Server Components | 3-4 days | Medium | 5.1 |
| 4.2 Rate Limiting | 1 day | Medium | None |
| 8.2 Structured Logging | 1-2 days | Medium | None |

---

## 10. Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Create `types/` directory with centralized types
2. Create `lib/api-client.ts`
3. Create `lib/query-keys.ts`
4. Create `lib/env.ts` with validation
5. Update one hook file as proof of concept

### Phase 2: API Layer (Week 3-4)
1. Create auth middleware
2. Create first repository (`postRepository`)
3. Update post-related API routes
4. Add transactions for complex operations

### Phase 3: Hooks & Components (Week 5-6)
1. Update all hooks to use query keys factory
2. Update all hooks to use API client
3. Extract optimistic update hook
4. Split largest component files

### Phase 4: Quality & Polish (Week 7-8)
1. Add test infrastructure
2. Write tests for repositories
3. Write tests for critical hooks
4. Add error boundaries
5. Remove dead code and unused dependencies

### Backwards Compatibility
- Use re-exports to maintain existing import paths
- Deprecate old patterns with console warnings
- Update documentation as changes land

---

## Appendix: File Inventory

### Files to Create
```
types/
├── post.ts
├── member.ts
├── comment.ts
├── category.ts
├── notification.ts
├── api.ts
├── auth.ts
└── index.ts

lib/
├── api-client.ts
├── query-keys.ts
├── constants.ts
├── env.ts
├── logger.ts
├── api/
│   ├── middleware.ts
│   └── rate-limit.ts
└── repositories/
    ├── post-repository.ts
    ├── member-repository.ts
    ├── comment-repository.ts
    └── index.ts

__tests__/
├── api/
├── hooks/
├── repositories/
└── utils/
```

### Files to Modify
- All files in `hooks/` - update imports, use query keys
- All files in `app/api/` - use middleware, repositories
- Large component files - split into smaller pieces
- `components/providers/query-provider.tsx` - add defaults

### Files to Delete
- `scripts/` (archive or remove Convex migration scripts)
- Unused Convex-related files
- Dead component files

---

## References

- [TanStack Query Best Practices](https://tanstack.com/query/latest/docs/framework/react/guides/best-practices)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Next.js App Router Patterns](https://nextjs.org/docs/app)
- [Zod Schema Validation](https://zod.dev/)
