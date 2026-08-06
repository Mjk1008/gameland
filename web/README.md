# Gameland — Web App

Next.js 14 · Persian/RTL · Liara (Iran) · Postgres via Drizzle

## Quick start (local)

```bash
cd web
npm run setup      # creates .env.local if missing
npm install
npm run dev        # http://localhost:3000
```

**Dev login (in-memory, no DATABASE_URL):**
- Admin phone: `09120000000` · OTP: `123456`
- Or use phones in `ADMIN_PHONES` from `.env.local`

## Deploy (Liara)

App is **`gameland`** on Liara · production URL: **https://gamelandteam.ir**

```bash
# از root ریپو:
npm run sync                              # pull + rebase
npm run ship -- "fix: something"          # commit → push → deploy
npm run ship -- --push "fix: something"   # commit → push فقط
npm run ship -- --deploy-only             # deploy فقط
npm run deploy                            # deploy فقط (مستقیم)
```

Config: `liara.json` · DB: `gameland-db` (Liara Postgres)

Apply schema to a fresh DB:
```bash
export DATABASE_URL="postgresql://..."   # from liara env ls
npm run db:init
```

## Env vars

See `.env.example` for the full list. Key vars:

| Var | Local | Production |
|-----|-------|------------|
| `DATABASE_URL` | empty = in-memory | Liara Postgres |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://gamelandteam.ir` |
| `GOOGLE_OAUTH_ENABLED` | `false` | `false` (Iran blocks Google server-side) |
| `KAVENEGAR_API_KEY` | empty = OTP `123456` | live SMS |

Full infra guide: [`docs/16-infrastructure.md`](../docs/16-infrastructure.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run deploy` | Deploy to Liara |
| `npm run env:prod` | List production env vars |
| `npm run db:init` | Apply `lib/db/init.sql` |
| `npm run ranking:demo` | CLI ranking engine demo |

Root-level shortcuts (run from repo root): `npm run sync`, `npm run ship`, `npm run deploy`.
