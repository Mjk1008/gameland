# 27 — Play Arena PRD («میدون» / «خیلی قویم»)

**Stage:** PRD · **Status:** ✅ ready for build (founder approved 2026-08-06)
**Build plan:** [`28-challenge-ladder-build-plan.md`](28-challenge-ladder-build-plan.md)
**Replaces:** PRD draft 2026-08-01 (city-gated «claim-first» flow)

> **Nav change:** bottom-nav tab **«دعوت»** → **«میدون»** (`/arena`). Referral backend unchanged (`?ref=`, ticket rewards); campaign UI moves to `/me` → `/invite`.

---

## 1. Executive Summary

A **nationwide 1v1 play-request marketplace**: any registered gamer can post or accept a casual match request, book a **verified gamenet** + time + best-of, play offline, dual-confirm the result, and earn a **small capped ranking bonus** — filling the dead time between formal tournaments without money, chat, GPS, or admin refereeing.

**North Star:** repeat between-event engagement measured by **Confirmed Challenge Rate (CCR)**, not raw request volume.

---

## 2. Problem & JTBD

### Problem
- «کری» never resolves in-app.
- No reason to open Gameland between bracket events.
- Gamenet directory exists but isn't wired to spontaneous 1v1 play.

### Jobs-to-be-done

| Job type | Job | Gameland hire |
|----------|-----|---------------|
| Functional | Find a fair 1v1 near a real venue | Open request feed + gamenet book |
| Social | Prove I'm better (with receipt) | Confirmed win on profile + امتیاز میدون |
| Emotional | Settle trash-talk / avoid WhatsApp chaos | Structured slots, no phone leak |

**Alternatives today:** Instagram/Telegram «بیا گیم‌نت» — no record, no rank.

---

## 3. Users

| Persona | Use case |
|---------|----------|
| **P1 Reza** (competitor) | Posts Bo3 FC request in his city, accepts others when bored |
| **P2 Sara** (rising) | Browses same-city requests, low-stakes practice before next event |
| **Cross-city** | Profile Ganaveh, filters Tehran while visiting, books Tehran gamenet |

**v1:** open broadcast requests only. **v2:** direct challenge from `/players/[id]`.

**Eligibility:** `role = gamer`, profile complete enough to have `discs` + city + province. Cannot accept own request.

---

## 4. Strategic decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Nationwide** — no launch-city gate |
| 2 | Default feed = **profile city**; user **filters** any city/province |
| 3 | **No GPS** — geography = profile + manual filters |
| 4 | Gamenet + time booked **after** accept + dual confirm (not at post) |
| 5 | Best-of **1 / 3 / 5** on request (locked for match) |
| 6 | Tab **«میدون»** replaces **«دعوت»**; referral demoted to `/me` |
| 7 | Points merge into **real** national total, capped (see §7.4) |
| 8 | Mismatch / no-show → **lapse** (no admin queue) |

---

## 5. User journey

### 5.1 Happy path

```
/arena (feed, default: شهر من)
  → «درخواست جدید» OR tap existing request
  → /arena/new OR /arena/requests/[id]
  → Accept (acceptor) → match pending_confirm
  → Both confirm pairing → agreed
  → /arena/matches/[id] book: slot + gamenet → scheduled
  → [offline play at gamenet]
  → Both pick winner → confirmed → +10 pts (if caps allow)
```

### 5.2 State machines

**Request (`app_play_requests.status`)**

```
open ──accept──► matched (terminal for request row)
  │
  ├── expire (72h) ──► expired
  └── cancel (owner) ──► cancelled
```

**Match (`app_play_matches.status`)**

```
pending_confirm ──both confirm pair──► agreed
  │                                      │
  │ cancel                               ├── both book same slot+gamenet ──► scheduled
  └── cancel                             │         │
                                         │         ├── both result agree ──► confirmed
                                         │         ├── result mismatch ──► lapsed
                                         │         └── past confirm_deadline ──► lapsed
                                         └── abandon ──► cancelled
```

### 5.3 Screen inventory

| Route | Purpose |
|-------|---------|
| `/arena` | Feed + filters + CTA «درخواست بذار» + badge «N درخواست شهر من» |
| `/arena/new` | Post: disc, Bo, city/province (default profile), optional note (80 chars) |
| `/arena/requests/[id]` | Detail: requester card, disc, Bo, city, note, «قبول» (if eligible) |
| `/arena/matches/[id]` | **Phase UI:** confirm pair → book → result (one screen, state-driven) |
| `/me/arena` | Inbox: my open request, pending actions, scheduled, history |

### 5.4 Feed & filters (`/arena`)

**Default on load:** `city = user.city`, `province = user.province`, `disc = all my discs OR all`.

| Filter | Control | Notes |
|--------|---------|-------|
| شهر | cascade select (`iran-geo.ts`) | default = profile city |
| استان | select | default = profile province |
| رشته | chip multi | default = my `discs`; toggle «همه رشته‌ها» |
| وضعیت | chips | open only (default) |

**Sort:** open requests → `created_at DESC` within filter. No proximity math — user explicitly picks city.

**Empty state:** «تو [city] درخواست بازی باز نیست — اولین نفر باش» + CTA.

**Request card shows:** @tag · name · disc badge · Bo · city · time ago · «قبول ›»

### 5.5 Post request (`/arena/new`)

| Field | Rule |
|-------|------|
| رشته | required; must ∈ `user.discs` |
| Best of | 1 / 3 / 5 chips |
| استان / شهر | default profile; user may change (where they want to play) |
| یادداشت | optional, max 80 chars, no phone numbers (server strip/reject) |

**Limits (server):** max 2 open requests total; 1 open per disc; 24h cooldown after expire/cancel per disc; fraud throttle (§7.3).

### 5.6 Accept & dual confirm

1. Acceptor taps **«قبول می‌کنم»** → creates `app_play_matches` row, request → `matched`.
2. **Requester** gets notif «@X درخواستت رو قبول کرد — تأیید می‌کنی؟»
3. Both tap **«تأیید بازی»** on `/arena/matches/[id]`.
4. When both timestamps set → `agreed`.

**Reject path:** either party can **«انصراف»** before `scheduled` → match `cancelled`, request stays `matched` (no re-open automatically — acceptor consumed; v1: requester must post new request).

### 5.7 Book (`agreed` → `scheduled`)

**Time slots:** fixed grid — **next 7 days** × **4 windows/day** (e.g. 10–13, 13–16, 16–19, 19–22). Stored as `scheduled_at` = window start ISO. **No free-text.**

**Gamenet picker:**
- Only `app_gamenets.status = verified` (or existing verified flag).
- Sort: (1) same city as request city, (2) same province, (3) rest of verified.
- Show: name, city, thumbnail if photo exists, stations count.
- User picks one gamenet + one slot → submits; **other player must confirm same** slot + gamenet → `scheduled`, `confirm_deadline = scheduled_at + 48h`.

**Booking UX:** initiator picks; partner sees «@X پیشنهاد داد: [gamenet] · [slot]» → **تأیید** or **پیشنهاد دیگر** (one counter-round max in v1 — if disagree after 1 counter, match `cancelled`).

### 5.8 Result (`scheduled` → `confirmed` | `lapsed`)

After `scheduled_at`, show **«کی برد؟»** — two large buttons: me / opponent (by @tag).

- Both same → `confirmed`, `winner_user_id` set, points if caps allow.
- Different → immediate `lapsed`.
- One or both silent past `confirm_deadline` → lazy sweep → `lapsed`.
- Lapse notif: neutral «این بازی بدون نتیجه بسته شد» — no blame.

---

## 6. Success metrics

### North Star
**CCR** = MAU(30d) with ≥1 confirmed match / MAU(30d). **≥8%** M1 · **≥15%** M3 · **Kill <3%** if request→accept **<15%**.

### Funnel metrics (instrument before UI ships — see build plan Phase A′)

| Step | Event name | Target conversion |
|------|------------|-------------------|
| Tab open | `arena_tab_open` | — |
| Feed view | `arena_feed_view` | — |
| Create request | `arena_request_create` | — |
| Accept | `arena_request_accept` | ≥40% of open requests get accept |
| Pair confirmed | `arena_pair_confirm` | ≥80% of accepts |
| Book complete | `arena_book_complete` | ≥50% of agreed |
| Result confirm | `arena_result_confirm` | ≥55% of scheduled |
| Points | `arena_points_awarded` | — |

### Retention
- **Arena D7 return** after first post/accept: ≥35%
- **Between-event WAU lift:** +20% vs 14d pre-launch baseline

### Guardrails
- Tournament reg rate: not −15%
- Fraud ratio p90 (requests:confirmed, 30d): not >8:0
- Support tickets: not +50%

Dashboard: new section on `/admin/behavior` (arena funnel) — same pattern as registration funnel in `docs/24`.

---

## 7. Technical requirements

### 7.1 Navigation & referral
- BottomNav tab 4: `/arena` «میدون» ✅ Phase 0
- `/invite` linked from `/me` only
- `?ref=` localStorage capture unchanged (`BottomNav.tsx`)

### 7.2 Data model

Plain `TEXT` statuses. Self-heal in `persistence.ts`. Never hydrate arena rows to RAM as source-of-truth — follow store write-through pattern.

```sql
CREATE TABLE IF NOT EXISTS app_play_requests (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  disc         TEXT NOT NULL,
  best_of      INTEGER NOT NULL DEFAULT 1 CHECK (best_of IN (1, 3, 5)),
  city         TEXT NOT NULL,
  province     TEXT NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'open',
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS play_req_feed_idx ON app_play_requests (city, disc, created_at DESC)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS play_req_user_idx ON app_play_requests (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_play_matches (
  id                     TEXT PRIMARY KEY,
  request_id             TEXT NOT NULL REFERENCES app_play_requests(id) ON DELETE CASCADE,
  requester_id           TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  acceptor_id            TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL DEFAULT 'pending_confirm',
  requester_confirmed_at TIMESTAMPTZ,
  acceptor_confirmed_at  TIMESTAMPTZ,
  book_initiator_id      TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  gamenet_id             TEXT REFERENCES app_gamenets(id) ON DELETE SET NULL,
  scheduled_at           TIMESTAMPTZ,
  confirm_deadline       TIMESTAMPTZ,
  requester_result       TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  acceptor_result        TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  winner_user_id         TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> acceptor_id)
);
CREATE INDEX IF NOT EXISTS play_match_user_a ON app_play_matches (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS play_match_user_b ON app_play_matches (acceptor_id, created_at DESC);
```

**Do not** reuse `app_matches` (tournament FK to `app_events`).

### 7.3 Rate limits & anti-spam

| Rule | Value |
|------|-------|
| Max open requests / user | 2 |
| Max open requests / disc / user | 1 |
| Cooldown after expire/cancel (same disc) | 24h |
| Request TTL | 72h (lazy expire on read) |
| Fraud soft-throttle | 3 requests : 0 confirmed in 30d → max 1 open, 72h cooldown |
| Scored wins / user / 30d | 3 max |
| Scored wins / opponent pair / 30d | 1 |
| Points per win | 10 |

No auto-ban — surface outliers on `/admin/arena`.

### 7.4 Ranking
- `challengePointsOf(userId)` — derived on read, never stored.
- Sum into national points at: `app/page.tsx`, `leaderboard/page.tsx`, `me/page.tsx`, `players/[id]/page.tsx`.
- UI breakdown: **«امتیاز میدون»** on profile/me.
- Never `app_placements` / `pointsForPlacement`.

### 7.5 Notifications (`notif_type = 'announcement'`, prefix `«میدون»`)

| Trigger | Title (FA) |
|---------|------------|
| Accept | «@tag درخواستت رو قبول کرد» |
| Pair confirm needed | «تأیید بازی با @tag» |
| Book proposal | «پیشنهاد زمان و گیم‌نت — تأیید کن» |
| Scheduled | «بازیت فردا ساعت … در [gamenet]» |
| Win + points | «برد ثبت شد — +۱۰ امتیاز میدون» |
| Lapse | «بازی بدون نتیجه بسته شد» |

### 7.6 Kill switch
`ARENA_ENABLED` env — unset/false: APIs 404, `/arena` shows «به‌زودی», no points computed.

---

## 8. Failure mode playbook

| Scenario | Signal | Response |
|----------|--------|----------|
| Many requests, few accepts | accept rate <15% | Push notifs to nearby users; founder seed requests; tighten post friction (confirm checkbox) |
| Spam requests | fraud p90 >8:0 | Throttle to 1 open / 72h; admin monitor |
| Points bug | leaderboard anomaly | `ARENA_ENABLED=false`; derived-only audit |
| Schedule deadlock | agreed >48h no scheduled | Reminder notif; auto-cancel at 72h |
| Friend collusion | same pairs farming | opponent pair cap (already); admin review |
| Empty city feed | 0 open in filter | Empty state CTA; cross-city filter hint |
| Cannibalization | reg −15% | Messaging: arena ≠ official title |

---

## 9. Out of scope (v1)

GPS · in-app chat · money/stakes · admin referee · screenshot proof · team play · auto-ban · direct profile challenge · gamenet owner approval per booking

---

## 10. Pre-build validation (PoL — optional but recommended)

Before Phase D UI, run **1 week** or **~10 manual pairs** in one city via founder concierge (Telegram + admin notes). Pass criteria: ≥40% accept rate on real posts. Fail → don't ship full UI yet.

---

## 11. Open questions (non-blocking — defaults in build plan)

| # | Question | Default in build |
|---|----------|------------------|
| 1 | Bo1 counts for ranking? | Yes, but half points (5)? **Founder call** — default: Bo1=5pts, Bo3/5=10pts |
| 2 | Re-open request after cancel? | New request only |
| 3 | Unverified gamenet in picker? | No — verified only |

---

## 12. Acceptance criteria (epic)

- [ ] Two accounts complete full loop cross-city (profile A, filter city B, book B gamenet).
- [ ] Mismatch result → lapse, zero points, neutral notif.
- [ ] `/invite` + `?ref=` still work; tab shows میدون.
- [ ] `/admin/behavior` shows arena funnel within 5 min of test traffic.
- [ ] `ARENA_ENABLED=false` fully disables feature.
