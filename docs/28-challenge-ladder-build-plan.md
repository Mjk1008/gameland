# 28 — Play Arena Build Plan («میدون»)

**Stage:** Build · **Status:** Phase 0 done · **Next:** Phase A′ (metrics) → A (schema) → …
**PRD:** [`27-challenge-ladder-prd.md`](27-challenge-ladder-prd.md) — read before coding.

**Principles:** same as rest of app — self-heal schema, store write-through, no RAM source-of-truth, `ARENA_ENABLED` kill switch, portal modals, newest-first lists.

---

## Overview — phase map

```
Phase 0   Nav + placeholder + docs          ✅ done
Phase A′  Arena funnel events (track)         ← do first (measure from day 1)
Phase A   Schema + arena-config.ts
Phase B   lib/arena.ts store layer
Phase C   API routes
Phase D   UI (feed → post → match → inbox)
Phase D′  Points merge (4 call sites)
Phase E   Notifications
Phase F   Admin /admin/arena + behavior funnel UI
Phase G   Launch (ARENA_ENABLED=true)
```

**Deploy rhythm:** push after each phase; verify on Liara or local prod. Don't batch D+D′+E without QA checkpoint.

---

## Phase 0 — Nav + placeholder ✅

- [x] PRD 27 rewritten (founder direction 2026-08-06)
- [x] Bottom nav `/invite` → `/arena` «میدون»
- [x] `/arena` placeholder page
- [x] `/me` → `/invite` link (referral preserved)
- [x] `CLAUDE.md` §7 arena note
- [x] Assistant allowed routes includes `/arena`

**Not in Phase 0:** schema, APIs, real feed.

---

## Phase A′ — Instrumentation (before feature logic)

**Why first:** without funnel events, «فقط درخواست زیاد» is invisible until too late.

### Tasks
- [ ] Add arena event names to `web/lib/track.ts` allow-list (if exists) or document in comment block
- [ ] Events (client): `arena_tab_open`, `arena_feed_view`, `arena_request_create`, `arena_request_accept`, `arena_pair_confirm`, `arena_book_complete`, `arena_result_confirm`
- [ ] Server-side: `arena_points_awarded` from match confirm handler (when built)
- [ ] Extend `/admin/behavior/content.tsx` — second funnel block «میدون» (can show zeros until Phase D)
- [ ] Deploy + verify events land in `app_track_events` (or whatever table `persist.track` uses)

**Done when:** tab open on placeholder fires `arena_tab_open` and appears in admin behavior.

---

## Phase A — Schema + config

### Files
| File | Change |
|------|--------|
| `web/lib/db/init.sql` | `app_play_requests`, `app_play_matches` |
| `web/lib/db/persistence.ts` | self-heal `CREATE TABLE IF NOT EXISTS` |
| `web/lib/db/schema.ts` | Drizzle mirror |
| `web/lib/arena-config.ts` | **new** — all tunables |

### `arena-config.ts` (single source)
```ts
export const ARENA_REQUEST_TTL_HOURS = 72
export const ARENA_CONFIRM_WINDOW_HOURS = 48
export const ARENA_AGREED_ABANDON_HOURS = 72      // agreed → no book
export const ARENA_MAX_OPEN_REQUESTS = 2
export const ARENA_MAX_OPEN_PER_DISC = 1
export const ARENA_REQUEST_COOLDOWN_HOURS = 24
export const ARENA_FRAUD_RATIO_REQUESTS = 3     // : 0 confirmed → throttle
export const ARENA_FRAUD_COOLDOWN_HOURS = 72
export const ARENA_WIN_POINTS_BO1 = 5             // founder default; Bo3/5 = 10
export const ARENA_WIN_POINTS_BO3 = 10
export const ARENA_MAX_SCORED_WINS_PER_30D = 3
export const ARENA_NOTE_MAX_LEN = 80
export const ARENA_SLOT_DAYS = 7
export const ARENA_SLOT_WINDOWS = [               // local Iran time, start hour
  { start: 10, end: 13 }, { start: 13, end: 16 },
  { start: 16, end: 19 }, { start: 19, end: 22 },
] as const
```

### Helper
- [ ] `web/lib/arena-slots.ts` — pure: generate slot ISO timestamps from config + now

**Done when:** tables exist on live DB (`~/.glq` `\dt app_play*`), no UI yet.

---

## Phase B — Store (`web/lib/arena.ts`)

New module; `store.ts` re-exports thin wrappers if needed. Pattern: sync read from memory cache optional — **prefer direct persist read for v1** to avoid RAM drift (arena is new, low volume).

### Functions

| Function | Behavior |
|----------|----------|
| `createRequest(uid, {disc, bestOf, city, province, note})` | limits + fraud check |
| `listOpenRequests(filters)` | city, province, disc?, status=open |
| `expireStaleRequests()` | lazy on list |
| `acceptRequest(requestId, acceptorId)` | create match pending_confirm; request→matched |
| `confirmPair(matchId, uid)` | set side timestamp; both → agreed |
| `proposeBook(matchId, uid, {gamenetId, scheduledAt})` | book_initiator; wait other confirm |
| `confirmBook(matchId, uid)` | both same proposal → scheduled + confirm_deadline |
| `submitResult(matchId, uid, winnerId)` | requester_result / acceptor_result |
| `lapseStaleMatches()` | lazy sweep |
| `cancelMatch(matchId, uid)` | before scheduled |
| `myArenaSummary(uid)` | inbox DTO |
| `challengePointsOf(uid)` | derived caps |
| `arenaFraudRatio(uid)` | SQL COUNT 30d |
| `verifiedGamenetsForPicker(city, province)` | sort province-first |

### Persistence additions (`persistence.ts`)
- [ ] `persist.playRequest.*Async`
- [ ] `persist.playMatch.*Async`

**Done when:** unit-testable via curl against Phase C (or temporary script).

---

## Phase C — API routes

All check `process.env.ARENA_ENABLED === 'true'` else 404 JSON.

| Method | Route | Body |
|--------|-------|------|
| POST | `/api/arena/requests` | `{ disc, bestOf, city, province, note? }` |
| GET | `/api/arena/requests` | query: `city, province, disc?` |
| POST | `/api/arena/requests/[id]/accept` | — |
| POST | `/api/arena/matches/[id]/confirm-pair` | — |
| POST | `/api/arena/matches/[id]/book` | `{ gamenetId, scheduledAt }` |
| POST | `/api/arena/matches/[id]/confirm-book` | — |
| POST | `/api/arena/matches/[id]/result` | `{ winnerId }` |
| POST | `/api/arena/matches/[id]/cancel` | — |
| GET | `/api/arena/my` | inbox |

**Auth:** session required; `uid` from NextAuth.

**Done when:** Postman/curl full loop without UI.

---

## Phase D — UI

Replace `/arena/page.tsx` placeholder.

| Route | Component | Notes |
|-------|-----------|-------|
| `app/arena/page.tsx` | Feed + filters | client wrapper for filters |
| `app/arena/new/page.tsx` | Post form | |
| `app/arena/requests/[id]/page.tsx` | Detail + accept | |
| `app/arena/matches/[id]/page.tsx` | Match flow | state machine UI |
| `app/me/arena/page.tsx` | Inbox | link from `/me` tile |

### UI rules
- No free-text for time or venue — slot buttons + gamenet list only
- Filters persist in URL query (`?city=&province=&disc=`)
- Default city/province from user profile on first load
- Modals portalled to `document.body`
- Persian copy per PRD §7.5 notifications tone

### Components (suggested)
- `app/arena/feed-client.tsx`
- `app/arena/request-card.tsx`
- `app/arena/filters.tsx`
- `app/arena/match-flow.tsx`
- `app/arena/gamenet-picker.tsx`
- `app/arena/slot-picker.tsx`

**Done when:** manual QA happy path on two test accounts.

---

## Phase D′ — Ranking integration

- [ ] `challengePointsOf` in `lib/arena.ts`
- [ ] Add term at: `app/page.tsx`, `app/leaderboard/page.tsx`, `app/me/page.tsx`, `app/players/[id]/page.tsx`
- [ ] Breakdown line «امتیاز میدون» on `/me` + `/players/[id]`

**Done when:** confirmed win moves rank slightly; cap at 3 wins/30d verified.

---

## Phase E — Notifications

Wire in match handlers (same pattern as team invite in `store.ts`):
- accept, confirm pair, book proposal, scheduled, confirmed, lapsed

**Done when:** both test phones receive correct Persian copy.

---

## Phase F — Admin

- [ ] `/admin/arena/page.tsx` — fraud ratio table (30d requests / confirmed)
- [ ] `/admin/behavior` — arena funnel bars (Phase A′ extended)

Read-only v1 — no suspend button.

---

## Phase G — Launch

1. [ ] Manual QA checklist (below) all green on staging/local prod
2. [ ] `liara env set ARENA_ENABLED=true --app gameland`
3. [ ] Deploy; smoke test production with two real accounts
4. [ ] Watch `/admin/behavior` arena funnel for 48h

**Rollback:** `ARENA_ENABLED=false` — instant, no migration rollback needed.

---

## Manual QA checklist

### Core loop
- [ ] A posts Bo3 in Tehran; B (Isfahan profile) filters Tehran, accepts
- [ ] Both confirm pair → book gamenet in Tehran → scheduled
- [ ] Both confirm same winner → points on both profiles; loser gets 0

### Edge cases
- [ ] A tries accept own request → rejected
- [ ] Third open request → rejected
- [ ] Result mismatch → lapsed, no points
- [ ] One side silent past deadline → lapsed
- [ ] Fraud account: 4 requests 0 confirm → throttled

### Regression
- [ ] `/invite` from `/me` works; `?ref=` stored
- [ ] Tournament reg flow untouched
- [ ] Bottom nav: میدون active state

### Kill switch
- [ ] `ARENA_ENABLED=false` → APIs 404, placeholder or hidden CTA

---

## File checklist (create/modify)

```
web/lib/arena-config.ts          NEW
web/lib/arena-slots.ts           NEW
web/lib/arena.ts                 NEW
web/lib/db/init.sql              MODIFY
web/lib/db/persistence.ts        MODIFY
web/lib/db/schema.ts             MODIFY
web/lib/track.ts                 MODIFY (events)
web/app/api/arena/**             NEW (~8 routes)
web/app/arena/**                 MODIFY/NEW
web/app/me/arena/page.tsx        NEW
web/app/admin/arena/page.tsx     NEW
web/app/admin/behavior/content.tsx MODIFY
app/page.tsx + leaderboard + me + players/[id]  MODIFY (points)
```

---

## Referral — do not break

| Piece | Location | Action |
|-------|----------|--------|
| `?ref=` capture | `BottomNav.tsx` | keep |
| Rewards | `store.ts` `grantReferralRewards` | keep |
| Ticket referrer field | `register/form.tsx` | keep |
| Campaign UI | `/invite` | keep, entry from `/me` only |

---

## Estimated effort (solo dev)

| Phase | Effort |
|-------|--------|
| A′ | 0.5 day |
| A | 0.5 day |
| B | 1.5 days |
| C | 1 day |
| D | 2 days |
| D′ | 0.5 day |
| E | 0.5 day |
| F | 0.5 day |
| G + QA | 0.5 day |
| **Total** | **~7–8 days** |

---

## Execution order (when founder says «برو»)

1. Phase A′ → deploy (measure tab opens immediately)
2. Phase A → deploy (schema only)
3. Phase B + C → deploy (API test)
4. Phase D → deploy (UI beta, `ARENA_ENABLED=true` for admin phones only? optional)
5. D′ + E + F → deploy
6. Phase G public launch

**Stop gate:** if Phase D beta shows accept rate <15% after 50 real requests, pause and run PoL concierge — don't add features, fix liquidity.
