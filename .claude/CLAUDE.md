# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
npm run dev              # Start both frontend (Next.js) and backend (Convex) in parallel
npm run dev:frontend     # Start only Next.js dev server
npm run dev:backend      # Start only Convex dev server
npm run predev           # Run Convex dev until success (runs automatically before dev)
```

### Quality Assurance Sequence
After completing work, run in this order:
```bash
npm run test             # Run Bun tests
npm run lint             # Biome - loop until fixed
npx tsc --noEmit         # Type check after lint passes
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
- **Backend**: Convex (real-time database + serverless functions)
- **Auth**: Clerk
- **Payments**: Stripe (5-tier membership: founding_member, early_bird, member, scholarship)
- **Storage**: Cloudflare R2 (S3-compatible)
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Rich Text**: TipTap (markdown-based)
- **Testing**: Bun (native test runner)

### Project Structure
```
├── app/                 # Next.js App Router pages
│   ├── [category]/      # Category-based posts
│   ├── admin/           # Admin dashboard
│   ├── blog/            # Marketing blog (MDX)
│   ├── members/         # Member profiles & directory
│   ├── membership/      # Subscription management
│   └── pricing/         # Pricing & checkout
├── convex/              # Convex backend (queries, mutations, actions)
│   ├── schema.ts        # Database schema definition
│   ├── auth.ts          # Authentication logic
│   ├── posts.ts         # Post CRUD operations
│   ├── comments.ts      # Comment system with threading
│   ├── payments.ts      # Stripe integration
│   └── crons/           # Scheduled jobs
├── components/          # React components (shadcn/ui based)
├── features/            # Feature-specific modules
│   └── news/            # News aggregation feature
├── lib/                 # Utility functions & helpers
├── hooks/               # Custom React hooks
└── content/             # MDX blog content
```

## Database Architecture (Convex)

### Core Tables
- **members**: User profiles, auth data, subscription status, cached metrics
- **posts**: Main content with attachments, voting, categories, paywalls
- **comments**: Threaded discussions with GitHub-style flat display option
- **categories**: Post organization (active/inactive/private states)
- **votes**: Upvote/downvote tracking for posts, comments, resources
- **bookmarks**: Personal content curation
- **notifications**: Real-time user engagement alerts
- **resources**: Educational content library with topics
- **events**: Community event management with RSVP
- **subscriptions**: Stripe subscription lifecycle tracking
- **payments**: Transaction history and payment records

### Key Design Patterns
- **Real-time by default**: All queries are reactive via Convex
- **Optimistic updates**: UI updates before server confirmation
- **Cached aggregations**: Post/comment counts stored on parent entities
- **Soft deletes**: Status fields instead of hard deletes (active/deleted/hidden)
- **Multi-index queries**: Efficient filtering by status, date, votes, etc.
- **Full-text search**: Search indexes on posts, comments, members, categories

## Convex Development Guidelines

### Function Types
- Use new function syntax with explicit args/returns validators
- **Public functions**: `query`, `mutation`, `action` (exposed to client)
- **Internal functions**: `internalQuery`, `internalMutation`, `internalAction` (server-only)
- Always include `returns` validator (use `v.null()` if no return value)

### Database Queries
- **DO NOT** use `.filter()` - define indexes in schema and use `.withIndex()`
- Use `.unique()` for single document queries (throws on multiple matches)
- Use `.order('desc')` or `.order('asc')` for sorting
- Use `.take(n)` to limit results or `paginate()` for pagination
- For deletion: `.collect()` then iterate with `ctx.db.delete(row._id)`

### Best Practices
- Index fields must be queried in definition order
- System fields `_id` and `_creationTime` auto-added to all documents
- Use `Id<'tableName'>` TypeScript type for document IDs
- Validators: `v.id('tableName')`, `v.string()`, `v.number()`, `v.boolean()`, `v.array()`, `v.object()`, `v.union()`, `v.optional()`, `v.null()`
- HTTP endpoints in `convex/http.ts` use `httpAction` with `httpRouter`
- Cron jobs in `convex/crons.ts` use `cronJobs()` with `interval()` or `cron()` methods

### Convex MCP Integration
Use Convex MCP tools for database work:
- `status`: Query available deployments
- `tables`: List table schemas (declared + inferred)
- `data`: Paginate through table documents
- `runOneoffQuery`: Write sandboxed queries for data exploration
- `functionSpec`: View all deployed functions with types
- `run`: Execute deployed functions
- `envList/envGet/envSet/envRemove`: Manage environment variables

## Error Handling Strategy

### Query Errors (Deterministic)
- Wrap with React Error Boundaries (`PageErrorBoundary`, `QueryErrorBoundary`)
- Provide page reload option (queries always fail with same args)
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
- **ConvexError**: Structured application errors with `error.data`
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
- Checkout creates Stripe session → redirects to Stripe → webhook updates DB
- Subscription status tracked in both `members` and `subscriptions` tables
- Payment history in `payments` table with transaction details
- Webhook events tracked in `stripeWebhookEvents` for idempotency

### Important Files
- `convex/payments.ts`: Stripe integration logic
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

### Clerk Integration
- `externalId` field in members table stores Clerk user ID
- Middleware in `middleware.ts` handles auth
- Public routes: blog, pricing, about
- Protected routes: everything else
- Admin role check via `role` field in members table

### Member Status
- **active**: Paying or engaged member
- **cancelled**: Subscription cancelled (grace period)
- **churned**: Previously active, now inactive
- **duplicate**: Marked for cleanup/merge

## Testing Strategy

### Unit Tests (Bun)
- Test files with `.test.ts` or `.test.tsx` extension
- Convex functions testable with `convex-test`
- Run with `bun test`
- Bun provides built-in test runner with Jest-compatible API

## Special Features

### News Aggregation
- Feature in `features/news/`
- Aggregates from GitHub repos, RSS feeds, Discord
- Cached in `newsFeedCache` table
- Discord digest in `discordDigest` table (daily archive)
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
- ✅ Content Management: Create, edit, delete posts
- ✅ Engagement: Like/unlike posts, comment, reply
- ✅ Social: Send DMs, follow/unfollow users
- ✅ Discovery: Search posts/users, get notifications
- ✅ Monitoring: Track agent stats and activity
- ✅ Integrations: GitHub webhooks, Discord automation

**Core Files:**
- `lib/skool-agent.ts`: Complete automation agent class
- `lib/skool-poster.ts`: Core posting + rate limiting
- `convex/skoolAutomation.ts`: Convex actions
- `convex/githubWebhooks.ts`: GitHub webhook handlers
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
4. Test: `api.skoolAutomation.testPost()` in Convex dashboard
5. Setup webhooks: `/github/release` for automation

**Rate Limiting:**
- Posts: 60/hour, Likes: 120/hour, Comments: 80/hour
- DMs: 30/hour, Follows: 50/hour
- Automatic enforcement in `SkoolRateLimiter`
- Monitor: `api.skoolAutomation.getRateLimitStatus()`

**Integration Points:**
- GitHub releases → Auto-post to Skool
- Discord messages (5+ reactions) → Share to Skool
- Custom triggers via Convex actions

## Important Notes

- **No sleep commands**: Never use `sleep` command (will sleep laptop)
- **Use bun for execution**: Always use bun, not npm/pnpm for running scripts
- **Convex dev must succeed**: `predev` script ensures Convex is ready before frontend starts
- **Real-time updates**: Most UI automatically updates via Convex subscriptions
- **Optimistic UI**: Many mutations update UI immediately before server confirmation
- **Type safety**: TypeScript strict mode enabled, must pass `npx tsc --noEmit`
- **Skool tokens**: Check expiration regularly, refresh before 7 days remaining
