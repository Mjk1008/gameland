# Behavioral Analytics + Admin Dashboard — PRD

## 1. Executive Summary

We're building a self-hosted behavioral event pipeline (page views, taps, funnel steps, journeys) plus a new admin dashboard for Arian to answer "what are users actually doing in the app since launch" — which the existing `/admin/analytics` (outcome counts: regs by city/disc/status) and `/admin/ai` (chat usage) cannot answer, because neither logs *behavior*, only *end states*. Result: Arian can see exactly where in each funnel (signup→profile→ticket→pay→approval→draw) users drop off, what paths they actually take, and how that connects to AI assistant use — and can act on it (fix the step that's bleeding users) instead of guessing.

## 2. Problem Statement

**Who:** Arian (founder, sole admin/PM), 8 days post-launch, ~10k expected users.

**What:** The app has zero behavioral instrumentation. `/admin/analytics` shows *who registered* (city/discipline/status breakdown) and `/admin/ai` shows *chat volume/cost*. Neither shows *how users got there or where they gave up*. If registration conversion is low, there's no way to tell whether users bounce at `/welcome` (profile form), at ticket selection, at the payment/receipt step, or after admin rejection — each has a completely different fix.

**Why painful:** Every product decision right now ("simplify the profile form," "the pay page is confusing," "rejections aren't being re-attempted") is a guess. The registration flow already has 5+ steps with a manual-receipt payment step that's a known friction point (external bank transfer) — exactly the kind of flow that silently leaks users at one specific step, and nobody can currently see which one.

**Evidence:** Codebase inspection — `lib/store.ts` / `persistence.ts` have zero event/pageview writes; the only timestamped, per-user behavioral signal that exists at all is `app_ai_messages` (chat). Registration funnel (`signup → /welcome profile → pick tickets → /pay receipt → admin approve/reject → draw`) has no instrumentation between steps.

## 3. Target User

**Primary (and only) persona:** Arian Kordi — founder, sole admin, non-technical consumer of the dashboard. He needs answers in plain numbers/bars on a phone-sized admin screen, in Persian, not raw SQL or a BI tool.

## 4. Strategic Context

Launched 8 days ago for a ~10k-user cohort — this is the highest-leverage window to catch a broken funnel step before the cohort is gone. No competitive angle here; this is internal tooling. Why now: registration/payment is the single flow every gamer must clear to reach the product's actual value (competing), so it's the first thing worth instrumenting.

## 5. Solution Overview

**Event pipeline (mirrors the existing `app_ai_messages` pattern — no new infra class):**
- New table `app_events` via the existing self-heal block in `persistence.ts`: `(id, user_id NULL, session_id, name, path, props JSONB, created_at)`. `user_id` nullable — pre-auth funnel steps (landing, signup_start) have no user yet.
- `POST /api/track` — accepts a small batch `[{name, path, props}]`, stamps `session_id` from a first-party cookie (no third-party ID), writes via `persist.event.insertAsync` (same awaitable-write pattern as `reg.insertAsync`). Never hydrated to RAM — write-only from the app's perspective, read-only via aggregate SQL for the dashboard, exactly like `statsSince()` does for AI messages today.
- Client instrumentation: one small hook (`lib/track.ts`) — `track(name, props?)`. Buffers in memory, flushes on a 3s timer + `visibilitychange`/`pagehide` via `navigator.sendBeacon`. A root-layout listener fires `pageview` on route change (Next.js `usePathname`). No CDN, no external script — bundled with the app like everything else.
- **Funnel events to instrument first (registration→approval, the flow named in the problem statement):** `signup_start`, `signup_complete`, `profile_complete`, `ticket_select {compId, tickets}`, `pay_page_view {compId}`, `receipt_submit {compId}`, `reg_approved` / `reg_rejected` (fired server-side from the existing admin approve/reject handlers — free, no client dependency), `bracket_view`.
- Nav taps: generic `tap {label}` event fired from the shared `Button`/`BottomNav` components in `components/ui.tsx` — instrument once at the shared-component level, not per page, so coverage stays complete as pages are added.

**Admin dashboard — new `/admin/behavior` (separate tab from the existing `/admin/analytics`, which stays as-is for outcome counts):**
1. **Funnel view** — the registration funnel as an ordered bar chain (hand-rolled divs, matching the existing no-chart-library convention in `admin/analytics/client.tsx`), each step's count + conversion % from the previous step, so the exact drop-off step is visible at a glance. Filterable by discipline/city like the existing analytics page.
2. **Top paths** — most common `path` sequences per session (grouped SQL, top 10).
3. **DAU/WAU** — distinct `user_id`/`session_id` per day, last 14 days, as a simple sparkline-style bar row.
4. **Chat tie-in** — join `app_ai_messages` activity into the same view: % of users who hit the funnel after an assistant conversation vs. without one.

## 6. Success Metrics

- **Primary:** Arian can name the single highest-drop-off step in the registration funnel within 5 minutes of opening `/admin/behavior` — currently impossible (0 visibility today).
- **Secondary:** DAU trend visible for the first time; assistant-to-registration correlation visible.
- **Guardrail:** no measurable prod impact — no memory growth in the single instance (event table is write-only, never hydrated), no added latency on the critical path (tracking calls are fire-and-forget, batched, never block registration/payment requests).

## 7. User Stories

**Epic hypothesis:** We believe instrumenting the registration funnel and building a drop-off dashboard will let Arian identify and fix the single worst-converting step, because right now zero behavioral data exists to find it.

- **Story 1 — Event capture.** As the app, I log a funnel/nav event for every key step without blocking the request, so instrumentation never risks the live flow. AC: tracking failures never surface to the user; write is fire-and-forget from the client, awaited-but-non-blocking server-side.
- **Story 2 — Funnel dashboard.** As Arian, I see the registration funnel as ordered steps with counts and % conversion between them, so I know exactly where users quit. AC: matches existing admin visual style; filterable by discipline/city; date-range default = since launch.
- **Story 3 — Top paths.** As Arian, I see the most common navigation sequences, so I understand real usage vs. assumed usage.
- **Story 4 — DAU.** As Arian, I see daily/weekly active users, so I know if engagement is growing or fading.
- **Story 5 — Chat correlation.** As Arian, I see whether assistant usage precedes successful registration, so I know if the assistant is actually helping conversion.

## 8. Out of Scope (v1)

- Session-replay / heatmaps — not worth the storage or complexity for a 10k-user app; funnel + top-paths covers the actionable need.
- Cohort retention curves, A/B testing framework — premature before the funnel itself is fixed.
- Client-side error/crash tracking — separate concern from behavioral analytics, not this PRD.
- Any third-party analytics SaaS — blocked by the Iran-hosting constraint, full stop.

## 9. Dependencies & Risks

- **Dependency:** none external — self-heal schema pattern already exists in `persistence.ts`; ships with the next deploy like any other table.
- **Risk — write volume on the single instance.** Nav-tap + pageview events at 10k users could be a lot of small INSERTs. Mitigation: client-side batching (flush every 3s, not per-event), and if volume proves too high after real data comes in, sample pageviews (e.g. 1-in-N) while keeping 100% of named funnel events (those matter more and are far lower volume).
- **Risk — PII leakage into `props` JSONB.** Mitigation: allow-list the event schema in `lib/track.ts` — no free-form user text (no receipt content, no chat text, no phone numbers) ever goes into `props`; if a future event genuinely needs a user-entered value, it's screened at the call site, not left to whoever adds the next `track()` call.

## 10. Privacy & Retention

- No IP address stored. `session_id` is a random first-party cookie value, not derivable to a device fingerprint.
- Admin-only access (`/admin/behavior` behind the existing admin auth gate).
- Retention: raw `app_events` rows kept 90 days; the dashboard's aggregate views (daily counts, funnel snapshots) have no PII and can be kept indefinitely. Purge job is a manual `DELETE ... WHERE created_at < now() - interval '90 days'` run ad hoc (no cron infra exists yet — matches "no new infra" constraint).

## 11. Rollout Plan (no schema migrations, no scale-out — matches prod risk profile)

1. **Phase 1:** `app_events` table (self-heal) + `/api/track` + `lib/track.ts` client hook + server-side `reg_approved`/`reg_rejected` events (free, no client needed) + the 8 registration-funnel client events. Deploy, verify writes land (spot-check via the same read-only DB pattern already used for `app_ai_messages`).
2. **Phase 2:** `/admin/behavior` — funnel view first (highest value, answers the actual question asked), then top-paths + DAU.
3. **Phase 3:** generic `tap` event wired into shared `Button`/nav components for full nav coverage; chat-correlation view.

## 12. Open Questions

- Sampling threshold for pageviews, if write volume becomes a real concern — decide with real Phase-1 data, not guessed up front.
- Whether `bracket_view`/post-registration events (post-approval engagement) deserve their own funnel — parked until Phase 1 data shows whether pre-approval drop-off is in fact the bigger problem.
