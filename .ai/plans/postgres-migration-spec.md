# Specification: Convex to PostgreSQL Migration

## Summary

Migrate the vai-skool-clone application from Convex backend to PostgreSQL with Drizzle ORM, replacing Clerk authentication with custom email/password auth, and implementing real-time features via WebSockets.

---

## Current Architecture

| Component | Technology |
|-----------|------------|
| Database | Convex (real-time serverless) |
| Auth | Clerk (integrated with Convex) |
| API | Convex queries/mutations/actions |
| Real-time | Convex automatic subscriptions |
| Background Jobs | Convex crons |

### Database Schema (16 Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `members` | User profiles | firstName, lastName, email, externalId (Clerk), status, role, metrics |
| `categories` | Post organization | name, displayName, status, postCount |
| `posts` | Main content | title, content, slug, memberId, categoryId, votes, attachments |
| `comments` | Threaded discussions | content, postId, memberId, parentCommentId, depth, votes |
| `votes` | Upvote/downvote tracking | userId, targetId, targetType, voteType |
| `postViews` | Analytics | postId, userId, viewedAt, ipAddress |
| `postVersions` | Edit history | postId, version, content, editorId |
| `bookmarks` | Personal curation | memberId, targetId, targetType, tags |
| `notifications` | User alerts | recipientId, type, entityId, actorId, read |
| `topics` | Resource classification | name, displayName, resourceCount |
| `resources` | Educational content | title, url, topicId, type, difficulty, votes |
| `pollVotes` | Poll participation | pollId, userId, optionId |
| `commentReports` | Moderation | commentId, reporterId, reason, status |
| `events` | Community events | title, startTime, type, attendees, status |
| `newsFeedCache` | Feed optimization | userId, cacheKey, articles, expiresAt |
| `discordDigest` | Discord archive | messageId, content, author, reactions |

### Convex Files (41 modules in `convex/`)

Core: `schema.ts`, `auth.ts`, `posts.ts`, `comments.ts`, `members.ts`, `votes.ts`
Features: `bookmarks.ts`, `notifications.ts`, `categories.ts`, `resources.ts`, `events.ts`, `polls.ts`
Integrations: `github.ts`, `discord.ts`, `skoolAutomation.ts`, `storage.ts`
Infrastructure: `http.ts`, `crons.ts`, `search.ts`

---

## Target Architecture

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL 16 (Docker) |
| ORM | Drizzle ORM |
| Auth | Custom email/password (bcrypt + sessions) |
| API | Next.js 15 API routes |
| Real-time | PostgreSQL LISTEN/NOTIFY + WebSocket |
| Background Jobs | node-cron + BullMQ (Redis) |
| Frontend State | TanStack React Query |

---

## Infrastructure Setup

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: vai-postgres
    environment:
      POSTGRES_USER: vai_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-devpassword}
      POSTGRES_DB: vai_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vai_user -d vai_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: vai-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

### Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://vai_user:devpassword@localhost:5432/vai_db
REDIS_URL=redis://localhost:6379
SESSION_SECRET=<generate-32-byte-random-string>
NEXTAUTH_URL=http://localhost:3000
```

### Dependencies

```bash
# Add
bun add drizzle-orm pg bcrypt ioredis bullmq node-cron @tanstack/react-query ws zod
bun add -D drizzle-kit @types/pg @types/bcrypt @types/ws

# Remove (after migration)
bun remove convex @clerk/nextjs @clerk/clerk-react @clerk/types
```

---

## Database Schema (Drizzle)

### Directory Structure

```
db/
├── drizzle.config.ts
├── index.ts                 # Connection pool export
├── migrate.ts               # Migration runner
├── schema/
│   ├── index.ts             # Barrel export
│   ├── members.ts
│   ├── sessions.ts          # NEW
│   ├── password-reset.ts    # NEW
│   ├── posts.ts
│   ├── comments.ts
│   ├── categories.ts
│   ├── votes.ts
│   ├── bookmarks.ts
│   ├── notifications.ts
│   ├── topics.ts
│   ├── resources.ts
│   ├── events.ts
│   ├── poll-votes.ts
│   ├── post-versions.ts
│   ├── post-views.ts
│   ├── comment-reports.ts
│   ├── news-feed-cache.ts
│   └── discord-digest.ts
└── migrations/              # Generated
```

### Key Schema Definitions

#### members.ts
```typescript
import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Profile
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),

  // Auth (NEW - replaces Clerk)
  passwordHash: text('password_hash'),
  authMethod: varchar('auth_method', { length: 20 }).default('password'),

  // Social links
  websiteUrl: text('website_url'),
  linkedinUrl: text('linkedin_url'),
  linkGithub: text('link_github'),
  linkX: text('link_x'),
  linkYouTube: text('link_youtube'),

  // Location
  country: varchar('country', { length: 100 }),
  location: varchar('location', { length: 255 }),

  // Skills
  skills: jsonb('skills').$type<string[]>().default([]),

  // Status & role
  status: varchar('status', { length: 20 }).notNull().default('active'),
  role: varchar('role', { length: 20 }).notNull().default('user'),

  // Cached metrics
  postCount: integer('post_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  netVoteCount: integer('net_vote_count').notNull().default(0),

  // Timestamps
  joinedDate: timestamp('joined_date').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastOnline: timestamp('last_online').notNull().defaultNow(),

  // Preferences
  newsPreferences: jsonb('news_preferences'),
}, (table) => ({
  emailIdx: index('members_email_idx').on(table.email),
  slugIdx: index('members_slug_idx').on(table.slug),
  statusIdx: index('members_status_idx').on(table.status),
  lastOnlineIdx: index('members_last_online_idx').on(table.lastOnline),
}));
```

#### sessions.ts (NEW)
```typescript
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
}, (table) => ({
  tokenIdx: index('sessions_token_idx').on(table.token),
  memberIdIdx: index('sessions_member_id_idx').on(table.memberId),
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
}));

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

---

## Authentication System

### Directory Structure

```
lib/auth/
├── password.ts      # Hash/verify with bcrypt
├── session.ts       # Session CRUD, cookie management
├── middleware.ts    # Route protection
└── constants.ts     # Config values
```

### password.ts
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Minimum 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Requires uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Requires lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Requires number');
  return { valid: errors.length === 0, errors };
}
```

### session.ts
```typescript
import { db } from '@/db';
import { sessions, members } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE = 'vai_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(memberId: string, request: Request): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    memberId,
    token,
    userAgent: request.headers.get('user-agent') || '',
    ipAddress: request.headers.get('x-forwarded-for') || '',
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function getCurrentMember() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
    with: { member: true },
  });

  if (!session) return null;

  // Update activity timestamps
  await Promise.all([
    db.update(sessions).set({ lastActivityAt: new Date() }).where(eq(sessions.id, session.id)),
    db.update(members).set({ lastOnline: new Date() }).where(eq(members.id, session.memberId)),
  ]);

  return session.member;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  cookieStore.delete(SESSION_COOKIE);
}
```

### Auth API Routes

| Endpoint | Method | Request Body | Response |
|----------|--------|--------------|----------|
| `/api/auth/register` | POST | `{ email, password, firstName, lastName }` | `{ user, token }` |
| `/api/auth/login` | POST | `{ email, password }` | `{ user, token }` |
| `/api/auth/logout` | POST | - | `{ success: true }` |
| `/api/auth/me` | GET | - | `{ user }` or 401 |
| `/api/auth/forgot-password` | POST | `{ email }` | `{ success: true }` |
| `/api/auth/reset-password` | POST | `{ token, password }` | `{ success: true }` |

---

## API Routes

### Directory Structure

```
app/api/
├── auth/
│   ├── register/route.ts
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── me/route.ts
│   ├── forgot-password/route.ts
│   └── reset-password/route.ts
├── posts/
│   ├── route.ts                    # GET (list), POST (create)
│   └── [postId]/
│       ├── route.ts                # GET, PATCH, DELETE
│       ├── comments/route.ts       # GET comments
│       ├── vote/route.ts           # POST vote
│       └── view/route.ts           # POST track view
├── comments/
│   ├── route.ts                    # POST create
│   └── [commentId]/
│       ├── route.ts                # PATCH, DELETE
│       ├── vote/route.ts           # POST vote
│       └── report/route.ts         # POST report
├── members/
│   ├── route.ts                    # GET list
│   └── [memberId]/
│       ├── route.ts                # GET, PATCH
│       └── posts/route.ts          # GET member's posts
├── categories/
│   ├── route.ts                    # GET, POST
│   └── [categoryId]/route.ts       # GET, PATCH, DELETE
├── bookmarks/route.ts              # GET, POST, DELETE
├── notifications/route.ts          # GET, PATCH (mark read)
├── resources/
│   ├── route.ts
│   └── [resourceId]/route.ts
├── events/
│   ├── route.ts
│   └── [eventId]/
│       ├── route.ts
│       └── rsvp/route.ts
├── search/route.ts
└── ws/route.ts                     # WebSocket upgrade
```

### Example Route Implementation

```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { getCurrentMember } from '@/lib/auth/session';
import { desc, eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  categoryId: z.string().uuid(),
  type: z.enum(['text', 'image', 'video', 'link']).default('text'),
  attachments: z.array(z.object({
    id: z.string(),
    type: z.string(),
    url: z.string().url(),
  })).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoryId = searchParams.get('categoryId');
  const cursor = searchParams.get('cursor');
  const limit = parseInt(searchParams.get('limit') || '20');

  const result = await db.query.posts.findMany({
    where: and(
      eq(posts.status, 'active'),
      categoryId ? eq(posts.categoryId, categoryId) : undefined
    ),
    orderBy: desc(posts.createdAt),
    limit: limit + 1,
    with: {
      member: { columns: { id: true, firstName: true, lastName: true, slug: true, avatarUrl: true } },
      category: { columns: { id: true, name: true, displayName: true } },
    },
  });

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, -1) : result;

  return NextResponse.json({
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

export async function POST(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const [post] = await db.insert(posts).values({
    ...parsed.data,
    memberId: member.id,
    slug: generateSlug(parsed.data.title),
  }).returning();

  // Publish real-time event
  await publishEvent('posts:new', { post });

  return NextResponse.json(post, { status: 201 });
}
```

---

## Real-time System

### Architecture

```
lib/realtime/
├── server.ts        # WebSocket server + PostgreSQL LISTEN
├── channels.ts      # Channel subscription logic
├── events.ts        # Event types
└── publish.ts       # Publish helper
```

### PostgreSQL LISTEN/NOTIFY

```sql
-- Trigger function for real-time notifications
CREATE OR REPLACE FUNCTION notify_realtime_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'realtime_updates',
    json_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record', row_to_json(NEW)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that need real-time updates
CREATE TRIGGER posts_realtime AFTER INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION notify_realtime_update();

CREATE TRIGGER notifications_realtime AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_realtime_update();
```

### WebSocket Server

```typescript
// lib/realtime/server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { pool } from '@/db';

interface Client {
  ws: WebSocket;
  memberId: string | null;
  subscriptions: Set<string>;
}

const clients = new Map<WebSocket, Client>();

export async function initRealtimeServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // PostgreSQL LISTEN
  const pgClient = await pool.connect();
  await pgClient.query('LISTEN realtime_updates');

  pgClient.on('notification', (msg) => {
    if (msg.channel === 'realtime_updates' && msg.payload) {
      const data = JSON.parse(msg.payload);
      broadcast(data.table, data);
    }
  });

  wss.on('connection', (ws) => {
    clients.set(ws, { ws, memberId: null, subscriptions: new Set() });

    ws.on('message', (data) => handleMessage(ws, JSON.parse(data.toString())));
    ws.on('close', () => clients.delete(ws));
  });
}

function broadcast(channel: string, data: any) {
  const message = JSON.stringify({ type: 'update', channel, data });
  for (const client of clients.values()) {
    if (client.subscriptions.has(channel)) {
      client.ws.send(message);
    }
  }
}
```

### Client Hook

```typescript
// hooks/use-realtime.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtime(channels: string[] = []) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      channels.forEach(ch => ws.send(JSON.stringify({ type: 'subscribe', channel: ch })));
    };

    ws.onmessage = (event) => {
      const { channel, data } = JSON.parse(event.data);
      // Invalidate React Query cache for automatic refetch
      queryClient.invalidateQueries({ queryKey: [channel] });
    };

    ws.onclose = () => setIsConnected(false);

    return () => ws.close();
  }, [channels.join(',')]);

  return { isConnected };
}
```

---

## Frontend Migration

### Provider Setup

```typescript
// app/layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/auth-provider';
import { RealtimeProvider } from '@/components/realtime-provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000 },
  },
});

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RealtimeProvider>
              {children}
            </RealtimeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### Hook Conversions

| Before (Convex) | After (React Query) |
|-----------------|---------------------|
| `useQuery(api.posts.getPosts)` | `useQuery({ queryKey: ['posts'], queryFn: () => fetch('/api/posts').then(r => r.json()) })` |
| `useMutation(api.posts.createPost)` | `useMutation({ mutationFn: (data) => fetch('/api/posts', { method: 'POST', body: JSON.stringify(data) }) })` |
| `usePaginatedQuery(api.posts.getPostsPaginated)` | `useInfiniteQuery({ queryKey: ['posts'], queryFn, getNextPageParam })` |
| `useConvexAuth()` | `useAuth()` (custom) |

### Custom Hooks

```typescript
// hooks/use-auth.ts
export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
  });

  const logoutMutation = useMutation({
    mutationFn: () => fetch('/api/auth/logout', { method: 'POST' }),
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };
}

// hooks/use-posts.ts
export function usePosts(options?: { categoryId?: string }) {
  return useInfiniteQuery({
    queryKey: ['posts', options],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (options?.categoryId) params.set('categoryId', options.categoryId);
      if (pageParam) params.set('cursor', pageParam);
      return fetch(`/api/posts?${params}`).then(r => r.json());
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
}
```

---

## Background Jobs

### Scheduler Setup

```typescript
// lib/jobs/scheduler.ts
import cron from 'node-cron';
import { recalculateMemberStats } from './workers/member-stats';
import { cleanupExpiredSessions } from './workers/cleanup';
import { processDiscordDigest } from './workers/discord-digest';

export function initScheduler() {
  // Member stats - daily at 2 AM UTC
  cron.schedule('0 2 * * *', recalculateMemberStats);

  // Session cleanup - hourly
  cron.schedule('0 * * * *', cleanupExpiredSessions);

  // Discord digest - daily at 6 AM UTC
  cron.schedule('0 6 * * *', processDiscordDigest);

  console.log('Job scheduler initialized');
}
```

### Job Queue (BullMQ)

```typescript
// lib/jobs/queue.ts
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!);

export const emailQueue = new Queue('email', { connection });

new Worker('email', async (job) => {
  switch (job.name) {
    case 'password-reset':
      await sendPasswordResetEmail(job.data);
      break;
    case 'welcome':
      await sendWelcomeEmail(job.data);
      break;
  }
}, { connection });
```

---

## Data Migration

### Migration Script

```typescript
// scripts/migrate-from-convex.ts
import { ConvexHttpClient } from 'convex/browser';
import { db } from '@/db';
import { members, posts, comments, categories, ... } from '@/db/schema';

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

async function migrateMembers() {
  console.log('Migrating members...');
  const convexMembers = await convex.query(api.exportData.getAllMembers);

  for (const m of convexMembers) {
    await db.insert(members).values({
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      slug: m.slug,
      // ... map all fields
      // passwordHash will be null - users need to reset password
    }).onConflictDoNothing();
  }
  console.log(`Migrated ${convexMembers.length} members`);
}

async function main() {
  await migrateMembers();
  await migrateCategories();
  await migratePosts();
  await migrateComments();
  await migrateVotes();
  // ... etc
  console.log('Migration complete!');
}

main();
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Create `docker-compose.yml`
- [ ] Set up Drizzle config and connection
- [ ] Create all 18 schema files (16 existing + 2 new auth tables)
- [ ] Run initial migration
- [ ] Implement auth library (`lib/auth/*`)
- [ ] Create auth API routes

### Phase 2: Core APIs
- [ ] Posts API (CRUD, voting, views)
- [ ] Comments API (CRUD, voting, threading, reports)
- [ ] Members API (profile, list)
- [ ] Categories API
- [ ] Votes API (batch operations)

### Phase 3: Supporting Features
- [ ] Bookmarks API
- [ ] Notifications API
- [ ] Resources & Topics API
- [ ] Events API
- [ ] Search API (with pg_trgm)

### Phase 4: Real-time
- [ ] WebSocket server setup
- [ ] PostgreSQL LISTEN/NOTIFY triggers
- [ ] Client-side hooks
- [ ] Integration with React Query invalidation

### Phase 5: Frontend
- [ ] Replace providers in layout
- [ ] Convert all Convex hooks to React Query
- [ ] Update auth components (sign-in, sign-up, profile)
- [ ] Update all forms to use new APIs

### Phase 6: Background Jobs
- [ ] Set up node-cron scheduler
- [ ] Migrate cron jobs
- [ ] Set up BullMQ for async tasks

### Phase 7: Cleanup
- [ ] Data migration script
- [ ] Remove Convex directory
- [ ] Remove Clerk dependencies
- [ ] Update environment variables
- [ ] Update package.json scripts

---

## Files to Delete

```
convex/                      # Entire directory
components/convex-client-provider.tsx
```

## Files to Modify Heavily

```
app/layout.tsx               # Provider swap
middleware.ts                # Replace Clerk
package.json                 # Dependencies
All hooks/use-*.ts           # Convert to React Query
All components using useQuery/useMutation
```

## New Files to Create

```
docker-compose.yml
db/                          # Entire directory
lib/auth/                    # Entire directory
lib/realtime/                # Entire directory
lib/jobs/                    # Entire directory
app/api/auth/*               # Auth routes
app/api/posts/*              # Post routes
app/api/comments/*           # Comment routes
app/api/members/*            # Member routes
... (all API routes)
components/auth-provider.tsx
components/realtime-provider.tsx
hooks/use-auth.ts
hooks/use-realtime.ts
scripts/migrate-from-convex.ts
```
