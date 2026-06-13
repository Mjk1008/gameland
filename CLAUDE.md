# CLAUDE.md — Gameland Agent Guidance

> Read this before touching any infrastructure, env vars, or DB connection code.

## Infrastructure: Liara (primary) vs Supabase (secondary)

| | Liara | Supabase |
|---|---|---|
| **Status** | PRIMARY — production, Iran-hosted | SECONDARY — international fallback |
| **Why** | Supabase is blocked in Iran; Liara is accessible | Available outside Iran or via VPN |
| **DB** | Liara Managed Postgres | Supabase Postgres |
| **Auth** | NextAuth.js (planned) | `@supabase/auth-helpers-nextjs` (planned) |
| **Storage** | Liara Object Storage (S3-compatible) | Supabase Storage |
| **Hosting** | Liara (Next.js app) | Vercel or self-host |

### How to switch
Everything is driven by `.env.local` (never committed). Change `DATABASE_URL` and `AUTH_PROVIDER`:

```
# Liara (default, Iran)
DATABASE_URL=postgresql://user:pass@host.liara.ir:5432/gameland
AUTH_PROVIDER=nextauth

# Supabase (international)
DATABASE_URL=postgresql://postgres:pass@db.xxxxx.supabase.co:5432/postgres
AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

See full details → [`docs/16-infrastructure.md`](docs/16-infrastructure.md)

## DB migrations

Two migration files exist; they target different scopes:

| File | Purpose |
|---|---|
| `supabase/migrations/20260101000000_initial_schema.sql` | Full domain schema (14 tables, RLS, ranking MATVIEW, coin ledger view, trigger) — designed for production with auth wired. |
| `web/lib/db/init.sql` | Lean app-prefix schema (`app_*` tables) matching `lib/db/schema.ts` — the runtime Drizzle layer reads/writes these. Apply this first to make the app persist. |

To go live on Liara Postgres:
```bash
# 1. Provision DB on Liara → grab connection URL
# 2. Apply the app schema
psql $DATABASE_URL -f web/lib/db/init.sql
# 3. Set on the app
liara env set DATABASE_URL=postgresql://... -a gameland -f
# 4. Restart will auto-pick up; lib/db/client.ts lazy-connects on first request
```

Until `DATABASE_URL` is set, `lib/store.ts` runs in-memory (data resets on restart). With `DATABASE_URL` set, the persistence shim writes through to Postgres.

To apply on Supabase: use the Supabase dashboard SQL editor or `supabase db push`.

## RLS note

All tables have `ENABLE ROW LEVEL SECURITY`. Current policies are placeholders (permissive until auth is wired). When adding auth:
- **Liara path**: use `current_setting('app.current_user_id')` in policies
- **Supabase path**: use `auth.uid()` in policies

Do NOT hardcode Supabase-specific `auth.uid()` calls — keep policies in a separate file per provider. See `docs/16-infrastructure.md`.

## Tech stack

- **Framework**: Next.js 14 (App Router, server components by default)
- **ORM**: Drizzle (planned — not yet wired; `web/lib/mock-data.ts` is the current data layer)
- **Styling**: Tailwind CSS + inline styles, RTL/Persian first
- **Fonts**: Vazirmatn (Persian text) + Rajdhani (numbers/tags)
- **Data layer now**: `web/lib/mock-data.ts` — replace with Drizzle queries when DB is live

## Project context

Business 1 of 3. Iran esports tournament + community platform.
Strategy docs in `docs/`. Roadmap: `docs/09-roadmap.md`.
Current phase: **Phase 1 MVP** — UI complete (mock data), DB schema written, real data ingest pending.
