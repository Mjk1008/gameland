# 30 — Match-Day Rehearsal: Findings & Fix List

> **Purpose:** run every match-day action on the rehearsal app, collect feedback
> from the admin side and the user side, find the root cause of each problem, and
> end with a punch-list of edits to apply to the **live** app before match day.
>
> Rehearsal app: `https://gameland-rehearsal.liara.run` · cloned live DB
> (3.5k users, 8 events, ~1k regs) · SMS = stub · assistant = off.
> Run started: 2026-08-29.

---

## How this doc is used

- Every problem gets a row in **§2 Findings**. One row = one issue.
- I reproduce each report on the rehearsal app + DB, attach evidence, find the
  root cause in code/config, and write the exact fix.
- **§3** is the emerging match-day run-of-show (the real sequence of admin steps).
- **§4** is the final checklist to apply to **live** — nothing ships to live
  until the whole run is green and signed off.

### Feedback format (fastest for me to act on)

> `[admin|user] <screen/URL>` — what you did → what you expected → what happened.
> Attach a screenshot for anything visual.

Example: `[user] /register/eafc — خریدم ۲ سهم، انتظار داشتم مبلغ ۲ برابر بشه، ولی قیمت ۱ سهم نشون داد.`

---

## 1. Simulation scope (match-day timeline)

| Phase | Admin actions | User actions | Runbook §|
|---|---|---|---|
| **T-7d Setup** | create رویداد + رشته‌ها, venue, `regDeadline`, `finalSize`, publish, KB facts | — | A, prep |
| **T-3d Registration** | watch queue | signup, browse, register سهم (cap 6), referral code, upload فیش | A, B |
| **T-2d Review** | approve / reject + reason, handle top-ups, reversals | re-request after reject, top-up | B5–B10 |
| **T-1d Close & draw** | close registration, draw prelims (city), assign prelim venues | see locked bracket, see match page | D |
| **Match day AM** | record prelim outcomes (advance/eliminate) | see advance/eliminate, seed count | E1–E2 |
| **Match day PM** | assemble final (≤3 seeds/city), enter results, finalize | see final bracket, see result | E3–E6 |
| **Post** | verify placements + points | check rank on home/leaderboard/profile | F |
| **Throughout** | notify, monitor | notifications, assistant | G, H |

---

## 2. Findings

Severity: **P0** blocks match day · **P1** wrong/confusing, needs fix before day ·
**P2** polish, can wait.
Status: `open` → `root-caused` → `fix-ready` → `applied-to-live` → `verified-live`.

| # | Sev | Area | Reported | Symptom | Evidence | Root cause | Fix (file / config) | Status |
|---|-----|------|----------|---------|----------|------------|---------------------|--------|
| MD-1 | P0 | Draw / format | admin | Some disciplines have NO prelims (UFC = one bracket, everyone converges, that bracket *is* the final). Drawing them today dumps players into city prelim groups and a player's multiple سهم get scattered into separate prelim brackets that shouldn't exist. | `lib/bracket.ts` `generatePrelims` always groups by city/province + always builds a prelim stage. `app/api/admin/draw/route.ts` only calls `generatePrelims`/`generateTeamPrelims`. `EventConfig` (store.ts:1542) has no "skip prelims" flag; `Event.format` is a free-text label, not a switch. | **Add a per-event stage mode.** `EventConfig.bracketMode: 'prelims' \| 'direct'`. **Default by discipline: ONLY `fc26` (EA FC 26) → `prelims`; everything else (`efootball`, `ufc6`, `nba2k26`, `pes21`) → `direct`.** Per-event override in admin create/edit (radio), frozen once `isDrawn`. `direct` → new `generateDirectBracket(compId, approvedRegs)`: ONE single-elim tree (stage `final`, groupKey `''`), no city grouping. (efootball is now `direct` too.) **Multi-سهم seat model is exactly MD-3's** (k = min(سهم, 6) spread seats in the one tree, self-match → admin picks survivor, out only when all entries lose). `draw` route branches on `bracketMode`. `finalize` already takes manual admin placement rows → no change. | fix-ready (design). Shares the seat engine with MD-3. Build after rehearsal run. |
| MD-2 | P2→hold | Draw / prelims | admin | Prelim city/province groups sometimes don't reach quorum (a "bracket" of 2–4 people). Adds no filtering, looks broken. Quorum threshold agreed = **4**. | `distributeSeats` builds a bracket for any group size ≥1; `computeQualifiers` passes everyone from tiny groups. No min-size handling. | **DEFERRED — needs its own discussion.** PM intent: route sub-quorum players into a **separate dedicated competition set** rather than patching the prelim. Do NOT design the merge/auto-advance path yet. Revisit as its own item. | parked — dedicated discussion pending |
| MD-5a | P1 | Draw / seat distribution | admin | Seats should fill **early brackets first, deterministically**: an account with k سهم gets a seat in brackets **1..k** (single-سهم → bracket 1; 3-سهم → brackets 1,2,3; 6-سهم → 1..6). So bracket 1 holds everyone, later brackets are progressively lighter — which leaves slack in the later brackets for re-entries (MD-5b) and lets bracket 1 run first (Sat), bracket 2 next (Sun), … | `lib/bracket.ts` `distributeSeats` currently picks the **k least-full brackets** (balancing) with `order = shuffle(players)` — spreads 1-سهم players across all brackets to equalise size, the opposite of what's wanted. | Change `distributeSeats`: account with k سهم → seats in bracket indices `0..k-1` (i.e. 1..k) — **strictly deterministic, no "least-full" balancing**. 1-سهم → bracket 1 only; 2-سهم → brackets 1 & 2; etc. Bracket 1 = every registrant (resolved first / earliest date), each later bracket only the accounts with that many سهم → **early brackets are the fullest, on purpose** (PM confirmed). Randomise only the *within-bracket* seeding (already in `buildTree`). "A player's own سهم never meet in prelims" stays automatic (different brackets). ⚠ bracket N (highest سهم) can be tiny — intersects MD-2 (parked). | fix-ready — bounded change, build with the draw work |
| MD-5b | P1 | Re-entry / second chance | admin | Brackets in a group run on **staggered dates** (bracket 1 = Sat, bracket 2 = Sun, …). A player eliminated in an already-run bracket can **buy more سهم** to re-enter *later, not-yet-started* brackets. **Decisions:** re-entry سهم count toward the **6 cap** (a 6-سهم player can't re-enter). On re-entry the player buys `n` سهم (1 ≤ n ≤ 6−current) → those `n` seats are distributed **the same proportional early-first way as the original draw (MD-5a)** but starting from the **first not-started bracket**. *Example:* player had 1 سهم in bracket 1, loses, buys 3 more → those 3 go into brackets 2, 3, 4. Allowed **only while** (a) the player is under the 6-سهم cap **and** (b) at least one bracket hasn't started. Re-entry سهم go through the **normal فیش approval queue**; on approval, attempts increase and seats are placed. | Hard blocker today: `store.ts` `createRegistration` (767) + `setRegistrationAttempts` (835) throw `REG_LOCKED` once `matchesForComp(compId).length > 0`. No per-bracket state/schedule (`prelimVenues` dates are per **group**). No inject-into-built-bracket path. | **Designed — build with the draw work.** (a) per-bracket state derived from match progress (`not-started` = 0 done / `running` / `done`); (b) post-draw "re-entry purchase" path that adds attempts (respecting the 6 cap) without tripping `REG_LOCKED`, approved via فیش queue; (c) on approval, distribute the new `n` seats into the first `n` not-started brackets (reuse MD-5a logic, offset to first not-started); fill a bye slot if the bracket has one, else re-`buildTree` that single bracket with the added player (safe — brackets are independent, final is assembled later); (d) new seats are entry #k+1… for MD-3/MD-4 counting. | designed |
| MD-11 | P1 | Manual tournament mode | admin | Admin wants a **fully manual competition**: create a manual event, add as many brackets as they want, set as many سهم/seats and whatever capacity they want, then hand-add users into the slots and run it. No registration window, no فیش, no auto-draw, no city grouping — the admin builds and runs the whole thing. | No such path exists. Every Event goes through registration → فیش approval → auto-`generatePrelims`. `REG_LOCKED` and the draw engine assume that pipeline. `MD-6`'s "add to slot" is the closest primitive but only edits an already-drawn bracket. | **DEFERRED — design session (with MD-2).** Likely shape: `EventConfig.manual: true` → hides the reg/pay/draw UI, unlocks an admin bracket builder (add bracket / set slot count / add player by user search / set per-bracket qualify / optional final). Shares MD-6's "add player to slot" primitive and MD-8's result-entry surface. This is also the natural tool for **MD-2** (sub-quorum players → a manual side competition). Open Qs: do manual events feed national ranking + placement points, or stay isolated? real accounts only or free-text names? one flat bracket or brackets + final? | parked — design session pending |
| MD-6 | P1 | Manual roster edit | admin | Admin wants an **"Add" button on every empty slot of every bracket** (round-1 empty/bye slots), usable in **any bracket state**, to **search a user and drop them into that slot** — e.g. a player arrives last-minute and must be in the draw. | No manual roster-edit path exists; matches are only mutated by `setMatchWinner`. Admin can't place a player into a specific slot. | New admin action in `tournament-panel.tsx` + a route (`/api/admin/bracket-add` or similar): given `compId, groupKey, bracket, round:1, slot, userId` → set that slot's `p1UserId`/`p2UserId`, re-run `resolveByes`, persist. Also allow "Add" to grow a not-started bracket (re-`buildTree` with the extra player). Warn (not block) for `running`/`done` brackets. Ties into MD-3/MD-4 entry counting. | root-caused — build with draw work |
| MD-7 | P1 | Per-bracket schedule | admin/user | Each prelim bracket needs its **own date/time** (bracket 1 = Sat, 2 = Sun…), shown to players so they know when/where their bracket runs. Also drives MD-5b's "not-started" test. | `EventConfig.prelimVenues` is keyed by **group** (city/province), with `fromDate`/`toDate` — no per-bracket granularity. | Add `EventConfig.bracketSchedule: Record<string, { date?: string; time?: string; note?: string }>` keyed by `qualifyKey(groupKey, bracket)` (same pattern as `qualify`). Admin edits per bracket in `tournament-panel.tsx`. Surface in `BracketView.tsx` bracket header + the player's `/competitions/[id]/me` page. | root-caused — build with draw work |
| MD-8 | P0 | Result entry | admin | Recording a match result is painful: after every result the view jumps back to the radial diagram and scrolls to top; result buttons only exist in "مرحله‌ای" (rounds) mode so admin must re-navigate scope→bracket→round after each one; one tap commits irreversibly (no confirm, no edit/undo); no score field. | `BracketView.tsx` `MatchCardRow.pick()` calls **`location.reload()`** on success → full reload → `BracketView` `useState` re-inits (`mode` → `'radial'` default, scope/bracket reset, scroll top). Winner buttons are only rendered in `RoundsView`/`MatchCardRow` (not tree/radial). `canPick = isAdmin && status==='ready'` → once `done` no button; `lib/bracket.ts` `setMatchWinner` hard-throws `MATCH_ALREADY_DONE`. `score:''` hardcoded. Admin event page `tournament-panel.tsx` has **no** result entry — it links out to the public bracket page. | **Dedicated admin result-entry surface.** Options: a panel on the admin event page, or a focused "اجرای براکت" mode. Requirements: (1) no `location.reload()` — use `router.refresh()` + optimistic state, keep mode/scope/bracket/scroll; (2) list `ready` matches in order, one card each; (3) **two-step**: tap winner → card shows «تأیید / لغو» → commit; (4) **ویرایش** on `done` matches → new `correctMatchResult(matchId, newWinnerUid)` in `bracket.ts` that reverts the old winner's downstream advance and re-feeds (guard: block/warn if the next-round match is already `done`); (5) **no score input** — winner pick only (PM dropped score entry); (6) works from any bracket view, not just rounds mode. | root-caused — needs build. Match-day critical. |
| MD-9 | P1 | Bracket UI — tree view | admin/user | "درختی" (tree) view janks / feels like it crashes when you pan or zoom, especially on a big bracket. | `BracketView.tsx` `TreeView`: `onPointerMove` calls `setT()` on **every** pointer-move event (no rAF/throttle) → re-renders all ~127 match nodes + the SVG connector `<path>`s per frame during a drag. `onWheel` → `zoom` → `setT` → same. No virtualization; all nodes always mounted with fresh inline-style objects each render. `useEffect(fit,[fit])` re-fits whenever `canvasW/canvasH` (derived from `bMatches`) change. | Throttle pan/zoom to `requestAnimationFrame`; apply the pan transform imperatively (ref + `style.transform`) during drag, commit to state on pointer-up; memoize `TreeCard` (`React.memo`) and the connector paths; consider windowing for >64 nodes. | root-caused — build |
| MD-10 | P2 | Bracket UI — radial view | user | Radial ("دایره‌ای") view is attractive but unreadable — "just yellow lines connected together"; can't tell who reached where. | `RadialBracket.tsx` renders each player node as **only the first letter** of the tag (`n.player.tag[0].toUpperCase()`); champion node too. No round rings/labels, no match inspect on tap, winner-path gold + me-path accent are the only signal. `onPointerMove` → `setRot` per move (minor perf). | Draw faint round rings + Persian round labels (بازیکن‌ها / یک‌هشتم / … / فینال); show full `@tag` on the outer ring (curved text or a callout), tap a node/match to inspect (both players, score, round); keep the poster aesthetic but add a legend. Lower priority than MD-8/9 — the "مرحله‌ای" view is the reliable one; make it the default for admins. | root-caused — build (P2) |
| MD-4 | P1 | Bracket UI | admin/user | Bracket views show only `@tag` — no indication of how many سهم an account holds or which of its entries is playing a given slot. With the multi-entry model (MD-1/MD-3) a player can occupy 5 slots in the final / 6 prelim brackets with no visual cue. | `app/competitions/[id]/bracket/page.tsx` builds `MatchDTO` with `Player = {uid,tag,name}` only — no `attempts`/entry index. `BracketView.tsx` `PlayerLine`/`TreeSlot`/`RadialBracket` render `p.tag` plainly. Same gap in admin `tournament-panel.tsx`. | **Two badges per player slot — ONLY for accounts with `attempts > 1`** (single-سهم players render plain `@tag`, no badge): (1) **total سهم** — `×N` = that account's `getRegistration(uid,compId).attempts`, shown in every bracket the account appears in; (2) **entry index** — this slot is the account's k-th live entry: 1st = name only, 2nd…Nth = `#2`…`#N`. Plumb an `attempts` map + per-slot `entryIndex` through `page.tsx` → `MatchDTO`; render badges in `PlayerLine`, `TreeSlot`, `RadialBracket`, and the admin panel. Entry-index numbering is stable = order of the account's round-1 seats within the stage. | fix-ready (spec). Build with MD-1/MD-3 (depends on the multi-entry model). |
| MD-3 | P0 | Draw / final assembly | admin | A player who buys k سهم and qualifies from k prelim brackets still gets **only 1 seat in the final**. The سهم advantage vanishes at the final. Repro on rehearsal (UFC, province mode): 1 account, 6 سهم, sole 6-سهم buyer in Mazandaran → 6 prelim brackets, walkover-won all 6 → final assembled with **1 match for that user**, not 6 spread entries. PM: also happens in FIFA. | `lib/bracket.ts` `computeQualifiers` has `const seen = new Set<string>()` → drops every qualification after a userId's first. `assembleFinal` builds the final from that deduped userId list → 1 seat/player. The `seedsEarned` machinery (store.ts `recordPrelimOutcome`, cap 3, `MAX_SEEDS_TO_FINAL`) — the original multi-entry intent — is **orphaned**: `result-controls.tsx` is rendered nowhere, and `assembleFinal`/`computeQualifiers` never read `seedsEarned`. So it's always 0 for users now (shown on `/me`, `/competitions/[id]/me`). | **Multi-entry final, converges with MD-1.** A player carries **min(bracketsQualifiedFrom, 6)** entries into the final (FIFA) / **min(سهم, 6)** seats into the single bracket (direct). **CAP = 6** (= سهم cap). Entries placed spread across the tree (`distributeSeats`-style, but within one tree) so a player's own entries meet only in the late rounds. Two of a player's entries meet → **admin decides which entry advances** (self-match surfaced in the admin bracket panel with a clear "خودی" tag; admin picks the survivor, no score). Player is out only when *all* their entries lose. Placement = player's best-surviving entry; duplicate entries don't consume placement ranks. **Reconnect the `seedsEarned` field to this** — it should show the player's current count of live final entries (on `/me`, `/competitions/[id]/me`). | fix-ready (design) — CAP=6, self-match=admin-manual, seed field reconnected. Build after rehearsal run. Blocks/merges with MD-1. |

---

## 3. Match-day run-of-show (emerging)

_Filled in as we confirm each step works. This becomes the operator's script for
the real day._

### 3.1 Pre-day (T-7d … T-1d)
1. _tbd_

### 3.2 Match day
1. _tbd_

---

## 4. Apply-to-live checklist

_Nothing here until a fix is verified on the rehearsal app. Each item: what to
change, where, and how to verify on live._

- [ ] _tbd_

---

## 5. Rehearsal env notes

- Reset for a fresh draw cycle:
  `cd ~/gameland/web && npm run rehearsal:reset -- --app gameland-rehearsal --confirm && liara app restart --app gameland-rehearsal`
- Known cosmetic gaps (not bugs): avatars blank (blob data not cloned),
  assistant returns error (`METIS_API_KEY` unset — add if testing §G).
- Full clone refresh: `npm run rehearsal:clone -- --app gameland-rehearsal --confirm` then redeploy.
