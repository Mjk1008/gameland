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

## Phase A — Foundation (auth + sessions + data store)

- [ ] NextAuth route + credentials provider (phone + OTP stub)
- [ ] Login page `/login` (phone → OTP step)
- [ ] Signup page `/signup` (new user: name, tag, city, primary discipline)
- [ ] Session context + logout
- [ ] Add `users`, `attempts`, `seeds`, `bracket_matches`, `notifications` to in-memory store (DB schema already exists in `supabase/migrations/`)
- [ ] Middleware: redirect un-authed users away from gated pages
- [ ] Role check helper

## Phase B — Gamer flows

- [ ] Profile edit `/me/edit` (Gamer Bank — city, disciplines, contact, play-style)
- [ ] My dashboard `/me` (registrations, notifications, roadmap shortcuts)
- [ ] Tournament registration `/competitions/[id]/register` — buy 1–6 attempts (legal-safe coin model, not cash)
- [ ] My competitions `/me/competitions` — list of registered events
- [ ] Bracket view `/competitions/[id]/bracket` — preliminary brackets + final
- [ ] My roadmap `/competitions/[id]/me` — per-player view: which seed, which match next
- [ ] Honors page is already part of `/players/[tag]` — verify ingest

## Phase C — Admin / organizer panel

- [ ] Admin layout `/admin/*` with role-gate
- [ ] Admin dashboard `/admin` — active events, recent registrations, pending results
- [ ] Event list `/admin/events`
- [ ] Event create `/admin/events/new` — discipline, dates, prize, format, tier, sponsors
- [ ] Event detail `/admin/events/[id]` — participants, brackets, status controls
- [ ] Bracket generator `/admin/events/[id]/draw` — 1–6 prelim brackets, seed top N to final
- [ ] Result entry `/admin/events/[id]/results` — pick winner per match → triggers ranking + notif
- [ ] Gamer admin `/admin/gamers` — search, multi-account detection flags
- [ ] Notification composer `/admin/notify` — send to filtered audience

## Phase D — Notifications

- [ ] Notification entity (id, recipient_id, channel, type, payload, status)
- [ ] In-app notification bell on header
- [ ] Notification list `/me/notifications`
- [ ] SMS adapter (Kavenegar, stub mode if no API key)
- [ ] Triggers: registration confirmed, draw published, match in N min, result entered, you advance

## Phase E — Landing for non-authed

- [ ] Better landing `/` for guests (hero, value props, "register / login" CTAs)
- [ ] Auth-aware home: if logged in → show dashboard; if not → show landing

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
