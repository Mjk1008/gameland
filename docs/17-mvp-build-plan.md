# 17 — MVP Build Plan

**Stage:** Build · **Status:** 🚧 in progress (2026-06-13) · **Owner:** founder

> After audit, the current app is a UI shell with mock data. This doc lists the full MVP build to close the gap between [`08-prd`](08-prd.md) / [`15-competition-engine`](15-competition-engine.md) and the live app. Built phase by phase, deployed to Liara after each.

## Architecture decisions (locked)

- **Auth:** NextAuth Credentials provider, phone + OTP.
- **OTP dev stub:** any phone accepts OTP `123456`. Real Kavenegar wires in later via `KAVENEGAR_API_KEY` (CLAUDE.md, .env.example).
- **DB:** Postgres on Liara (later). For now: in-memory mock store extended from `mock-data.ts`, designed to be swappable with Drizzle/DB calls one entity at a time.
- **Sessions:** JWT in httpOnly cookie (NextAuth default).
- **Multi-account guard:** unique phone constraint on `players`. Same `national_id` cannot register twice.

## Roles

- `gamer` — default. Can register, view, enter competitions.
- `organizer` — runs events. Subset of admin.
- `admin` — full access to `/admin/*`.

---

## Phase A — Foundation (auth + sessions + data store) ✅

- [x] NextAuth route + credentials provider (phone + OTP stub)
- [x] Login page `/login` (phone → OTP step)
- [x] Signup page `/signup` (new user: name, tag, city, primary discipline)
- [x] Session context + logout
- [x] In-memory store with `users`, `events`, `registrations`, `notifications`
- [x] Role check (gamer / organizer / admin) in `/admin/*` layout
- [x] Seeded test users — admin (09120000000) + ZEUS gamer (09121111111), OTP 123456

## Phase B — Gamer flows ✅

- [x] Profile edit `/me/edit` (name, tag, city, disc, national ID)
- [x] My dashboard `/me` (registrations, notifications, open events, admin CTA)
- [x] Tournament registration `/competitions/[id]/register` — 1–6 attempts picker, 100 coins/attempt, legal-safe disclaimer
- [x] My competitions `/me/competitions`
- [x] Bracket view `/competitions/[id]/bracket` — 6 prelim brackets + final
- [x] My roadmap `/competitions/[id]/me` — per-attempt status + stage timeline

## Phase C — Admin / organizer panel ✅

- [x] Admin layout `/admin/*` (role-gated)
- [x] Admin dashboard `/admin` — counts + quick CTAs + event list
- [x] Event list `/admin/events`
- [x] Event create `/admin/events/new` — title, season, disc, prize, teams, format, date, status
- [x] Event detail `/admin/events/[id]` — registrations, advance/eliminate per attempt
- [x] Result entry — advance triggers seed +1, eliminate just consumes attempt
- [x] Gamer admin `/admin/gamers` — list + role badge + missing-national-ID flag
- [x] Notification composer `/admin/notify` — broadcast to all / gamers-only

## Phase D — Notifications ✅

- [x] Notification entity in store
- [x] Notification list `/me/notifications` (auto-marks read on view)
- [x] SMS adapter `lib/sms.ts` (Kavenegar with verify-lookup + raw send; dev stub when no key)
- [x] Auto-push triggers: registration, result (advance/eliminate), broadcast
- [x] BottomNav unread badge (polled via `/api/notif-count`)

## Phase E — Landing for non-authed ✅

- [x] Auth-aware home: guest hero banner ("خانهٔ گیمرهای ایران") + CTAs
- [x] Logged-in users see champion + leaderboard + active comps dashboard
- [x] BottomNav shows "ورود" for guests, "من" for logged-in

## Phase F — DB persistence ✅

- [x] Drizzle ORM + postgres-js driver, lazy connection via DATABASE_URL
- [x] Schema mirrors all runtime entities (users, events, regs, notifs, coin txns, matches, gamenets, disciplines, sponsors)
- [x] `lib/db/init.sql` — single-file migration with seed
- [x] Write-through persistence shim (reads from memory cache, writes fire-and-forget to DB, hydrates from DB on cold start)
- [x] Documented in CLAUDE.md: buyer provisions DB → applies init.sql → sets DATABASE_URL → restart

## Phase G — Coin wallet ✅

- [x] `coinBalance`, `applyCoinTxn`, `coinTxnsForUser` (append-only ledger)
- [x] `/me/wallet` — balance hero, quick topup buttons (+100/+500/+1000/+5000), txn history
- [x] `/api/wallet/topup` — Shaparak gateway stub (instant credit in dev)
- [x] Registration deducts 100 coins/attempt; `INSUFFICIENT_BALANCE` blocked
- [x] Wallet tile + balance shown on `/me` dashboard

## Phase H — Real bracket + match results ✅

- [x] `lib/bracket.ts` — deterministic shuffle into 6 prelim brackets, full bracket tree per round
- [x] `/api/admin/draw` — generates the draw, notifies all participants
- [x] `/api/admin/match` — admin records winner + score, auto-advances winner to next round
- [x] Bracket view (`/competitions/[id]/bracket`) shows real matches when drawn, placeholder otherwise
- [x] Bye handling via power-of-2 padding

## Phase I — Gamenet directory ✅

- [x] `/gamenets` directory + `/gamenets/[id]` profile
- [x] `/gamenets/new` self-registration (any authed user)
- [x] `/admin/gamenets` verify toggle
- [x] BottomNav "گیم‌نت" tab

## Phase J — Search + filter ✅

- [x] Functional discipline chips on leaderboard
- [x] Search across name / tag / city
- [x] Live counter X/Y, empty state

## Phase K — Disciplines + sponsors admin ✅

- [x] `/admin/disciplines` (admin-only add)
- [x] `/admin/sponsors` (admin-only add)
- [x] Admin layout now has 7 tabs

## Phase L — Polish ✅

- [x] `/about` (4 pillars + legal framing + contact)
- [x] `/rules` (structure / scoring / tiebreakers / financial / conduct)
- [x] `/sponsors` public listing
- [x] `/me/settings` (account, gamenet, about, logout)
- [x] `/not-found` 404 page
- [x] Footer links on home page

## Phase F — Real data + DB

- [ ] Provision Postgres on Liara
- [ ] Drizzle ORM setup with `DATABASE_URL`
- [ ] Migrate from in-memory store to Drizzle queries (one entity at a time)
- [ ] Ingest founder's ~2000 gamer DB (Excel/PDF) into `players` table
- [ ] Wire real `ranking_entries` MATVIEW refresh after result entry

---

## What's explicitly **out of scope** for this MVP

Per [`09-roadmap`](09-roadmap.md) and founder direction:
- Gamenet directory (Phase 2)
- Store / marketplace (Phase 3)
- AI support bot (Phase 3)
- Online ranking (Phase 4)
- Cafe Bazaar / Myket apps (Phase 4)

These deferral decisions are documented; don't pull them forward without an explicit founder ask.
