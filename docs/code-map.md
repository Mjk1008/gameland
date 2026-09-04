# Gameland Code Map

> **For agents & devs:** read this before broad codebase exploration.  
> Full product/architecture rules live in [`CLAUDE.md`](../CLAUDE.md). Update this file when you add a major feature area or move core files.

---

## Quick lookup — «می‌خوام X کنم، کجا برم؟»

| Task | Start here |
|---|---|
| Add/change business data or reads | `web/lib/store.ts` |
| New DB table/column (ships via deploy) | `web/lib/db/persistence.ts` → `ensureSchema` |
| Drizzle table defs | `web/lib/db/schema.ts` |
| Auth / roles / admin allow-list | `web/lib/auth.ts` |
| Scoped access levels (سطوح دسترسی) — e.g. bracket result-entry for a plain gamer account | `hasPermission()`/`setUserPermissions()` in `web/lib/store.ts` · grant/revoke UI (super admin only): `/admin/access` · API: `web/app/api/admin/permissions/route.ts` |
| Registration approve/reject | `web/app/api/admin/reg-approve/route.ts` + `web/app/admin/requests/` |
| Bracket draw / match results | `web/lib/bracket.ts`, `web/lib/bracket-team.ts` (2v2) |
| Ranking / placement points | `web/lib/ranking.ts` + `activityPointsOf()` in store |
| Home promo slider | `web/app/promo-slider.tsx` · admin: `/admin/content` → promos |
| Home news slider | `web/app/news-slider.tsx` · admin: `/admin/content` → news |
| Home kickoff countdown | `web/components/KickoffBar.tsx` · date in `web/lib/kickoff.ts` |
| Competition cards (covers) | `web/app/competitions/cards.tsx` |
| Upload competition/event cover | `web/components/CoverUploader.tsx` · APIs: `admin/competition-cover`, `admin/event-cover` |
| AI assistant prompt + stream | `web/app/api/assistant/route.ts` · context: `web/lib/assistant-context.ts` |
| AI knowledge base (admin facts) | `/admin/ai` · key `ai_knowledge` in `app_settings` |
| Play Arena (میدون) | `web/lib/arena.ts` · pages: `web/app/arena/` |
| Gamenet platform | `web/app/gamenets/` · owner: `web/app/gamenet/` |
| Referral campaign | `setReferrerByTag()` in store · UI: `/invite` |
| Promoter / affiliate | `web/lib/promoter.ts` · durable code writes (`insertAsync`) · PRD: [`docs/31-promoter-platform-prd.md`](31-promoter-platform-prd.md) · UX: [`docs/32-promoter-ux-redesign-prd.md`](32-promoter-ux-redesign-prd.md) · admin: `/admin/promoters` · dashboard: `/me/promoter` · code requests: `app_promoter_code_requests` |
| Honorary arcade (gated) | `web/app/arcade/` · `web/lib/honor.ts` |
| Jalali dates in admin | `web/components/Jalali*.tsx` · `web/lib/jalali.ts` |
| Shared UI primitives | `web/components/ui.tsx` |
| Deploy | `npm run ship -- "msg"` from repo root (see CLAUDE.md) |
| Founder analytics SQL (Phase 0) | [`docs/30-saved-queries.md`](30-saved-queries.md) · read-only role: [`scripts/setup-readonly-analytics-role.sql`](../scripts/setup-readonly-analytics-role.sql) |

---

## Analytics / MCP (Phase 0 → 1)

| Artifact | Purpose |
|---|---|
| [`docs/30-saved-queries.md`](30-saved-queries.md) | ~15 canonical Persian-friendly SQL queries for founder analytics |
| [`scripts/setup-readonly-analytics-role.sql`](../scripts/setup-readonly-analytics-role.sql) | Idempotent `gameland_readonly` role — SELECT on analytics tables, REVOKE on blob/PII, 10s timeout |
| Phase 1 (not built) | MCP server wrapping saved queries — do not add until requested |

---

## Domain vocabulary (Persian ↔ code)

| Persian UI | Code concept | Primary type/table |
|---|---|---|
| **رویداد** | Mother **Competition** (groups disciplines) | `Competition` · `app_competitions` |
| **رشته** | Child **Event** (one game/discipline) | `Event` · `app_events` |
| **سهم** | Registration ticket / attempt | `Registration.attempts` (cap 6) |
| **قرعه‌کشی** | Bracket draw | `lib/bracket.ts` → `matchesForComp()` |
| **گیمر** | User with `role: 'gamer'` | `app_users` |

**Routes:**
- `/competitions/e/[id]` → رویداد (mother competition, lists رشته‌ها)
- `/competitions/[id]` → رشته (single event: register, pay, bracket)

---

## Architecture (one screen)

```
app/(pages) ──read──▶ store.ts (in-memory Maps, sync API)
                           │
                           ├── write-through ──▶ persistence.ts ──▶ Postgres
                           └── blob: ID Sets only; bytes via GET /api/*/ [id]

Single Liara instance (scale: 1). Never scale horizontally without replacing store.
whenReady() gates auth/signup until hydration finishes.
```

---

## Folder layout (`web/`)

| Path | Role |
|---|---|
| `app/` | Next.js App Router — pages + API routes |
| `components/` | Shared React UI |
| `lib/` | Domain logic, store, DB, auth, bracket, ranking |
| `public/` | Self-hosted static assets (fonts, game banners, PWA icons) — **no CDN** |
| `scripts/` | Dev tooling only (e.g. assistant eval) |

---

## Key `lib/` modules

### Data layer
| File | Purpose |
|---|---|
| `store.ts` | **Source of truth in RAM** — users, events, competitions, regs, teams, matches, promos, news |
| `db/persistence.ts` | Hydration on boot + write-through; idempotent `CREATE TABLE IF NOT EXISTS` |
| `db/schema.ts` | Drizzle PG schema |
| `schema.ts` | TS domain types (legacy/spec mirror) |
| `mock-data.ts` | Discipline catalog (`DISC`), game asset paths, seed data |

### Tournament
| File | Purpose |
|---|---|
| `bracket.ts` | Solo draw, prelims, final, advancement |
| `bracket-team.ts` | 2v2 team bracket (isolated) |
| `ranking.ts` | Placement points × tier multiplier |
| `competition-engine.ts` | Qualification / roadmap helpers |
| `discipline-rules.ts` | Per-game rules copy |
| `prelim-venue.ts` | City-grouped prelim venue assignment |
| `ticket-price.ts` | Per-event price resolver (server) |

### Auth & comms
| File | Purpose |
|---|---|
| `auth.ts` | NextAuth — phone+password, Google optional |
| `otp.ts` + `sms.ts` | Kavenegar OTP |
| `password.ts` | scrypt hash/verify |

### Features
| File | Purpose |
|---|---|
| `arena.ts` + `arena-*.ts` | Play Arena ladder |
| `assistant-context.ts` | Live snapshot for AI prompts |
| `ai-config.ts` | Model selection |
| `honor.ts` | Honorary user gate |
| `jalali.ts` | Jalali ↔ Gregorian |
| `cover-image.ts` | Client-side 16:9 JPEG compression |

---

## Blob / image pattern

**Rule:** never inline base64 in HTML. RAM holds IDs only; Postgres holds bytes.

| Blob | PG table | Memory | Upload | Serve |
|---|---|---|---|---|
| Profile photo | `app_avatars` | `avatarIds` Set | `POST /api/me/avatar` | `GET /api/avatar/[id]` |
| Payment receipt | `app_receipts` | `receiptRegIds` Set | `POST /api/register/receipt` | `GET /api/admin/receipt/[regId]` |
| News cover | `app_news` | metadata in RAM | `POST /api/admin/news` | `GET /api/news-image/[id]` |
| Promo slide | `app_promos` | metadata in RAM | `POST /api/admin/promos` | `GET /api/promo/[id]` |
| Gamenet photo | `app_gamenet_photos` | id lists | `POST /api/gamenet-photos` | `GET /api/gamenet-photo/[id]` |
| Competition cover | `app_competition_covers` | `competitionCoverIds` Set | `POST /api/admin/competition-cover` | `GET /api/competition-cover/[id]` |
| Event cover | `app_event_covers` | `eventCoverIds` Set | `POST /api/admin/event-cover` | `GET /api/event-cover/[id]` |

**Default covers:** on boot, `reconcileDefaultEventCovers()` copies bundled `public/games/*-banner.jpg` into `app_event_covers` for any رشته without an upload — idempotent. Admin can replace anytime. Static paths remain fallback via `resolveEventCardCover()`.

**Static fallbacks:** `public/games/*-banner.jpg` via `GAME_BANNER` in `components/ui.tsx`.

---

## Public pages (high-traffic)

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Promo + news sliders, active competitions, leaderboard peek |
| `/competitions` | `app/competitions/page.tsx` | All رویدادها + standalone رشته‌ها |
| `/competitions/e/[id]` | Mother competition → discipline list |
| `/competitions/[id]` | Event detail, register CTA |
| `/competitions/[id]/register` | Ticket purchase |
| `/competitions/[id]/pay` | Receipt upload |
| `/competitions/[id]/bracket` | Bracket view |
| `/leaderboard` | National ranking |
| `/me` | Profile hub |
| `/arena` | Play Arena |
| `/assistant` | AI chat |

---

## Admin panel

**Gate:** `app/admin/layout.tsx` — requires `admin` or `organizer`.

| Hub | Path | Tabs / manages |
|---|---|---|
| Dashboard | `/admin` | Stats, quick links |
| مسابقات | `/admin/events` | Events list, رویدادها, رشته‌ها |
| محتوا | `/admin/content` | Promo slider, news |
| آنالیتیکس | `/admin/analytics` | KPIs, behavior, AI usage |
| درخواست‌ها | `/admin/requests` | Pending regs (**actions only in review sheet**) |
| گیمرها | `/admin/gamers` | User list |
| گیم‌نت‌ها | `/admin/gamenets` | Verify submissions |

**Detail pages:**
- `/admin/competitions/new` + `/admin/competitions/[id]` — create رویداد, add رشته, covers
- `/admin/events/[id]` — draw, prizes, prelim venue, finalize, event cover
- `/admin/events/[id]/edit` — edit fields

---

## API routes by domain

### Auth & profile
`signup`, `otp/send`, `forgot`, `reset`, `reset-otp`, `auth/[...nextauth]`, `me`, `me/avatar`, `profile/complete`

### Registration
`register`, `register/receipt`, `team/accept`, `team/decline`, `team/replace-partner`

### Admin tournament ops
`admin/reg-approve`, `admin/reg-attempts`, `admin/draw`, `admin/match`, `admin/result`, `admin/finalize`, `admin/assemble-final`, `admin/qualify`, `admin/prelim-venue`, `admin/prize`, `admin/event-status`, `admin/event-delete`, `admin/events`, `admin/competitions`, `admin/disciplines`

### Admin content & platform
`admin/promos`, `admin/news`, `admin/sponsors`, `admin/notify`, `admin/competition-cover`, `admin/event-cover`, `admin/ai-knowledge`, `admin/gamenet-verify`, `admin/gamenet-review`, `admin/gamenet-delete`, `admin/behavior-export`

### Arena
`arena/requests`, `arena/requests/[id]/accept|cancel`, `arena/matches/[id]/*`, `arena/my`

### Other
`assistant` (SSE), `track`, `notif-count`, `gamenets`, `gamenet-photos`

---

## UI conventions (don't re-learn the hard way)

1. **Portal modals/FABs** to `document.body` — ancestor `transform` breaks `position: fixed` (see CLAUDE.md §6).
2. **Lists newest-first** everywhere (admin queue, notifications).
3. **Approve/reject only inside review sheet** at `/admin/requests` — not on list cards.
4. **Activity points** = derived in `activityPointsOf()` — never store separately; keep home/leaderboard/assistant in sync.
5. **Registration locks** once `matchesForComp(compId).length > 0`.
6. **Persian-first RTL**, mobile-first, max content width 480px (`app/layout.tsx`).

---

## Product docs (`docs/`)

Strategy/spec PRDs — use for *what* to build, not *where* code lives:

| Doc | Topic |
|---|---|
| `08-prd.md` | Product overview |
| `12-tech-approach.md` | Technical direction |
| `15-competition-engine.md` | Bracket engine |
| `18-admin-panel-prd.md` | Admin UX |
| `23-design-direction.md` | Visual design |
| `26-gamenet-platform-plan.md` | Gamenet phases |
| `27-challenge-ladder-prd.md` | Play Arena |
| `27-team-format-plan.md` | 2v2 teams |
| `28-execution-plan.md` | Sprint order |

---

## Maintenance

Update this file when you:
- Add a new major feature area (new `app/` section or `lib/` module)
- Add a new blob type or admin hub
- Move/rename core files (`store.ts`, `persistence.ts`, main admin paths)

Do **not** duplicate `CLAUDE.md` deploy warnings or Iran constraints here — they stay in the always-applied rule.
