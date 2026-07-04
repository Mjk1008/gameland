# 18 — Admin Panel PRD (Event Execution, V1)

**Stage:** Build · **Status:** 📝 draft (2026-07-04) · **Owner:** founder
**Refs:** [`08-prd`](08-prd.md) · [`15-competition-engine`](15-competition-engine.md) · [`17-mvp-build-plan`](17-mvp-build-plan.md)

> This PRD scopes the **admin/organizer panel** needed to run Gameland's **first fully-online tournament end-to-end** — from event creation through registration, draw, bracket play, and final ranking. It is the system-of-record that turns a live competition into **real ranking points and player honors**, which is the whole reason the platform exists.

---

## 1. Executive Summary

We're building the **event-execution admin panel** for organizers so they can run a complete online tournament — create the event, take registrations, draw brackets, record every match result, and finalize standings — which will **populate the leaderboard and player Gamer-Bank honors with real data for the first time**, converting Gameland's ~2,000-gamer offline base into a live, ranked community.

The app has the *shell* of this (create event, draw, prelim advance/eliminate) but **cannot currently produce a ranked result**: there is no per-match result UI, no final-bracket assembly, no final-placement entry, and nothing feeds the `leaderboard` view. This PRD closes that gap.

---

## 2. Problem Statement

### Who has this problem?
**Arian (founder/organizer)** and future organizers who need to run a real competition on the platform — not a demo.

### What is the problem?
The admin panel can *start* an event but cannot *finish* one. Specifically, after audit of the live app (2026-07-04):

- **The draw only builds 6 preliminary brackets.** There is no final (128-player) bracket assembled from the seeds. `generateBracketDraw` stops at brackets 1–6.
- **There is no UI to record a match winner.** `POST /api/admin/match` + `setMatchWinner()` exist, but the only admin control is the coarse per-registration `advance/eliminate` (`ResultControls`). The bracket page is read-only.
- **Nothing produces final placements.** `storePlacement()` exists in the store and the DB has `app_placements` + the `leaderboard` view + `points_for_placement()`, but **no admin flow ever calls `storePlacement()`**. So the leaderboard and player honors stay empty forever.
- **Event status is frozen at creation.** `updateEventStatus()` exists but no admin UI/API calls it. Registration cannot be closed; an event cannot be marked live or done.
- **The create form has no machine time.** Only a free-text `date`. The DB now has `starts_at` / `reg_deadline` / `max_players` but the form never sets them — so scheduled alerting is impossible.

### Why is it painful?
Without a finish line, the platform's core promise — **persistent ranking + honors** ([`14-ranking-design`](14-ranking-design.md)) — is unreachable. Every prior phase (auth, registration, brackets, DB) is wasted until an event can produce a ranked result.

### Evidence
- Code audit this session: `lib/bracket.ts` builds prelims only; no `storePlacement` call anywhere in `app/api/**`; `updateEventStatus` has zero callers outside the store.
- DB verified live (`[db] hydrated: 2 users …`) with `leaderboard` view returning **0 rows** because `app_placements` is empty.
- Founder mandate ([`gameland-project` memory](../README.md)): "current build focus = ranking + Gamer Bank + proper competition execution + notifications."

---

## 3. Target Users & Personas

### Primary: Organizer / Admin (Arian)
- **Role:** Runs the tournament; sole operator for event #1.
- **Tech level:** Medium — comfortable with dashboards, not a developer.
- **Goal:** Run a clean online event with minimal clicks and produce a trustworthy final ranking.
- **Pain:** Manual coordination over WhatsApp today; wants the app to be the single source of truth and to auto-notify players at each stage.

### Secondary: Gamer (consumer of admin output)
- Sees the *result* of every admin action: registration confirmation, draw notification, their bracket/roadmap, match results, and their final rank + honors + leaderboard position.
- Every admin capability below has a **user-facing mirror** (§5.3).

---

## 4. Strategic Context

- **Why now:** DB is live on Liara (2026-07-03). The last blocker to a real event is the admin finish-line. Event #1 is the wedge that seeds ranking from the existing 2,000-gamer base.
- **Auth pivot:** Login moves from phone+OTP to **Google Auth** (founder decision, 2026-07-04), superseding [`17`](17-mvp-build-plan.md) Phase A. Admin role is granted by allow-list (see §9). This unblocks the user-facing personalization that the admin output feeds.
- **Execution mode (locked):** Event #1 runs **fully online on the app** — every match result entered in-app, winners auto-advance, final standings derived from the bracket. This maximizes fidelity of the ranking data.
- **Competitive:** Smoothcomp (structural twin) wins on offline-first persistent ranking; our online bracket + auto-ranking is table stakes to match it.

---

## 5. Solution Overview

### 5.1 The Event Lifecycle (state machine)

The admin panel is organized around one event moving through states. Each transition is an explicit admin action and fires participant alerts.

```
  draft ──▶ open ──▶ closed ──▶ drawn ──▶ live ──▶ completed
 (soon)   (reg on) (reg off) (bracket) (playing) (ranked)
```

| State | Meaning | Admin can | Gamer sees |
|-------|---------|-----------|------------|
| **draft/soon** | created, not yet open | edit event, open registration | "به‌زودی" teaser |
| **open** | registration open | close reg, edit, register-on-behalf | register button, attempt picker |
| **closed** | registration ended | run draw, reopen | "ثبت‌نام بسته شد" |
| **drawn** | brackets generated | enter match results, go live | their bracket + roadmap |
| **live** | matches in progress | enter match results, complete | live bracket, match-ready alerts |
| **completed** | final standings set | (locked) view results | final rank, honors, leaderboard update |

### 5.2 Admin capabilities (mapped to lifecycle)

1. **Create / edit event** — title, discipline, tier, format, prize, max players, **machine start time + registration deadline** (for alerts), display date, initial status.
2. **Manage registrations** — view registrants; **register a gamer on their behalf** (for the 2,000-base players who aren't online yet); remove a registration.
3. **Open / close registration** — explicit toggle; closing blocks new registrations and enables the draw.
4. **Run the draw** — assemble 6 prelim brackets **and the final bracket from seeds**; notify all.
5. **Record match results** — per-match winner + score UI on the bracket; winner auto-advances; bracket champions become seeds into the final.
6. **Finalize standings** — when the final bracket resolves, **derive placements automatically** (champion, runner-up, top-4, top-8 …) → write to `app_placements` → refresh `leaderboard`. Admin can review/override before locking.
7. **Alerting** — automatic participant notifications at each milestone (registration, draw, match-ready, advance/eliminate, result, final rank) + scheduled reminders from `starts_at` / `reg_deadline`.

### 5.3 What the user sees (mirror of each admin action)

| Admin action | User-facing reflection |
|--------------|------------------------|
| Opens registration | Event shows "ثبت‌نام باز" + register CTA |
| Closes registration | CTA disabled; "منتظر قرعه‌کشی" |
| Runs draw | Push + their bracket populated in `/competitions/[id]/me` |
| Records a match | Bracket updates live; win/loss alert |
| Finalizes standings | Final rank on profile, honors added, **leaderboard position updates** |

This ordering is deliberate: **build admin capability first, then wire the exact user-facing view it produces** (per founder's request in this session).

---

## 6. Success Metrics

**Primary:** One event completes the full lifecycle and produces ≥1 non-empty row in the `leaderboard` view. (Binary: can we finish an event? Today = no.)

**Secondary:**
- 100% of participants receive a notification at every milestone they're involved in.
- Final placements for a completed event match the bracket outcome with 0 manual corrections needed (auto-derivation is correct).
- Admin completes a full 16-player test event in < 15 minutes of clicks.

**Guardrail:**
- No match result can be entered for a player not in that match (`INVALID_WINNER` enforced — already present).
- No double-registration (unique `(user_id, comp_id)` — already enforced in DB).

---

## 7. User Stories & Requirements

Legend: **[EXISTS]** works today · **[GAP]** must build · **[FIX]** exists but broken/incomplete.

### Epic
> We believe that completing the admin event-execution flow (draw→match results→final standings→ranking) will let Gameland run its first real online tournament and populate the leaderboard, because today the app can start but not finish an event. Success = one event reaches `completed` with a non-empty leaderboard.

### Capability A — Event creation & editing
- **A1 [EXISTS]** Create event with title, season, disc, tier, prize, teams, format, date, status.
- **A2 [GAP]** Create form also captures `starts_at`, `reg_deadline`, `max_players` (datetime pickers). Persisted to the columns that already exist.
- **A3 [GAP]** Edit an existing event (`PATCH /api/admin/events/[id]`), including status transitions.
  - AC: editing prize/time/format updates the event and the user-facing detail page; status change fires the right alert.

### Capability B — Registration management
- **B1 [EXISTS]** Gamer self-registers with 1–6 attempts.
- **B2 [GAP]** Admin registers a gamer on their behalf (pick user + attempts) — for offline/2,000-base players.
- **B3 [GAP]** Admin removes a registration (before draw).
- **B4 [GAP]** Registration is blocked when status ≠ `open` or past `reg_deadline`.
  - AC: attempting to register a closed event returns a clear error, both API and UI.

### Capability C — Status transitions
- **C1 [GAP]** Open registration (draft→open), Close registration (open→closed), Go live (drawn→live), Complete (live→completed).
  - AC: each is a single admin control calling `updateEventStatus()` (already persists) + an `POST /api/admin/event-status` route; each fires a broadcast to participants.

### Capability D — Draw
- **D1 [EXISTS]** Generate 6 prelim brackets from registrations; notify all.
- **D2 [GAP]** Assemble the **final bracket** from prelim seeds (up to 3 per gamer, 128-cap per [`15`](15-competition-engine.md)).
- **D3 [FIX]** Re-draw guard: warn/confirm if a draw already exists (matches are cleared on re-draw).

### Capability E — Match results (online core)
- **E1 [EXISTS-API]** `setMatchWinner()` records winner+score, auto-advances. **[GAP-UI]** No admin UI.
- **E2 [GAP]** Bracket-match result UI: admin taps a match → picks winner → enters score → saves. Bracket re-renders; next match becomes `ready`.
  - AC: winner propagates to the correct next-round slot; a bracket champion is flagged as a seed and pushed to the final bracket.
- **E3 [GAP]** Match result fires `match_ready` alert to the two players of any newly-`ready` match.

### Capability F — Finalize standings & ranking (the point)
- **F1 [GAP]** When the final bracket resolves, **derive final placements** (rank 1..N by elimination round) and call `storePlacement()` for each → `app_placements`.
- **F2 [GAP]** Admin review screen: shows derived standings, allows manual override of any rank before **locking** the event to `completed`.
- **F3 [GAP]** On completion, leaderboard + player honors reflect the new points (via the existing `leaderboard` view + `points_for_placement()`); champion notification sent.
  - AC: after completing a test event, `SELECT * FROM leaderboard` returns rows; the champion's profile shows the honor; the home hero shows the champion.

### Capability G — Alerting / scheduling
- **G1 [EXISTS]** In-app + push notifications on registration, draw, advance/eliminate, broadcast.
- **G2 [GAP]** Scheduled reminders derived from `reg_deadline` (e.g., "24h to reg close") and `starts_at` ("event starts in 1h").
- **G3 [EXISTS]** Notification center + unread badge.

### Capability H — Auth (cross-cutting, separate track)
- **H1 [GAP]** Google Auth replaces OTP (store scaffolding `upsertGoogleUser` / `userNeedsProfile` already added). Admin role via allow-list.
- **H2 [GAP]** First-login profile completion (tag, city, primary discipline) before a Google user can register.

---

## 8. Out of Scope (V1)

- **Offline/hybrid result entry** — event #1 is fully online (locked §4). Simple final-standings-only entry deferred.
- **Coins/wallet gating** — attempts are free in V1 (coins are V2; registration currently deducts coins — will be relaxed for the first event).
- **Bulk import of the 2,000-gamer DB** — admin-register-on-behalf (B2) covers event #1; bulk CSV import is a fast-follow.
- **Multi-organizer permissions, audit log, disputes/appeals** — single trusted operator for event #1.
- **Automatic bracket seeding by rank** — random draw is fine until ranking data exists.
- **Gamenet / store / AI bot** — Phase 2+ ([`09-roadmap`](09-roadmap.md)).

---

## 9. Dependencies & Risks

### Dependencies
- **DB live** ✅ (Liara `gameland-db`, schema applied 2026-07-03).
- **Google OAuth credentials** — Client ID/Secret from Google Cloud Console + `NEXTAUTH_URL` (already set). Blocks H1.
- **Final-bracket logic** in `lib/bracket.ts` — extend to assemble + resolve the final (D2, F1).

### Risks & mitigations
- **R1 — Ranking never populates (current state).** Mitigation: F1–F3 are the top build priority; verify with a seeded 16-player test event that `leaderboard` returns rows.
- **R2 — Bracket edge cases (byes, odd counts, re-draw).** Mitigation: power-of-2 padding exists; add explicit tests (spec-table oracle + Playwright per the agreed anti-data-leak test plan).
- **R3 — Write-through race under FK constraints.** Registrations/placements reference users/events; ensure referenced rows are persisted first (action ordering holds across requests).
- **R4 — Admin mis-enters a result.** Mitigation: F2 review+override before lock; match entry validates winner ∈ match.

---

## 10. Open Questions

1. **Prize display vs. legal framing** — keep sponsor-funded framing on the admin form? (Per [`11-risks`](11-risks.md): prizes must be sponsor-funded, not entry-pool.) → default: yes, keep the disclaimer.
2. **Attempts in a free V1** — do we keep the 1–6 attempt mechanic for the online event, or fix at 1 for simplicity? → proposed: keep 1–6 (it's the differentiator), just don't charge coins.
3. **Final-placement granularity** — rank every participant, or only top-8 + "reached prelims"? → proposed: rank all seeds/finalists precisely, bucket the rest.
4. **Admin allow-list mechanism** — env var list of Google emails, or a DB `role` flag set manually? → proposed: DB `role`, seeded for the founder's Google email on first login.

---

## Build order (derived from this PRD)

1. **Google Auth** (H1, H2) — unblocks real users + admin identity.
2. **Status transitions** (C1) + **create-form machine time** (A2) — event can move through its lifecycle.
3. **Match result UI** (E1–E3) — the online core.
4. **Final bracket + placement derivation + ranking** (D2, F1–F3) — **the finish line; highest value.**
5. **Registration management** (B2–B4) + **edit** (A3) + **scheduled alerts** (G2) — fast-follow polish.

> Then, per founder direction, align each user-facing view to the admin capability that feeds it (§5.3).
