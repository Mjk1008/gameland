# 27 — 1v1 / 2v2 Formats + Per-Event Ticket Price

**Stage:** Plan (Opus 5 consult, 2026-08-01) · **Status:** ready for founder answers on §12, then Phase 1
**Grounding checkout:** `~/gameland-work` @ `mvp` (`e75c0b9`). All line numbers below are from this tree.

Scope: a per-event `۱به۱ / ۲به۲` selector · a first-class team entity for 2v2 · team-vs-team brackets, results and placements · a per-event ticket price. Not in scope: teams larger than 2, cross-event persistent teams, an online payment gateway, fixing the disconnected `app_disciplines` admin CRUD (§11 row 13 — flagged, deliberately not folded in).

> **Read §1 before anything else.** This feature touches `lib/bracket.ts`, which is currently running a live tournament with real money in it. §1 is the only section whose conclusions are non-negotiable; §2–§8 are design recommendations that serve §1.

---

## §0 — Facts verified in the code before planning

| # | Fact | Evidence |
|---|---|---|
| 1 | **`app_matches.p1_user_id` / `p2_user_id` / `winner_user_id` carry a hard FK to `app_users(id)`** | `web/lib/db/init.sql:127-129`, mirrored in Drizzle at `web/lib/db/schema.ts:128-130` |
| 2 | Two `CHECK` constraints also bind those columns: `p1 <> p2`, and `winner ∈ {p1, p2}` | `init.sql:133-134` |
| 3 | **Match writes are fire-and-forget** — a constraint violation is `console.error`'d and dropped | `persist.match.insert` → `fire()`, `persistence.ts:222-225, 377-389` |
| 4 | `init.sql` **has** been applied to production — `app_matches.stage` / `group_key` exist only there (`init.sql:137-138`), not in the `persistence.ts` self-heal list, yet prelim/final staging works live | `persistence.ts:47-75` vs `init.sql:137-139` |
| 5 | `app_registrations UNIQUE (user_id, comp_id)` and `app_placements UNIQUE (user_id, comp_id)` | `init.sql:114`, `:150` |
| 6 | The in-memory reg map is keyed `userId + '\|' + compId` | `store.ts:635, 662, 693` |
| 7 | **`distributeSeats()` never dereferences a userId** — it is already fully opaque; only the property *name* says `userId` | `bracket.ts:45-59` |
| 8 | `buildTree()`'s signature is already opaque (`seats: string[]`); only its *write targets* are user columns | `bracket.ts:73, 86-87` |
| 9 | Exactly two places inside the engine dereference a seat into a human: `groupKeyOf()` → `getUserById()`, and `setMatchWinner()` → `pushNotif(winnerUserId, …)` | `bracket.ts:37-41`, `:176` |
| 10 | Per-event admin-set **money** already lives in the `EventConfig` JSON blob — `prizeSplit?: number[]` | `store.ts:1131-1133`, `setEventConfig` `:1141` |
| 11 | `setEventConfig` **merges** (`{...cur, ...patch}`), so `generatePrelims`' write of `{groupMode, qualify}` (`bracket.ts:158`) cannot clobber a sibling key | `store.ts:1140-1146` |
| 12 | `getEventConfig` returns a synthesized default for events with no config row → any new optional key is `undefined` for **every existing event** | `store.ts:1137-1139` |
| 13 | **`app/admin/events/[id]/draw-button.tsx` and `result-controls.tsx` are dead** — zero importers; `page.tsx` imports only `StatusControl`, `PrizeEditor`, `TournamentPanel`, `FinalizeControls`, `DeleteEventButton` | grep: no references outside their own definitions; `page.tsx:8-11` |
| 14 | **`/api/admin/result` is reachable only from dead code**, so `recordPrelimOutcome()` and its 3-seed cap (`store.ts:723-733`) are not on any live path | only caller is `result-controls.tsx:15` |
| 15 | **The admin records match winners from the *public* bracket page**, not from an admin screen | `BracketView.tsx:176` is the sole caller of `/api/admin/match`; `tournament-panel.tsx` links to `/competitions/[id]/bracket` for result entry |
| 16 | `BracketView` is already driven by an abstract DTO: `Player = {uid, tag, name} \| null` | `BracketView.tsx:7-12`; DTO built in `bracket/page.tsx:22-33` |
| 17 | `TICKET.price` has **5 real read sites**, all reached through props from server components | `register/form.tsx:74,75,126`; `pay/pay-view.tsx:82,85`; `admin/analytics/client.tsx:68`; `api/assistant/route.ts:162` |
| 18 | **No receipt-amount validation exists anywhere.** The receipt is an image; the admin eyeballs it | `api/register/receipt/route.ts` validates only mime + size |
| 19 | The admin review sheet shows the **ticket count, never the amount** — yet carries the preset reject reason «مبلغ واریزی نادرست» | `admin/requests/request-list.tsx:11, 83-84` |
| 20 | Only `pointsForPlacement()` is live in `lib/ranking.ts`, at 4 sites, all attributing to `pl.userId`. `computeRanking`, `honorsFor`, `titleCounts` are dead | `app/page.tsx:34`, `leaderboard/page.tsx:37`, `me/page.tsx:32`, `players/[id]/page.tsx:28` |
| 21 | `finalize` **rejects duplicate ranks** with a 400 | `api/admin/finalize/route.ts` — `seenRank` guard |
| 22 | `app_events.disc` has a `REFERENCES app_disciplines(id) ON DELETE RESTRICT`, and `app_disciplines` is seeded **only by `init.sql:242-248`** — `store.ts:912`'s `seedDisciplines()` and `createDiscipline()` are memory-only, no `persist` call | `init.sql:86`, `:242`; `store.ts:912-931` |
| 23 | The working tree had **uncommitted gamenet Phase 0/2 work staged** at plan time (`store.ts`, `persistence.ts`, `schema.ts`, 6 new files) | `git status`, 2026-08-01 |

### Two corrections to the brief

1. **`draw-button.tsx` and `result-controls.tsx` must not be touched.** They are dead (fact 13). The screen that actually needs team awareness is `app/competitions/[id]/bracket/BracketView.tsx` + its server page (fact 15).
2. **Do not model 2v2 as a discipline.** Fact 22 makes it actively dangerous: adding a discipline through `/admin/disciplines` writes to RAM only, so an event created on it would hit the `app_events.disc` FK, fail silently through `fire()`, and vanish on the next deploy. A selector on the event is both what the founder asked for and the safe design.

---

## §1 — The zero-regression strategy (the framing for everything else)

### 1.1 The guarantee

> **For any event where `teamSize` is unset or `1`, every function executed during registration, payment, approval, draw, result recording, final assembly and finalization is the same function, in the same file, with the same source text, as it is today. No function on the solo path acquires a conditional. The only new construct a solo event encounters is a single dispatch expression at four route boundaries, whose `else` branch calls exactly what the route calls today.**

Achievable because of fact 12: `getEventConfig(compId).teamSize` is `undefined` for every event that exists right now, including «Gameland The Best», with no backfill, no DDL and no migration. `teamSize ?? 1` is the entire compatibility layer.

### 1.2 The mechanism: a second engine, not a generalised one

`lib/bracket.ts` is **frozen**. The team path lives in a new `lib/bracket-team.ts`. Dispatch happens one level above the engine:

| Route | Dispatch |
|---|---|
| `app/api/admin/draw/route.ts` | `teamSize === 2 ? generateTeamPrelims(…) : generatePrelims(…)` |
| `app/api/admin/match/route.ts` | `teamSize === 2 ? setTeamMatchWinner(…) : setMatchWinner(…)` |
| `app/api/admin/assemble-final/route.ts` | `teamSize === 2 ? assembleTeamFinal(…) : assembleFinal(…)` |
| `app/api/admin/finalize/route.ts` | team branch expands seats → members before `storePlacement` |

The **only** permitted diff to `lib/bracket.ts` is adding the `export` keyword to four already-opaque helpers so `bracket-team.ts` can import them instead of copying them: `rng, shuffle, seedFrom, distributeSeats` + `DEFAULT_QUALIFY`. Adding `export` to a module-scope function declaration cannot alter the runtime behaviour of any existing caller.

> **`git diff origin/mvp -- web/lib/bracket.ts` must contain nothing but added `export` keywords.** If it contains anything else, the change does not ship. This is the strongest available substitute for a test suite, verifiable in one command by someone who has not read this document.

### 1.3 Why a second engine, and not the "opaque seat id" refactor

The opaque-seat-id reframing is genuinely correct about the mathematics: the tree-shape loop (`bracket.ts:81-102`), the bye fixpoint (`:110-131`), the loser ordering (`:196-198`), and the seat spread (`:45-59`) never ask what a seat *means*. If storage were free-form, the engine diff really would be near zero.

**It fails at storage, and it fails silently.** `p1_user_id` is FK'd to `app_users` (fact 1). Writing a `teamId` there raises a foreign-key violation, which `persist.match.insert` swallows through `fire()` (fact 3). The failure chain:

1. `pushMatch()` pushes to the in-memory `matches` array — succeeds.
2. `persist.match.insert()` fires the INSERT — Postgres rejects it — logged and dropped.
3. The admin sees a perfect bracket. Players see a perfect bracket. `isDrawn()` is `true`. Everything works.
4. On the **next deploy or restart**, hydration reads `app_matches` and finds nothing for that event. The bracket is gone. `matchesForComp(compId).length === 0`, so the draw lock releases: registration, ticket edits and admin approval all reopen mid-tournament.

Given CLAUDE.md §1 documents deploys happening several times a day, this is not theoretical — it is the default outcome of the naive design, and undetectable until it has already destroyed a bracket. The two `CHECK` constraints (fact 2) would compound it.

**So team sides get their own columns**, landed through the existing self-heal block:

```sql
ALTER TABLE app_matches ADD COLUMN IF NOT EXISTS p1_team_id     TEXT
ALTER TABLE app_matches ADD COLUMN IF NOT EXISTS p2_team_id     TEXT
ALTER TABLE app_matches ADD COLUMN IF NOT EXISTS winner_team_id TEXT
```

Solo matches leave these `NULL`. Team matches leave `p1_user_id` `NULL`, so the user FK and both CHECKs are trivially satisfied. Deliberately **no FK on the team columns** in the first landing — add it in a later phase once the table is proven populated.

The cost is drift between two `resolveByes()` implementations (accepted deliberately — see §11 row 4). Converge via `bracket-core.ts` (Phase 6) only after 2v2 has run through a real competition, never before.

### 1.4 Where a shared conditional is unavoidable — the honest limit

Four places, all read/display/persist boundary code, not engine code — a defect here surfaces as a wrong name or missing row, not corrupted tournament state, but every one is a required review item:

| Site | Why unavoidable | Blast radius if wrong |
|---|---|---|
| `bracket/page.tsx:22-33` | `player(m.p1UserId)` must resolve either a user or a team into the `Player` DTO | Wrong/missing name on a bracket card. Branch on the **stored row** (`m.p1TeamId != null`), not config. |
| `admin/events/[id]/page.tsx:38,44-46` | `players`/`finalSeats` counts read user columns directly | Wrong count shown to the admin deciding whether to assemble the final |
| `persist.match.insert` (`persistence.ts:378-389`) | Must carry 3 new fields into `values()` **and** `onConflictDoUpdate.set()` | **The dangerous one** — an omitted field in `set()` loses a recorded winner on the next save. **Verify Drizzle's `undefined`-in-`set` semantics empirically before shipping.** |
| `api/admin/finalize/route.ts` | `seenRank` guard (fact 21) rejects two members sharing rank 1 | Finalize returns 400, tournament can't close — see §5.2 |

`Match` gains three optional fields, `loadMatch` gains three mappings — additive, same shape as `freeAttempts`/`paidAttempts`/`rejectReason` on `Registration`.

### 1.5 The immutability rule that closes the last hole

`teamSize` must be **frozen once anyone has registered**, not merely once the bracket is drawn — a solo registration has no `teamId` (unseatable by the team engine) and a team registration has one the solo engine ignores (silently drops half the field).

**Rule:** the event-edit route rejects a `teamSize` change with `409` when `registrationsForComp(compId).length > 0` — same idiom as `reg-approve/route.ts:26-28`. This structurally prevents switching a live event's format.

Also: any read of an existing bracket derives team-ness from `m.p1TeamId != null`, never from config — a config edit can never make a drawn bracket unreadable.

---

## §2 — The team data model

### 2.1 Recommendation

> **A real `Team` entity with its own table and id space, plus one nullable `teamId` on `Registration`.** A 2v2 seat is a `t_*` id. A solo `Registration` keeps `teamId` absent and is untouched.

```
app_teams
  id            TEXT PK        t_*
  comp_id       TEXT NOT NULL  → app_events(id) ON DELETE CASCADE
  name          TEXT NOT NULL  displayed on every bracket card
  captain_id    TEXT NOT NULL  → app_users(id) ON DELETE CASCADE
  status        TEXT NOT NULL  'forming' | 'complete' | 'disbanded'
  attempts      INTEGER NOT NULL DEFAULT 1   -- the team's سهم count, set by the captain
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()

app_team_members
  team_id       TEXT NOT NULL  → app_teams(id) ON DELETE CASCADE
  user_id       TEXT NOT NULL  → app_users(id) ON DELETE CASCADE
  slot          INTEGER NOT NULL          -- 0 = captain
  status        TEXT NOT NULL             -- 'invited' | 'accepted' | 'declined'
  PRIMARY KEY (team_id, user_id)
```

Plus: `ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS team_id TEXT` (landed exactly like `free_attempts`).

### 2.2 Why not paired `Registration` rows (no new table)

Fails on four counts: (1) a pair of rows has no name — every bracket/match card and notification needs a team label, underiveable cheaply; (2) cannot represent a half-formed team (captain must be able to pay before the partner accepts — the core UX property in §3); (3) a derived seat id (`sort(regIdA,regIdB)`) is unstable — `createRegistration` reuses a rejected row with a fresh count, which would change the id after a draw; (4) cannot ever be FK'd. Cost of the real table: ~120 lines, mechanical, following the `app_gamenets` pattern already in `persistence.ts:189-201`.

### 2.3 Why a member table, not two columns on `app_teams`

Per-member invite state (`invited|accepted|declined`) belongs to the membership, not the team — and placement minting / notification fan-out / "am I on this team" checks all want to *iterate members*. If the founder firmly rules out ever exceeding 2 (§12 Q6), two columns on `app_teams` is an acceptable ~30-line simplification.

### 2.4 The one thing that must not happen

`Registration.userId` stays non-null and keeps its meaning for team registrations — do **not** make it nullable or overload it. `UNIQUE (user_id, comp_id)` continues to hold, so `remainingTickets`, `getRegistration`, `registrationsForUser`, `pendingRegistrations`, `approvedRegistrationsForComp`, `unpaidAttempts` and the entire admin approval queue keep working on team registrations **with no changes at all**. Largest reuse win in the plan, direct consequence of "team is a new thing," not "team is a reinterpretation of an existing thing."

---

## §3 — How registration works for a 2v2 event

### 3.1 The flow

```
A opens /competitions/[id]/register   (event has teamSize 2)
  → new first step: «نام تیم» + «تگِ هم‌تیمی» (@handle) — same pattern as the
    existing referral tag field (register/form.tsx:113-120), resolved via the
    same getUserByTag() (store.ts:271); self-pairing blocked like referral is
  → A picks سهم count (1..6, same picker)
  → POST /api/register { compId, attempts, teamName, partnerTag }
      creates Team{status:'forming', attempts}
            + TeamMember(A, slot 0, 'accepted')
            + TeamMember(B, slot 1, 'invited')
            + Registration(A){ teamId, attempts }        ← unchanged code path
  → A lands on /pay and pays for A's own سهم           ← unchanged code path
  → B gets pushNotif (+ SMS, already in SMS_TRIGGERS)

B opens /competitions/[id] → invite banner → accept/decline
  → accept: TeamMember(B) → 'accepted' + Registration(B){ teamId, attempts }
  → B pays for B's own سهم                              ← unchanged code path

Both registrations approved by admin → team is seatable at draw time
```

The captain is never blocked on someone else's action — the central property.

### 3.2 Payment: per-individual, not per-team

Both members pay their own سهم and upload their own receipt.

1. Everything about payment is keyed to one registration id (`app_receipts.reg_id` PK, `/api/admin/receipt/[regId]`, `unpaidAttempts`/`paidAttempts`/`freeAttempts` per-row, the whole review sheet is a list of registrations). A per-team payment needs a new payment entity, blob table, upload route and review surface for no benefit here.
2. Referral free tickets (`u.freeTickets`) are per-user — a team-level payment would make them unspendable, quietly breaking a live campaign.
3. The admin queue stays homogeneous — no new review mode.

### 3.3 Admin approval when the unit is a team

> **Approve per person. Gate the team at seat time. `api/admin/reg-approve/route.ts` is not modified at all.**

Seatable ⇔ both members `accepted` ∧ both hold an `approved` registration.

| Situation | Result | Required UI |
|---|---|---|
| Both approved | Team seated | — |
| One approved, one rejected | Not seated | Notify surviving member; allow partner replacement pre-draw |
| Partner never accepted | Not seated | Persistent banner on `/me` |
| Partner accepted but never paid | Not seated | Same banner, aimed at the unpaid member |

**Non-negotiable:** an «تیم‌های ناقص» list on `admin/events/[id]/page.tsx`, above the draw controls, showing every `forming` team with money already collected — without it, an admin rejecting one person silently kills a paying team with no signal anywhere.

Partner replacement reuses the existing lock verbatim (allowed pre-draw, 409 after). The replaced partner's own registration is untouched — no cascade-delete of a paid row.

### 3.4 The سهم count and the 6-cap

The captain chooses the team's سهم count; it's carried to the partner; both pay for exactly that count. `team.attempts` is what `distributeSeats` receives as the seat's attempts — this makes a mismatch impossible by construction (the alternative, reconciling independent counts with `min()`, is strictly worse: a player could pay for an unusable سهم).

The existing 1–6 cap applies per member, unchanged, against the same `remainingTickets()`. Whether it should differ for teams is §12 Q4 — default is identical, zero code changes either way.

---

## §4 — How the bracket engine changes

### 4.1 Verdict on "opaque seat id"

**Holds completely for the algorithms, fails at exactly three points.**

| Function | Opaque today? | Team path |
|---|---|---|
| `rng`, `shuffle`, `seedFrom`, `DEFAULT_QUALIFY` | ✅ pure | import verbatim |
| `distributeSeats` (`:45`) | ✅ fully opaque (fact 7) | import verbatim; pass `{userId: teamId, attempts: team.attempts}` |
| `groupKeyOf` (`:37`) | ❌ dereferences via `getUserById` | twin — needs a team→city rule (§12 Q1) |
| `buildTree` (`:73`), `feedWinner` (`:63`), `resolveByes` (`:110`), `rankBracket` (`:182`) | ⚠️ field-name-bound | twin — identical body, team fields |
| `setMatchWinner` (`:163`) | ❌ field-bound + notifies one user | twin — plus fan-out to both members |
| `generatePrelims` (`:135`) | ❌ builds groups from registrations | twin — builds groups from seatable teams |
| `computeQualifiers`, `assembleFinal`, `setFinalSeeding` | ✅ opaque but for one inner call | twin — trivial wrapper |
| `setBracketQualify`, `isDrawn` | ✅ fully opaque | **no change, shared** |

~70 duplicated lines total, five functions carrying real logic, the rest trivial or shared. The reframing's real payoff is not "zero engine change" — it's **zero engine change on the solo path**.

### 4.2 The team engine

`generateTeamPrelims({compId, teams, groupMode})` mirrors `generatePrelims` exactly: seats = seatable teams → group by `teamGroupKeyOf` → `distributeSeats` (imported) → `buildTeamTree` → same qualify-key format → `setEventConfig` merge. Same seed derivation ⇒ a team's k سهم land in k distinct brackets, same self-avoidance guarantee as solo.

`teamGroupKeyOf(team, mode)` — recommendation: **captain's city/province**, same `${mode}:${value}` format so `prelimGroupKeys()`, `BracketView`'s scope list, and the prelim-venue map (`docs/26` §1.6.1) need zero changes. Surface it at team-creation time. Founder call — §12 Q1.

`setTeamMatchWinner` — identical to `setMatchWinner` against team fields, notification fans out to both members via the existing `'advance'` type (no `notif_type` enum change).

Fully shared, zero changes: `matchesForComp`, `clearMatchesForComp`, `clearMatchesByStage`, `pushMatch`, `saveMatch`, `getMatch`, `findNextMatch`, `prelimGroupKeys` — all filter/sort on `compId`/`stage`/`groupKey`/`bracket`/`round`/`slot`, never a participant field.

---

## §5 — Points and placement attribution

### 5.1 Recommendation

> **One `Placement` row per team member, both at the same rank.** No `teamId` on `Placement`, `storePlacement` unchanged, `pointsForPlacement` unchanged, all four leaderboard sites unchanged.

Works because all four consumers iterate `allPlacements()` and attribute to `pl.userId` — two rows at rank 1 are indistinguishable from two players who each won something. `UNIQUE(user_id, comp_id)` satisfied, no DDL.

### 5.2 The blocker that must be fixed in the same change

`finalize`'s `seenRank` guard (fact 21) trips on two members sharing rank 1. **Fix: validate over seat ids (teams), then fan out** — build the clean/validated list against teams first, only then expand each into `storePlacement(memberUserId, …)` per member. `regIds.has(row.userId)` passes unchanged for both. **Single most likely place this feature fails on the night of a real final** — required review item.

### 5.3 Whether both members get full points

Minimal diff gives both full `pointsForPlacement(rank, tier)` — doubles what one 2v2 event injects into the ladder, and lets two strong players both bank a champion's result. `docs/14-ranking-design.md:68` already asked for a low-tier farming cap that was never built. **Founder decision, §12 Q2 — do not guess the number.** If a split/discount is wanted, it's a single multiplier at the team finalize call site.

---

## §6 — Admin UI

### 6.1 Format + price selector

New `Field` block after «رشته», added to **three** forms posting to the same endpoints:

- `app/admin/events/new/form.tsx` — main create form
- `app/admin/competitions/[id]/add-discipline.tsx` — **the flow actually used** for a multi-discipline رویداد like «Gameland The Best»; missing this makes the feature invisible where it matters most
- `app/admin/events/[id]/edit/form.tsx` — disabled with an explanatory line once any registration exists (§1.5)

```
Field «فرمت بازی»:  [ ۱به۱ (انفرادی) ]  [ ۲به۲ (تیمی) ]   → teamSize: 1|2 (default 1)
  hint: «براکت‌ها تیم‌به‌تیم چیده می‌شن. هر بازیکن سهمِ خودش رو جدا پرداخت می‌کنه.»

Field «قیمت هر سهم (تومان)» hint «خالی = پیش‌فرض ۵۰۰٬۰۰۰»: [ number ] → ticketPrice?
  [ number ] «قیمت قبل از تخفیف» → ticketOriginal?
```

Empty price must resolve to `undefined`, not `0`. **Prefer extending `/api/admin/events`** to write `EventConfig` atomically at creation, over a second round-trip that leaves a window where a 2v2 event briefly exists as 1v1. Immutability guard (§1.5) lives in that route's `PATCH` handler.

### 6.2 Draw and result screens

**`tournament-panel.tsx` — no restructuring**, already format-agnostic (keyed on `groupKey`/`bracket`). Three additive touches: a format badge, word swaps driven by one `unit` prop (`نفر`→`تیم`), and the «تیم‌های ناقص» list above the draw button.

**`draw-button.tsx`/`result-controls.tsx` — do not touch** (dead, fact 13).

**`BracketView.tsx` — the real result screen** (fact 15), needs no structural change — `Player = {uid, tag, name}` is already abstract. Server page fills it with `{uid: team.id, tag: team.name, name: '@a + @b'}` for team sides. `winnerUserId` posted from the button is just the team id — zero changes to `MatchCardRow`/`PlayerLine`/`TreeCard`/`TreeSlot`/`RadialBracket`.

One real fix needed: `meUid` drives "my matches"/scope default by comparing `p.uid`; on a team event this never matches. **Fix: pass `meSeatId` from the server** (my team's id for team events) — one prop, client comparison logic untouched.

---

## §7 — Per-event ticket price

### 7.1 Home: `EventConfig`, not a column

Same reasoning as `prizeSplit` (fact 10) — per-event admin-set money already lives there. Zero DDL, automatic zero-regression via fact 12, and `setEventConfig`'s merge (fact 11) means `generatePrelims`' write can't clobber it. A column costs four more touch points (`Event` interface, `EVENT_EDITABLE`, `persist.event.*`, `loadEvent`) that the live 1v1 path executes; the blob touches none.

> **Hard rule: one resolver, `TICKET.price` never imported outside it.**
> `ticketPriceFor(compId): {price, original, offPercent}` in `lib/payment.ts` → `cfg.ticketPrice ?? TICKET.price`, recomputing `offPercent` per event (today's `ticketOffPercent` is a module constant and would show the wrong discount for a repriced event).
> Required review item: **`grep -rn "TICKET\." web/app` returns only `lib/payment.ts`.**

### 7.2 Every read site that must change

| Site | Change |
|---|---|
| `register/form.tsx:74,75,126` | thread `price`/`original` as props from `register/page.tsx:64`; **hide the discount badge when `original <= price`** |
| `pay/pay-view.tsx:82,85` | thread `price` prop from `pay/page.tsx:18` |
| `admin/analytics/client.tsx:68` | revenue must become **Σ over events** of `approvedTickets(e) × ticketPriceFor(e.id).price` — computed server-side, not a global constant × global count |
| `api/assistant/route.ts:162` | remove price from the **static** rules block (would confidently quote 500,000 for every event); move into the per-event snapshot at `:38-56` |
| `admin/requests/request-list.tsx` | **add the expected amount** to the review sheet — the preset reject reason «مبلغ واریزی نادرست» (fact 19) proves admins check amounts mentally; per-event pricing silently breaks that. Safety requirement, not polish. |

No server-side receipt-amount validation exists to update (fact 18) — which makes the review-sheet display the *only* control over wrong payments, hence the last row is mandatory.

---

## §8 — Public-facing display

| Surface | Solo (unchanged) | Team |
|---|---|---|
| `/competitions/[id]` | today's CTA | + «۲به۲ — تیمی» chip; invite banner for a pending `TeamMember` |
| `/register` | today's form | team-name + partner-tag step above the ticket picker; explainer gains per-member-pays + captain's-city notes |
| `/pay` | today's view | + «این پرداخت فقط سهمِ خودته — هم‌تیمیت جدا پرداخت می‌کنه» |
| `/me` | ticket tiles + roadmap | + team card: both members, per-member status, incomplete-team banner with replace-partner CTA |
| `/bracket` | as today | team name where the tag is, both members on a second line; `meSeatId` replaces `meUid` |
| `/me`, `/leaderboard`, `/players/[id]` | placement points | **unchanged** — §5.1 means each member already has a normal `Placement` row |

---

## §9 — Phased rollout

- **Phase 0 — the differential harness** (§10). Build before writing any feature code — it's what makes every later phase reviewable.
- **Phase 1 — per-event ticket price, alone.** `EventConfig.ticketPrice` + resolver + the read sites in §7.2 + review-sheet amount. Touches no bracket/registration/team code. Ships independently, fully reversible, delivers half the founder's ask in a day.
- **Phase 2 — `teamSize` as a declared, inert flag.** Selector on the 3 forms, immutability guard, `Match`'s 3 optional fields, the 3 `ALTER TABLE`s, persist/hydration — but registration on a 2v2 event stays closed ("soon"). Nothing can run, nothing can break. Proves the new columns survive a restart before anyone depends on them.
- **Phase 3 — teams and team registration, still no draw.** `app_teams`/`app_team_members` + invite/accept + per-member payment (unchanged path) + «تیم‌های ناقص» admin list + `/me` team card. Draw button stays disabled. Fully reversible (`DELETE FROM app_teams` undoes it) — real signups, real money, engine still untouched.
- **Phase 4 — `bracket-team.ts` + the team draw.** The 5 duplicated functions, 4 route dispatches, `export`-only diff to `bracket.ts`, DTO/admin-page branches, `meSeatId`. **Gate: Phase 0's replay byte-identical + §10.4 restart test passing.** Pilot on a small field, in a رویداد separate from the live 1v1 event (§12 Q8).
- **Phase 5 — team finalize, placements, points.** The seat-validate-then-fan-out fix (§5.2) + per-member `storePlacement`. Blocked on §12 Q2.
- **Phase 6 — demand-driven.** `bracket-core.ts` convergence, FK on team columns, team size > 2, persistent teams.

Dependencies: 1 and 2 depend on nothing. 3 hard-depends on 2. 4 hard-depends on 3 **and Phase 0 passing**. 5 hard-depends on 4 and §12 Q2. Nothing depends on 6.

---

## §10 — The non-regression test plan

No test suite exists, so the proof is differential and mechanical. Four gates, all required.

### 10.1 Gate 1 — source-diff (5 seconds)

```bash
git diff origin/mvp -- web/lib/bracket.ts     # must show ONLY added `export` keywords
grep -rn "TICKET\." web/app                    # must return only lib/payment.ts
grep -n "teamSize" web/lib/bracket.ts          # must return nothing
```

### 10.2 Gate 2 — deterministic replay (the core proof)

The draw is reproducible (`seedFrom(compId + …)`) — same event id + same registrations + same insertion order ⇒ same bracket. On a **scratch Postgres, never Liara's `DATABASE_URL`**:

1. Fixture with fixed ids (`u_t01`…`u_t40`, `e_test1v1`), 40 users, varied attempts, one tier-A event.
2. Drive the full lifecycle through the real HTTP routes (register ×40 → reg-approve ×40 → draw → match ×N → assemble-final → finalize).
3. Diff on the **natural key** (match ids are random, so dump `stage, group_key, bracket, round, slot, p1_user_id, p2_user_id, winner_user_id, status ORDER BY …`, plus `app_placements` and `app_registrations`), run once on `origin/mvp` and once on the feature branch against a freshly reset DB each time. **The three dumps must be byte-identical.** Also diff the leaderboard-rendered points for all 40 users.

### 10.3 Gate 3 — write-through gate (catches the silent FK failure)

Same lifecycle on `e_test2v2` with `teamSize:2`: `app_matches` row count > 0 and equals the draw response's count; **zero** `[db] write failed`/`ensureSchema` log lines during the run; team columns populated and `p1_user_id IS NULL` for team matches (and vice versa for solo); explicitly re-save a recorded winner and confirm it survives (`onConflictDoUpdate` probe).

### 10.4 Gate 4 — restart gate (mandatory, most likely to be skipped)

Kill the process, start it again: the 2v2 bracket is still there, `isDrawn()` still `true`, registration still locked (`REG_LOCKED` / 409), and the solo event `e_test1v1` is identical. **This is the only test that would have caught the §1.3 catastrophe.**

### 10.5 Live-adjacent checks before any deploy

- `git fetch && git status` — confirm not behind `origin/mvp`.
- **`git status --short` must be clean of unrelated work** — the tree currently carries staged gamenet Phase 0/2 changes (fact 23); deploying 2v2 from this tree today would ship unfinished gamenet code to production. Commit/push/deploy the gamenet work (or stash it onto its own branch) before starting Phase 1.
- After deploying, open the real live 1v1 bracket and confirm it renders unchanged versus a pre-deploy screenshot.

---

## §11 — Risks and design stance

| # | Risk | Stance |
|---|---|---|
| 1 | Team id in `p1_user_id` violates the FK; `fire()` swallows it; bracket vanishes on next deploy | The plan's central threat (§1.3). Eliminated by dedicated team columns. Verified by Gates 3–4. |
| 2 | `finalize`'s duplicate-rank guard blocks two members at the same rank | §5.2 — validate over teams, fan out after. Required Phase 5 review item. |
| 3 | `teamSize` flipped after registrations exist | 409 once `registrationsForComp > 0`. Display derives team-ness from the stored row, never config. |
| 4 | Drift between `bracket.ts`/`bracket-team.ts` | Accepted deliberately — contained (a team-engine bug can't touch a 1v1 event), bounded (~70 lines, 5 functions). Converge via `bracket-core.ts` only after 2v2 runs a real competition. |
| 5 | `onConflictDoUpdate` dropping new team columns on re-save | Subtlest bug available — loses results only after a re-save, only on team events. Explicitly probed in Gate 3. Measure Drizzle's behavior, don't assume it. |
| 6 | Team members in different cities | Captain's city, surfaced at team-creation time. Preserves the existing groupKey format. Founder call — §12 Q1. |
| 7 | Captain pays, partner never accepts | Captain's payment is never in limbo as a record — only seating is blocked. Mitigated by pre-draw replacement + banner + admin list. Refund policy is §12 Q3. |
| 8 | Admin rejects one teammate, silently kills a paying team | «تیم‌های ناقص» list is non-negotiable, plus a replace-partner notification to the survivor. |
| 9 | Per-event pricing breaks the admin's mental amount-check | Review sheet must show the expected amount — ships **in Phase 1**, with the pricing. |
| 10 | Assistant confidently quoting the wrong price | Moved from the static rules block into the per-event snapshot. |
| 11 | Analytics revenue quietly wrong once prices differ | Must become a per-event sum, not global constant × global count. |
| 12 | Stale/dirty checkout rolling production back | Highest-probability historical incident (CLAUDE.md §1) and **currently live** — uncommitted gamenet work sits in this tree today. Commit/deploy it or stash it before starting Phase 1. |
| 13 | `app_disciplines` trap (pre-existing, not fixed here) | Discipline added via `/admin/disciplines` is memory-only, vanishes on redeploy; any event on it hits the FK and silently fails. Not required for 2v2 (2v2 is a flag, not a discipline) — a further reason not to model it as one. Flag to founder, fix separately. |
| 14 | 6-سهم cap semantics for teams | Per member, unchanged. §12 Q4 if he wants different. |
| 15 | 2v2 win paying double into the national ladder | Minimal diff gives full points to both members — a real farming shape. Gates Phase 5 on §12 Q2. |
| 16 | Dead code mistaken for live code | `draw-button.tsx`, `result-controls.tsx`, `/api/admin/result` — do not modify. Worth deleting separately, not here. |

---

## §12 — Open questions for the founder

Blocking, in dependency order:

1. **Which city does a 2v2 team belong to when members live in different cities?** Plan implements captain's city. Alternatives: force same-city pairing, or a `province`-only group mode for 2v2. Blocks Phase 4.
2. **Full points to both members on a 2v2 win, or split?** Doubles what one event injects into the ladder. Blocks Phase 5 — recommend deciding after one real 2v2 event has run.
3. **Captain pays, partner never accepts, draw happens — refund policy?** No gateway, so any refund is manual/out-of-app. Options: manual refund, convert to another event, forfeit.
4. **Does the 6-سهم cap or ticket price differ for a 2v2 event?** Plan keeps both identical per member; per-event price from Phase 1 already covers price differences if wanted.
5. **Can one player be on two teams — different events? same event?** Different events: allowed by design. Same event: structurally blocked by `UNIQUE(user_id, comp_id)`.
6. **Will anything ever exceed 2v2 (3v3, 5v5)?** If firmly no, `app_team_members` collapses into two columns (~30 lines lighter). If maybe, keep the member table.
7. **Can a team rename itself after the draw?** Plan says yes (it's a label, never a seat id) — confirm, since it's visible to everyone watching the bracket.
8. **Should the first 2v2 pilot sit inside the same رویداد as the live 1v1 event, or a separate one?** Plan recommends a **separate رویداد** for the pilot, independent of whether they can technically coexist.

---

### Critical files for implementation

- `web/lib/bracket.ts` — **frozen.** Only added `export` keywords; the §10.1 diff gate is the whole safety argument.
- `web/lib/store.ts` — `EventConfig.teamSize`/`ticketPrice`, `Match`'s three optional team fields, the `Team`/`TeamMember` entity family, `Registration.teamId`, the seatable-team query.
- `web/lib/db/persistence.ts` — the three `ALTER TABLE app_matches` statements, `app_teams`/`app_team_members` DDL + hydration, `persist.team.*`, and the `persist.match.insert` `onConflictDoUpdate` fix (risk 5).
- `web/app/api/admin/draw/route.ts` and `web/app/api/admin/match/route.ts` — the two engine dispatch points; the only new conditional a solo event ever encounters.
- `web/app/api/admin/finalize/route.ts` — the seat-validate-then-fan-out fix (§5.2).
- `web/lib/payment.ts` — `ticketPriceFor(compId)`, the only permitted reader of `TICKET`.
