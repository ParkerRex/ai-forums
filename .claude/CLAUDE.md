# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
npm run dev              # Start Next.js dev server
npm run ws:server        # Start WebSocket server for real-time features
npm run docker:up        # Start PostgreSQL and Redis containers
npm run docker:down      # Stop containers
```

### Quality Assurance Sequence
After completing work, run in this order:
```bash
npm run test             # Run Bun tests
npm run lint             # Biome - loop until fixed
npx tsc --noEmit         # Type check after lint passes
```

### Database Commands
```bash
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema changes directly
npm run db:studio        # Open Drizzle Studio GUI
```

### Additional Commands
```bash
npm run build            # Production build
npm run typecheck        # TypeScript type checking
npm run lint:theme       # Audit theme consistency
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Backend**: Drizzle ORM + PostgreSQL + API Route Handlers
- **Auth**: Custom session-based auth (bcrypt + cookies)
- **Data Fetching**: TanStack Query (React Query)
- **Real-time**: WebSocket server + Redis pub/sub
- **Job Queue**: BullMQ + Redis
- **Payments**: Stripe (5-tier membership: founding_member, early_bird, member, scholarship)
- **Storage**: Cloudflare R2 (S3-compatible)
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Rich Text**: TipTap (markdown-based)
- **Testing**: Bun (native test runner)

### Project Structure
```
├── app/                 # Next.js App Router pages
│   ├── api/             # API route handlers
│   ├── [category]/      # Category-based posts
│   ├── admin/           # Admin dashboard
│   ├── blog/            # Marketing blog (MDX)
│   ├── members/         # Member profiles & directory
│   ├── membership/      # Subscription management
│   └── pricing/         # Pricing & checkout
├── db/                  # Database configuration
│   ├── schema/          # Drizzle schema definitions
│   ├── migrations/      # SQL migrations
│   ├── index.ts         # Database client export
│   └── drizzle.config.ts
├── components/          # React components (shadcn/ui based)
├── features/            # Feature-specific modules
│   └── news/            # News aggregation feature
├── lib/                 # Utility functions & helpers
├── hooks/               # Custom React hooks (TanStack Query)
└── content/             # MDX blog content
```

## Database Architecture (Drizzle + PostgreSQL)

### Core Tables
- **members**: User profiles, auth data, subscription status, cached metrics
- **posts**: Main content with attachments, voting, categories, paywalls
- **comments**: Threaded discussions with GitHub-style flat display option
- **categories**: Post organization (active/inactive/private states)
- **votes**: Upvote/downvote tracking for posts, comments, resources
- **bookmarks**: Personal content curation
- **notifications**: User engagement alerts
- **resources**: Educational content library with topics
- **events**: Community event management with RSVP
- **subscriptions**: Stripe subscription lifecycle tracking
- **payments**: Transaction history and payment records

### Key Design Patterns
- **API Route Handlers**: All data operations go through `/app/api/` routes
- **TanStack Query**: Client-side data fetching with caching and revalidation
- **Optimistic updates**: UI updates before server confirmation via TanStack Query
- **Cached aggregations**: Post/comment counts stored on parent entities
- **Soft deletes**: Status fields instead of hard deletes (active/deleted/hidden)
- **Database indexes**: Efficient filtering by status, date, votes, etc.

## Drizzle Development Guidelines

### Schema Definition
- Define schemas in `db/schema/` directory
- Use `pgTable()` to define tables
- Use proper column types: `text()`, `integer()`, `boolean()`, `timestamp()`, `jsonb()`
- Define relations using `relations()` helper

### Query Patterns
```typescript
import { db } from "@/db";
import { posts, members } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Simple query
const post = await db.query.posts.findFirst({
  where: eq(posts.id, postId),
  with: { author: true }
});

// Complex query with joins
const results = await db
  .select()
  .from(posts)
  .leftJoin(members, eq(posts.authorId, members.id))
  .where(and(eq(posts.status, 'active'), eq(posts.categoryId, categoryId)))
  .orderBy(desc(posts.createdAt))
  .limit(20);
```

### API Route Pattern
```typescript
// app/api/posts/route.ts
import { db } from "@/db";
import { posts } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  const data = await db.query.posts.findMany({ ... });
  return Response.json(data);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // ... create post
}
```

## Error Handling Strategy

### Query Errors (Deterministic)
- Wrap with React Error Boundaries (`PageErrorBoundary`, `QueryErrorBoundary`)
- Provide page reload option
- Never retry automatically

### Mutation Errors (Non-Deterministic)
- Use try/catch with toast notifications
- Use `useMutationError` hook for consistent handling
- Implement exponential backoff (1s, 2s, 4s)
- Maximum 3 retry attempts
- Show retry button in toast

### Network Errors
- Use `useNetworkStatus` hook for connectivity detection
- Show `NetworkStatusIndicator` in layout
- Don't show error toasts when offline (show indicator instead)
- Process errors through `lib/error-utils.ts`

### Error Classification (lib/error-utils.ts)
- **API Error**: Structured application errors from API routes
- **Network Error**: Connectivity, timeouts, fetch failures
- **Server Error**: Backend/database errors
- **Unknown Error**: Generic fallback

## UI Components & Styling

### Component Library
- Base components in `components/ui/` (shadcn/ui)
- Page-specific components in `components/`
- Use Radix UI primitives for accessibility
- Dark mode support via `next-themes`

### Styling Guidelines
- Tailwind CSS utility classes (see `styles/globals.css`)
- Pure black backgrounds in dark mode (not muted)
- Component library: `components.json` configures shadcn/ui
- Custom animations via `tailwindcss-animate`

### Forms & Validation
- Use `react-hook-form` with `zod` resolvers
- Validation schemas in `lib/form-validation.ts`
- Input components with built-in error states

## Payment System (Stripe)

### Membership Tiers
1. **founding_member**: Early supporters with legacy pricing
2. **early_bird**: Discounted early access
3. **member**: Standard pricing
4. **scholarship**: Free tier via Stripe coupons (no separate "free" tier)

### Payment Flow
- Checkout creates Stripe session -> redirects to Stripe -> webhook updates DB
- Subscription status tracked in both `members` and `subscriptions` tables
- Payment history in `payments` table with transaction details
- Webhook events tracked in `stripe_webhook_events` for idempotency

### Important Files
- `app/api/stripe/`: Stripe API routes (checkout, webhook, portal)
- `lib/payment-error-utils.ts`: Payment error handling
- `app/membership/`: Subscription management UI

## Content Management

### Post System
- Multi-attachment support (images, videos, PDFs, YouTube embeds)
- Rich text editing with TipTap (markdown-based)
- Link previews auto-generated
- Content paywalls for premium posts (`isFree` field)
- Auto-generated previews for free users (2-3 lines)
- Pinning system (category-level, global, or both)
- Edit history tracking in `post_versions` table

### Comment System
- Nested threading with unlimited depth
- GitHub-style flat display option (`replyToMemberId`, `replyToCommentId`)
- Edit history stored in `editHistory` field
- Attachments support (images, documents, GIFs)
- Link previews in comments

### Media Upload
- Primary storage: Cloudflare R2 (S3-compatible)
- Upload logic in `lib/upload-media.ts`
- Image optimization and thumbnails
- Video processing with metadata extraction
- PDF page counting

## Authentication & Authorization

### Custom Auth System
- Session-based authentication with secure cookies (`vai_session`)
- Password hashing with bcrypt
- Session storage in Redis for fast lookups
- Middleware in `middleware.ts` handles route protection
- Public routes: blog, pricing, about, sign-in, sign-up
- Protected routes: everything else
- Admin role check via `role` field in members table

### Auth Utilities
- `lib/auth.ts`: Session management (getSession, createSession, destroySession)
- `hooks/use-current-member.ts`: React hook for current user
- `components/providers/auth-provider.tsx`: Auth context provider

### Member Status
- **active**: Paying or engaged member
- **cancelled**: Subscription cancelled (grace period)
- **churned**: Previously active, now inactive
- **duplicate**: Marked for cleanup/merge

## Testing Strategy

### Unit Tests (Bun)
- Test files with `.test.ts` or `.test.tsx` extension
- Run with `bun test`
- Bun provides built-in test runner with Jest-compatible API

## Special Features

### News Aggregation
- Feature in `features/news/`
- Aggregates from GitHub repos, RSS feeds, Discord
- Cached in database
- User preferences in `members.newsPreferences`

### Blog System
- MDX files in `content/` directory
- Rendered with `@next/mdx` and `next-mdx-remote`
- Syntax highlighting via `rehype-pretty-code`
- Frontmatter for metadata

### Admin Tools
- Admin dashboard in `app/admin/`
- Member management, content moderation, analytics
- Role-based access control (admin role required)
- Pinning posts, hiding comments, viewing reports

## Skool Integration & Automation

### Complete Skool Automation Agent
Full-featured agent for automating Skool.com interactions using cookie-based authentication:

**Capabilities:**
- Content Management: Create, edit, delete posts
- Engagement: Like/unlike posts, comment, reply
- Social: Send DMs, follow/unfollow users
- Discovery: Search posts/users, get notifications
- Monitoring: Track agent stats and activity
- Integrations: GitHub webhooks, Discord automation

**Core Files:**
- `lib/skool-agent.ts`: Complete automation agent class
- `lib/skool-poster.ts`: Core posting + rate limiting
- `app/api/skool/`: Skool automation API routes
- `scripts/skool-api-discover.ts`: Interactive API discovery tool
- `docs/SKOOL_API_SPEC.md`: Complete API specification
- `docs/SKOOL_POSTING_GUIDE.md`: Technical guide
- `docs/SKOOL_AUTOMATION_SETUP.md`: Setup instructions

**Authentication:**
Cookie-based auth with browser-extracted credentials:
- `SKOOL_AUTH_TOKEN`: JWT token (1-year expiry, check `exp` field)
- `SKOOL_CLIENT_ID`: Client UUID
- `SKOOL_WAF_TOKEN`: AWS WAF token (refresh frequently)
- `SKOOL_GROUP_ID`: Target group ID
- `SKOOL_GROUP_NAME`: Target group name

**API Discovery:**
```bash
bun scripts/skool-api-discover.ts
```
Interactive tool captures ALL API endpoints:
- Creates posts, edits, deletes
- Likes/unlikes, comments, replies
- Sends DMs, follows/unfollows
- Searches, gets notifications
- Saves to `migration-data/api-discovery/`

**Agent Usage:**
```typescript
import { createSkoolAgent } from '@/lib/skool-agent';

const agent = createSkoolAgent();
await agent.createPost({ title: "Hello", content: "World" });
await agent.likePost(postId);
await agent.createComment({ postId, content: "Nice!" });
await agent.sendDM({ userId, content: "Hi!" });
const stats = agent.getStats();
```

**Setup:**
1. Run `bun scripts/skool-api-discover.ts` for complete API mapping
2. Extract cookies from browser DevTools
3. Add to `.env.local`: `SKOOL_AUTH_TOKEN`, `SKOOL_CLIENT_ID`, etc.
4. Test via the Skool API routes
5. Setup webhooks: `/api/github/release` for automation

**Rate Limiting:**
- Posts: 60/hour, Likes: 120/hour, Comments: 80/hour
- DMs: 30/hour, Follows: 50/hour
- Automatic enforcement in `SkoolRateLimiter`

**Integration Points:**
- GitHub releases -> Auto-post to Skool
- Discord messages (5+ reactions) -> Share to Skool
- Custom triggers via API routes

## Important Notes

- **No sleep commands**: Never use `sleep` command (will sleep laptop)
- **Use bun for execution**: Always use bun, not npm/pnpm for running scripts
- **Docker required**: PostgreSQL and Redis run in Docker containers
- **Type safety**: TypeScript strict mode enabled, must pass `npx tsc --noEmit`
- **Skool tokens**: Check expiration regularly, refresh before 7 days remaining
