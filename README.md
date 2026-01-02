# VAI Forums (ai-forums)

Blunt summary: this is a Next.js app for a high‑signal forum. It uses Postgres, Drizzle, Redis,
and a WebSocket server.

## Stack
- Next.js (App Router)
- Bun (package manager + scripts)
- PostgreSQL (primary data store)
- Drizzle ORM (schema + migrations)
- Redis (sessions + queues)
- WebSocket server (real‑time)

## How it works (short version)
- Postgres holds all core data (members, posts, comments, votes).
- Drizzle defines schema + migrations and runs them via `bun db:migrate`.
- Redis backs sessions and background jobs; it is required for auth + queues.
- WebSockets push real‑time updates (new comments, votes, status changes) so the UI
  doesn’t poll constantly.
- Next.js API routes handle auth, data fetches, and write operations.

## Requirements
- Bun
- Docker (for Postgres/Redis)
- Node 18+ (Bun runs it under the hood where needed)

## Quick start
```bash
bun install
cp .env.example .env
docker compose up -d
bun db:migrate
bun dev
```

If the DB is empty and you change schema:
```bash
bun db:generate
bun db:migrate
```

## Environment
See `.env.example`. Critical vars:
- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`

Optional integrations:
- GitHub: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_REPO`
- S3/R2: `AWS_*`
- Discord, Stripe, OpenAI: set only if used

## Scripts
```bash
bun dev           # Next.js dev server
bun build         # production build
bun start         # production server
bun typecheck     # TS typecheck
bun lint          # biome check
bun db:generate   # create migrations from schema
bun db:migrate    # apply migrations
bun ws:server     # start websocket server
```

## Notes
- Migrations live in `db/migrations`. Drizzle also writes a meta journal there.
- If you see `relation "X" does not exist`, you did not run migrations.
- This repo expects a local Postgres/Redis (see `docker-compose.yml`).
