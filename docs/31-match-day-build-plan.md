# 31 — Match-Day Build Plan (execution-ready)

> Companion to [`docs/30-match-day-findings.md`](30-match-day-findings.md) (the "why").
> This doc is the "what to build". Hand it to the implementer as-is.
>
> **Golden rules**
> 1. Branch off `mvp`. Build the whole plan on the branch.
> 2. **Deploy to `gameland-rehearsal` first** (app on Liara, cloned DB, SMS stub,
>    assistant off). Re-run the full match-day rehearsal on the new version.
> 3. Only after sign-off: merge to `mvp`, deploy live (`web/`, `liara deploy --app gameland --no-app-logs`, then `git push origin mvp`).
> 4. This app is **single-instance, in-memory store + write-through Postgres**
>    (see root `CLAUDE.md`). All store APIs are synchronous. `EventConfig` is
>    persisted as JSON in `app_events.config` — **new EventConfig fields need no
>    migration**. New table columns go in the self-healing list in
>    `web/lib/db/persistence.ts` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
> 5. Between draw-cycle tests on rehearsal:
>    `cd web && npm run rehearsal:reset -- --app gameland-rehearsal --confirm && liara app restart --app gameland-rehearsal`.

Disciplines (ids): `fc26` = EA FC 26, `pes21`, `efootball`, `ufc6`, `nba2k26`
(+ admin-defined). **Only `fc26` runs a preliminary stage. All others are a
single direct bracket.**

---

## Phase 0 — Config & data model (foundation)

**Goal:** the switches everything else reads.

### 0.1 `EventConfig` (in `web/lib/store.ts`, ~line 1542)
Add fields (all optional, "absent = default" idiom like `ticketPrice`):

| field | type | default | meaning |
|---|---|---|---|
| `bracketMode` | `'prelims' \| 'direct'` | derived from discipline (see 0.2) | Phase 1/2 |
| `entryCap` | `number` | `6` | max final entries per player (Phase 3) |
| `bracketSchedule` | `Record<string, { date?: string; time?: string; note?: string }>` | `{}` | keyed by `qualifyKey(groupKey, bracket)` (Phase 5) |

No DB migration (JSON blob). `setEventConfig` already merges + persists.

### 0.2 Discipline → default bracket mode
Small helper (new, e.g. `web/lib/discipline-format.ts` or `bracket.ts`):
```
export function defaultBracketMode(disc: string): 'prelims' | 'direct' {
  return disc === 'fc26' ? 'prelims' : 'direct'
}
```
Used when an event is created; admin can override until the draw.

### 0.3 Constants
`web/lib/competition-engine.ts`: `MAX_SEEDS_TO_FINAL` is currently `3`. Match-day
decision is **6**. Either bump it to `6` or replace its uses with
`getEventConfig(compId).entryCap ?? 6`. Prefer the per-event value.

**Acceptance:** create an event for each discipline → `getEventConfig(id).bracketMode`
is `prelims` for `fc26`, `direct` for the rest. Admin edit screen shows the toggle.

---

## Phase 1 — Deterministic seat distribution (MD-5a)

**Goal:** k سهم → brackets `1..k` exactly. Early brackets fullest.

**File:** `web/lib/bracket.ts` → `distributeSeats(players, seed)`.

**Change:** replace the "k least-full brackets" logic with:
- `N = min(6, max(attempts in group))` (unchanged).
- For each player with `k` سهم → push their userId into brackets `0, 1, …, k-1`.
- Keep `order = shuffle(players, rng(seed))` only to randomise *within-bracket*
  seat order (or drop it — within-bracket seeding already re-shuffles in `buildTree`).
- Result: bracket 0 has every player, bracket N-1 only the max-سهم players.

**Untouched:** `generatePrelims` still calls `distributeSeats` per city/province group.
"A player's own سهم never meet in prelims" stays true (different brackets).

**Acceptance (rehearsal, an `fc26` event):** draw prelims. In each city group:
bracket 1 player count == group size; bracket 2 == count of players with ≥2 سهم;
a 6-سهم account appears once in each of brackets 1–6.

---

## Phase 2 — Direct bracket mode (MD-1)

**Goal:** non-`fc26` events skip prelims — one bracket, everyone in it.

### 2.1 Engine — `web/lib/bracket.ts`
New `generateDirectBracket({ compId, registrations }): Promise<{ seats: number }>`:
- No grouping. Collect all approved regs.
- Build the per-player seat list with the **Phase 3 spread function** (`spreadSeats`,
  below) — `k = min(reg.attempts, entryCap)` seats per player, arranged so a
  player's own seats land in different halves/quarters (meet latest possible).
- `await clearMatchesForComp(compId)`.
- `buildTree(compId, 'final', '', 0, seatList, seedFrom(compId + 'direct'))`.
- No `qualify` map needed (no prelims).

### 2.2 Draw route — `web/app/api/admin/draw/route.ts`
Branch at the top:
```
const mode = getEventConfig(compId).bracketMode ?? defaultBracketMode(getEvent(compId).disc)
if (mode === 'direct') { ...generateDirectBracket... ; notify each reg 'draw' ; return }
```
Team (`teamSize === 2`) path unchanged. Prelims path unchanged.

### 2.3 Finalize — `web/app/api/admin/finalize/route.ts`
Already takes manual `{ userId, rank }` rows → **no change**. Admin reads the
final bracket, types placements.

### 2.4 Admin UI — event create + edit
`web/app/admin/events/new/page.tsx` and `web/app/admin/events/[id]/edit/page.tsx`
(+ `web/app/admin/competitions/[id]/add-discipline.tsx`):
- Radio: «مقدماتی استانی + فینال» / «تک‌براکت مستقیم». Prefill from `defaultBracketMode(disc)`.
- On edit: **disabled once `isDrawn(compId)`** (show a lock note). Persist via `setEventConfig`.
- `tournament-panel.tsx`: when `bracketMode === 'direct'`, hide the "گروه‌بندی شهر/استان"
  control and the per-group qualify steppers; show "این رشته تک‌براکت مستقیمه".

**Acceptance:** a `ufc6` event → draw → exactly one bracket, no city groups,
every approved player seeded once (+ multi-سهم spread per Phase 3). Finalize by
typing ranks works.

---

## Phase 3 — Multi-entry final + entry index (MD-3)

**Goal:** a player carries up to `entryCap` (6) entries into the final, spread,
eliminated only when *all* their entries lose. Fix `computeQualifiers` dropping
duplicates. Reconnect `seedsEarned`.

### 3.1 Seat spread — `web/lib/bracket.ts`
New `spreadSeats(entries: { userId: string; count: number }[], size: number): string[]`:
- `size` = next power of 2 ≥ total entries.
- Place each player's `count` seats at maximally-separated positions
  (bit-reversal / stride = `size / count`), so two of a player's seats meet only
  in round `≥ log2(size) - log2(count) + 1`.
- Fill remaining positions with single-entry players.
- Returns the ordered seat list for `buildTree(... , seats, ...)`.

Used by both `assembleFinal` (Phase 3.2) and `generateDirectBracket` (Phase 2.1).

### 3.2 `computeQualifiers` + `assembleFinal` — `web/lib/bracket.ts`
- `computeQualifiers`: **remove the `seen` Set**. Instead, per player, keep up to
  `entryCap` qualifications (count how many prelim brackets they won; cap at 6).
  Return `{ userId, count }` per player (or a flat list with repeats).
- `assembleFinal`: build `entries = [{ userId, count }]`, respect `finalSeeding`
  for ordering the *first* seat of each player, then
  `buildTree(compId, 'final', '', 0, spreadSeats(entries, size), seed)`.
  `cap = getEvent(compId)?.finalSize ?? 128` still caps total seats.

### 3.3 Self-match handling
When `buildTree`/`feedWinner` would place the **same userId on both sides** of a
match:
- Mark it: add `selfMatch?: boolean` to the `Match` type (in-memory only is fine;
  or derive in the DTO as `p1UserId === p2UserId`). No DB column needed —
  `p1UserId === p2UserId` is self-describing.
- Leave `status: 'ready'`. Admin resolves it in the result panel (Phase 4) with a
  clear «خودی — کدوم ورودی ادامه بده؟» label. Normal `setMatchWinner` applies.
- `resolveByes` must NOT auto-resolve a 2-occupant match even if both are the same
  uid (it currently only auto-advances `n === 1`).

### 3.4 Placement
`finalize` stays manual. `finalize-controls.tsx`: the participant list must show
each user **once** (dedupe by userId) even though they hold multiple final seats.
Placement rank the admin types = that player's result (their best entry). The
losing duplicate entries consume no rank.

### 3.5 Reconnect `seedsEarned`
Repurpose `Registration.seedsEarned` to mean **"this account's current count of
live entries in the final"**. Compute it (derive on read, or recompute on
assemble/each result) from the final bracket: count distinct still-alive seats
for that userId. Surface unchanged on `web/app/me/page.tsx`,
`web/app/me/competitions/page.tsx`, `web/app/competitions/[id]/me/page.tsx`
(label stays «seed به فینال»).
`web/app/admin/events/[id]/result-controls.tsx` is dead (rendered nowhere) —
delete it or leave it; do not wire it back.

**Acceptance (rehearsal):** account with 6 سهم wins 6 prelim brackets →
`assembleFinal` → 6 seats in the final, in 6 different eighths of the bracket.
Knock out 5 of them → player still in. Knock out the 6th → player eliminated.
`/me` shows «seed به فینال: N» tracking live entries.

---

## Phase 4 — Admin result-entry surface (MD-8) — match-day critical

**Goal:** enter results fast, no page jump, two-step confirm, editable.

### 4.1 New component — `web/app/admin/events/[id]/run-panel.tsx`
Rendered on `web/app/admin/events/[id]/page.tsx` when `isDrawn`.
- Lists matches grouped by bracket → round. Default filter: `status === 'ready'`.
  Toggle to show `done` too.
- Per `ready` match card: two buttons (`@p1`, `@p2`). Tap → the card switches to
  «تأیید برندهٔ @X» + «لغو». «تأیید» → `POST /api/admin/match`.
- **No `location.reload()`.** On success: `router.refresh()` (Next server
  component refetch) — component keeps its own filter/scroll state.
- Per `done` match card: shows winner + «ویرایش» → confirm → `POST /api/admin/match`
  with `{ matchId, winnerUserId, correct: true }`.
- Self-match cards (`p1UserId === p2UserId`): header «خودی» + text «کدوم ورودیِ
  این بازیکن ادامه بده؟». Same two-button flow (buttons show `#1` / `#2` entry
  index from Phase 7).
- **No score field.** Remove score input everywhere in the result flow.

### 4.2 Route — `web/app/api/admin/match/route.ts`
- Add `correct` to the body. When `correct === true` → call new
  `correctMatchResult(matchId, winnerUserId)` instead of `setMatchWinner`.

### 4.3 Engine — `web/lib/bracket.ts`
New `correctMatchResult(matchId, newWinnerUserId)`:
- Load match; must be `done`.
- `next = findNextMatch(m)`. If `next && next.status === 'done'` → throw
  `NEXT_ROUND_PLAYED` ("راند بعدی بازی شده — اول اونو ویرایش کن").
- Remove the old winner from `next`'s slot (`next.p1UserId`/`next.p2UserId` per
  `m.slot % 2`), set `m.winnerUserId = newWinnerUserId`, `feedWinner(m)`,
  `resolveByes(...)`, persist.
- Map `NEXT_ROUND_PLAYED` to a Persian error in the route.

### 4.4 Also fix `BracketView.tsx`
`MatchCardRow.pick()` → replace `location.reload()` with `router.refresh()`
(`useRouter` from `next/navigation`). Keeps the public bracket page usable too,
though admins should use `run-panel`. `tournament-panel.tsx` link text →
«ثبت نتیجهٔ بازی‌ها» now points at the run-panel section (anchor), not the public page.

**Acceptance:** enter 15 results back-to-back on rehearsal — view never jumps,
scroll preserved. Two-step confirm blocks a fat-finger. Edit a `done` match whose
next round is unplayed → downstream updates. Edit one whose next round is played →
clear error.

---

## Phase 5 — Per-bracket schedule (MD-7)

**Goal:** each bracket has its own date/time; drives "started / not-started".

### 5.1 Config — already added in Phase 0 (`EventConfig.bracketSchedule`).

### 5.2 Bracket state helper — `web/lib/bracket.ts`
```
export function bracketState(compId, groupKey, bracket): 'not-started' | 'running' | 'done'
```
`not-started` = 0 matches `done`; `done` = all `done`; else `running`.

### 5.3 Admin editor — `web/app/admin/events/[id]/tournament-panel.tsx`
In the per-bracket rows (section «۲ · براکت‌ها و کوالیفای», and the direct-mode
equivalent): add date + time + note inputs per bracket → `setEventConfig({ bracketSchedule })`.

### 5.4 Player-facing
- `web/app/competitions/[id]/bracket/BracketView.tsx`: bracket header shows its
  schedule (date/time/note) next to «براکت N».
- `web/app/competitions/[id]/me/page.tsx`: show the player's bracket date(s).

**Acceptance:** set bracket 1 = Sat 18:00, bracket 2 = Sun 18:00. Player in both
sees both dates. `bracketState` returns `not-started` for an untouched bracket.

---

## Phase 6 — Re-entry / second chance (MD-5b)

**Goal:** a player eliminated from a run bracket buys more سهم and gets seeded
into later not-started brackets, via the normal فیش queue.

### 6.1 Purchase path
New route `web/app/api/reentry/route.ts` (or a `reentry` flag on the existing
register/top-up route):
- Auth = the user. Body `{ compId, count }`.
- Allow only if: `getRegistration(uid, compId)` exists & `status === 'approved'`;
  `reg.attempts + count <= entryCap (6)`; **at least one bracket is `not-started`**
  (`bracketState`); event `bracketMode` has multiple brackets (prelims `fc26`, or a
  direct event the admin split — for MVP: prelims only).
- Effect: `setRegistrationAttempts` **must allow this even though `isDrawn`** — add
  a `{ allowPostDraw: true }` option to `setRegistrationAttempts` that skips the
  `REG_LOCKED` throw for this path only. It bumps `attempts`, leaves
  `paidAttempts` as-is so the فیش queue bills the difference (existing top-up
  behaviour).
- The new سهم are **pending payment** → surfaced in `/admin/requests` like any
  top-up (receipt upload flow unchanged).

### 6.2 On approval (admin approves the re-entry فیش)
Hook into the existing approval path (`web/app/api/admin/reg-approve/route.ts` /
`setRegistrationStatus`): when an already-`approved` reg gains paid attempts after
the draw, call new `placeReentrySeats(compId, userId, n)` in `bracket.ts`:
- Find the first `n` `not-started` brackets (by index).
- For each: if it has a round-1 bye slot → fill it with `userId`, `resolveByes`.
  Else re-`buildTree` that single bracket with its current seat list + `userId`
  (size grows to next power of 2). Brackets are independent — safe.
- New seats count as entry `#k+1…` for Phase 3/7.

### 6.3 UI
- User: on `web/app/competitions/[id]/me/page.tsx`, when eliminated from a bracket
  and re-entry is allowed → «خرید شانس مجدد» button → count picker (1…remaining) →
  فیش upload (reuse existing).
- Admin: `/admin/requests` shows these as top-ups with a «شانس مجدد» tag.

**Acceptance:** player loses bracket 1, buys 3, uploads فیش, admin approves →
seats appear in brackets 2, 3, 4 with entry badges `#2 #3 #4`. Blocked when the
player already has 6 سهم or no bracket is `not-started`.

---

## Phase 7 — سهم / entry badges on the bracket (MD-4)

**Goal:** show, **only for accounts with `attempts > 1`**, a `×N` total badge and
a `#k` entry-index badge per slot.

### 7.1 Data — `web/app/competitions/[id]/bracket/page.tsx`
- Build `attemptsByUid: Map<string, number>` from
  `approvedRegistrationsForComp(compId)` (or `getRegistration`).
- Compute `entryIndex` per match slot: within a stage, order an account's round-1
  seats by (bracket, slot); that ordinal is `#1, #2, …`. Carry it into the DTO
  (e.g. `MatchDTO.p1Entry?: number`, `p1Attempts?: number`; same for p2).

### 7.2 Render
`web/app/competitions/[id]/bracket/BracketView.tsx` (`PlayerLine`, `TreeSlot`),
`web/app/competitions/[id]/bracket/RadialBracket.tsx`, and `run-panel.tsx`:
- If `attempts > 1`: after the tag, a small pill `×N`; and if `entryIndex >= 2`, a
  `#k` pill. `entryIndex === 1` → tag only.
- Single-سهم accounts → plain `@tag`, unchanged.

**Acceptance:** 6-سهم account shows `×6` in every bracket it's in; its 6 final
slots show `#1 … #6`. 1-سهم accounts show nothing extra.

---

## Phase 8 — Manual "Add to slot" (MD-6)

**Goal:** admin drops a user into any empty round-1 slot, any bracket state.

### 8.1 Route — `web/app/api/admin/bracket-add/route.ts`
Body `{ compId, groupKey, bracket, slot, userId }` (round always 1). admin/organizer
only. Set the empty slot's `p1UserId`/`p2UserId`, `resolveByes`, persist. Reject
if the slot is already filled. For a `not-started` bracket also accept
`{ grow: true }` → re-`buildTree` with the added player.

### 8.2 UI — `run-panel.tsx` (+ optionally `tournament-panel.tsx`)
- On every empty round-1 slot: «+ افزودن». Opens a user search (reuse the pattern
  in `web/app/api/admin/promoter-user-search/route.ts`) → pick → POST.
- If bracket is `running`/`done`: confirm dialog «این براکت شروع شده — مطمئنی؟»
  (warn, don't block).

**Acceptance:** add a walk-in player to an empty slot of a not-started bracket;
they appear in the tree and in the result panel.

---

## Phase 9 — Tree view performance (MD-9)

**File:** `web/app/competitions/[id]/bracket/BracketView.tsx` → `TreeView`.
- Pan: on `pointermove`, don't `setT`; write `transform` directly on the canvas
  `div` via ref. Commit to state on `pointerup`.
- Zoom: wrap `setT` in `requestAnimationFrame`; coalesce wheel events.
- `React.memo(TreeCard)`; memoize the connector `<path>` array (`useMemo` keyed by
  `bMatches` + `pos`).
- Skip the `useEffect(fit, [fit])` re-fit unless `rounds.length` / node count
  actually changed.

**Acceptance:** pan/zoom a 128-slot bracket on a mid mobile — no visible stutter.

---

## Phase 10 — Radial view readability (MD-10) — P2

**File:** `web/app/competitions/[id]/bracket/RadialBracket.tsx`.
- Draw faint concentric round rings + Persian labels (بازیکن‌ها / یک‌هشتم /
  یک‌چهارم / نیمه‌نهایی / فینال).
- Outer ring: full `@tag` (curved `<textPath>` or a short callout), not just the
  first letter.
- Tap a node/segment → popover with both players, round name, result.
- `BracketView.tsx`: default `mode` = `isAdmin ? 'rounds' : 'radial'` (admins land
  on the reliable list view).

**Acceptance:** a non-technical viewer can trace who reached the final.

---

## Out of scope for this build — design session first

| item | why held |
|---|---|
| **MD-2** — sub-quorum (<4) prelim groups → a separate competition set | needs the manual-tournament tool (MD-11) + product rules on how those players are grouped/seeded |
| **MD-11** — fully manual tournament mode (admin builds brackets, capacity, seats, adds users, runs it) | new parallel creation path; open Qs: ranking/points impact, real accounts vs free-text, structure. Natural home for MD-2. |

---

## Suggested build order (dependencies)

```
Phase 0  (config)                      ─┐
Phase 1  (seat distribution)            │  draw layer
Phase 2  (direct mode)  ← 0,1           │
Phase 3  (multi-entry final) ← 0,1,2    │
Phase 5  (bracket schedule) ← 0         │
Phase 7  (badges) ← 3                   ┘
Phase 4  (result panel)  ← 3            ─ run layer (match-day critical)
Phase 8  (add-to-slot)  ← 4
Phase 6  (re-entry)  ← 3,4,5,8          ─ needs everything above
Phase 9  (tree perf)                    ─ independent, any time
Phase 10 (radial)  P2                   ─ independent, last
```

## Rollout

1. Branch `match-day` off `mvp`. Build Phases 0–10.
2. Deploy to `gameland-rehearsal` (drag-drop zip via Liara console, or
   `liara deploy --app gameland-rehearsal --no-app-logs` when the CLI upload works).
   `npm run rehearsal:preflight` must still pass (no `KAVENEGAR_API_KEY`).
3. Run the full rehearsal from [`docs/29-rehearsal-plan.md`](29-rehearsal-plan.md)
   §4 against the new version — one `fc26` (prelims) event and one `ufc6` (direct)
   event, exercising every phase's acceptance test above.
4. Log any new findings in `docs/30`. Fix. Re-test.
5. Sign-off (the §7 table in doc 30). Merge `match-day` → `mvp`.
6. `cd web && liara deploy --app gameland --no-app-logs` then `git push origin mvp`.
7. Spot-check live: create the real رویداد, one discipline of each mode, confirm
   the toggle + draw behave. Do **not** draw the real brackets until registration closes.
