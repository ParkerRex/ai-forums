# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start both frontend (http://localhost:3000) and Convex backend
- `npm run build` - Create production build
- `npm run start` - Run production server

### Testing
- `npm run test` - Run unit tests with Vitest
- `npm run test:visual` - Run E2E tests with Playwright

### Code Quality
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm run lint:theme` - Audit theme color usage

### Utilities
- `npm run export:members` - Export member data
- `npm run migrate:clerk-accounts` - Migrate legacy auth to Clerk
- `npm run billing:validate` - Validate billing data

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15.2.3 with React 19, App Router
- **Backend**: Convex (real-time serverless database)
- **Auth**: Clerk (supports password, Google, Discord)
- **Payments**: Stripe subscriptions
- **UI**: Radix UI + shadcn/ui + Tailwind CSS v4
- **Storage**: Cloudflare R2 for media

### Key Directories
- `app/` - Next.js App Router pages
- `components/` - React components (ui/ for base components)
- `convex/` - Backend functions and schema
- `features/` - Feature-based modules
- `hooks/` - Custom React hooks
- `lib/` - Utilities and helpers

### Convex Patterns
- **Schema-first design** in `convex/schema.ts`
- **Query functions** for reads, **mutations** for writes
- **Internal functions** prefixed with `internal`
- **Comprehensive JSDoc** on all functions
- **Organized structure**: main functions in root, grouped features in subdirectories
- **Test files** in `convex/test/`
- **Migrations** in `convex/migrations/` with README

### Database Schema
Core tables: members, posts, comments, categories, votes, bookmarks, notifications, subscriptions, payments. Features include post versioning, link previews, polls, events, and news feed caching.

### Authentication Flow
1. Clerk handles authentication (password, Google, Discord)
2. Auto-creates member profile on first sign-in
3. Legacy email auth migration supported
4. Unique slug generation for member URLs

### UI Guidelines
- **Animated icons**: https://icons.pqoqubbw.dev/
- **Static icons**: https://www.radix-ui.com/icons
- **Colors**: Follow Radix UI color guidelines for backgrounds, interactive components, borders, and accessible text
- **Components**: Use existing Radix UI + shadcn patterns

### Important Notes
- Use **npm**, not pnpm or bun
- Database is **Convex** - use queries and mutations
- Always check existing components/patterns before creating new ones
- Run `npm run lint` and `npm run typecheck` before committing
- Test new features with `npm run test`
- Use absolute paths in file references