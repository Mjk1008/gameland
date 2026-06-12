# 16 — Infrastructure Guide

**Stage:** Build · **Status:** ✅ documented (DB+hosting not yet live)

> This doc is the single source of truth for infra decisions. All agents and developers must read `CLAUDE.md` first, then this for full detail.

---

## Decision: Liara as primary, Supabase as secondary

**Reason:** Supabase (supabase.com) is blocked in Iran. Gameland's users and the founding team are in Iran. Liara (liara.ir) is an Iranian cloud platform with:
- Managed Postgres
- Next.js / Node.js hosting
- S3-compatible object storage
- DNS/CDN
- Accessible from all Iranian ISPs

Supabase remains a valid secondary target for international use or if the team operates via VPN. The codebase is designed to work on both via environment variables.

---

## Environment variables

Copy `web/.env.example` → `web/.env.local` and fill in values. Never commit `.env.local`.

### Liara setup (primary)

```env
# ── Database ──────────────────────────────────────────────────
DATABASE_URL=postgresql://USER:PASS@HOST.liara.ir:5432/gameland

# ── Auth ──────────────────────────────────────────────────────
AUTH_PROVIDER=nextauth
NEXTAUTH_URL=https://your-app.liara.run
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# ── SMS (Kavenegar) ───────────────────────────────────────────
KAVENEGAR_API_KEY=
KAVENEGAR_SENDER=

# ── App ───────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://your-app.liara.run
```

### Supabase setup (secondary / international)

```env
# ── Database ──────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:PASS@db.XXXX.supabase.co:5432/postgres

# ── Auth ──────────────────────────────────────────────────────
AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-side only, never expose to client

# ── SMS ───────────────────────────────────────────────────────
KAVENEGAR_API_KEY=
KAVENEGAR_SENDER=

# ── App ───────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Database migrations

Schema lives in `supabase/migrations/20260101000000_initial_schema.sql`.
**It is standard Postgres SQL — no Supabase extensions required.**

### Apply on Liara Postgres
```bash
psql $DATABASE_URL -f supabase/migrations/20260101000000_initial_schema.sql
psql $DATABASE_URL -f supabase/seed.sql
```

### Apply on Supabase
```bash
# via Supabase CLI
supabase db push

# or via dashboard → SQL editor
```

### Drizzle ORM (planned)
When Drizzle is wired, migrations will be generated from `web/drizzle/schema.ts` and run with `drizzle-kit push`. The connection is always `DATABASE_URL` — no provider-specific code in the ORM layer.

---

## Row-Level Security (RLS)

All tables have `ENABLE ROW LEVEL SECURITY`. Current policies: placeholder/permissive (nothing blocks reads until auth is live — intentional for Phase 1 public leaderboard).

### When wiring auth — provider matters for policies

**Liara / NextAuth path** — set a session variable per request:
```sql
-- in a DB middleware / Drizzle beforeQuery hook:
SET LOCAL app.current_user_id = 'uuid-here';

-- policy example:
CREATE POLICY "players_own_row" ON players
  USING (id = current_setting('app.current_user_id', true)::uuid);
```

**Supabase path** — use built-in JWT:
```sql
CREATE POLICY "players_own_row" ON players
  USING (id = auth.uid());
```

Keep provider-specific policies in separate files:
- `supabase/policies/liara.sql`
- `supabase/policies/supabase.sql`

Apply the correct one for your environment. Do NOT mix both in the same DB.

---

## Hosting

### Liara (primary)

Deploy config: `web/liara.json`

```bash
# install Liara CLI
npm install -g @liara/cli

# login
liara login

# deploy from web/ directory
cd web
liara deploy
```

Liara detects Next.js automatically. Environment variables are set via Liara dashboard or:
```bash
liara env set DATABASE_URL=postgresql://...
```

### Vercel (Supabase path / international)

```bash
vercel --prod
```

Set env vars in Vercel dashboard. Uses `vercel.json` if present.

---

## Object storage

| | Liara | Supabase |
|---|---|---|
| Service | Liara Object Storage | Supabase Storage |
| Protocol | S3-compatible | S3-compatible |
| SDK | AWS SDK v3 (`@aws-sdk/client-s3`) | `@supabase/storage-js` (or AWS SDK) |
| Env var | `LIARA_STORAGE_ENDPOINT`, `LIARA_STORAGE_ACCESS_KEY`, `LIARA_STORAGE_SECRET_KEY` | `SUPABASE_STORAGE_URL` |

Use the AWS SDK v3 for both — it works with any S3-compatible endpoint. Avoids vendor lock-in.

---

## SMS — Kavenegar (same for both providers)

Kavenegar is Iran-local. Same API key regardless of hosting provider.
Docs: https://kavenegar.com/rest.html

```typescript
// web/lib/sms.ts (planned)
const KAVENEGAR_API_KEY = process.env.KAVENEGAR_API_KEY!
```

---

## Summary table

| Concern | Liara (primary) | Supabase (secondary) |
|---|---|---|
| Postgres | Liara Managed PG | Supabase PG |
| Auth | NextAuth.js | @supabase/auth-helpers |
| RLS user id | `current_setting('app.current_user_id')` | `auth.uid()` |
| Storage | Liara S3 / AWS SDK v3 | Supabase Storage / AWS SDK v3 |
| Hosting | liara.ir (liara deploy) | Vercel |
| SMS | Kavenegar | Kavenegar |
| DB migrations | psql direct | supabase db push |
| ORM | Drizzle (`DATABASE_URL`) | Drizzle (`DATABASE_URL`) |
| Switch cost | Change .env.local | Change .env.local |
