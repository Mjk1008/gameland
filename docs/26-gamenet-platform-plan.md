# 26 — Gamenet Platform Plan

**Stage:** Plan (Opus 5 consult, 2026-07-31, revised same day after founder answers) · **Status:**
Revision A below reflects the founder's answers to the original §8 — ready to start Phase 0.5/Phase 1.

Scope: rich gamenet profiles · gamenet-hosted competitions · a per-competition quota-feeder
bridge into the existing tournament engine · a prelim-venue announcement for the platform's own
brackets · gamenet-competition ranking points. Not in scope here: the gamenet DB-persistence bug
(planned/fixed separately — see chat log 2026-07-31), booking/reservations, paid B2B tiers, maps
SDK, online payment.

> **Read Revision A first** (right after this header) — it supersedes §1.2's ranking-impact
> conclusion, §2, §6, §7 row 3, and §8 from the original plan below. The original sections are kept
> intact underneath for full reasoning/context; where they conflict with Revision A, Revision A wins.

---

# Revision A (2026-07-31) — founder answers incorporated

## Changelog

1. **§1.5 (new)** — Founder answered §8.1 "yes, give points too." Gamenet wins now earn national points, but **not** through `pointsForPlacement()` and **not** via a `tier: 'D'`. `event_tier` is a **Postgres enum** (`init.sql:20`), hardcoded into `points_for_placement()` (`init.sql:197`) and the `leaderboard` view (`init.sql:223`) with no `ELSE` — a `'D'` tier would silently compute zero points and require a non-idempotent `ALTER TYPE`. Points instead flow through a fourth derived term alongside the two that already ship (`bonusPoints`, `activityPointsOf`).
2. **§1.2** — its reasoning stands and is *strengthened*; only its concluding sentence about zero ranking impact is amended (points now leave via §1.5's narrow, non-FK path). `GamenetEvent` still never becomes an `app_events` row; `allEvents()`, `pendingRegistrations()`, the paid-registration queue and the assistant snapshot are all still structurally blind to gamenet events.
3. **§2.7 (new)** — Founder answered §8.2 "both." Free-granted quota (Phase 4, unchanged) plus purchased seat top-ups. `seats` stays the single number the grant path reads; `grantedSeats`/`paidSeats` record provenance.
4. **§3.5/§8.6 confirmed** — ownership model unchanged, no revision.
5. **§1.6 (new)** — Founder answered §8.10: option (b), and it is the near-term operational need for «Gameland The Best». A venue+schedule label on the existing city-grouped prelim mechanic — not a new entity. `prelimGroupKeys()` (`store.ts:1186`) derives from `app_matches`, so it's useless pre-draw; the venue map is keyed off `iran-geo.ts` values instead.
6. **§6 reordered** — new Phase 0.5 / 1.5 (venue), 3.5 (gamenet points), 4.5 (purchased seats).
7. **§7 row 3 rewritten** — "structurally impossible" is no longer true; replaced with a bounded-and-reversible stance. Two new rows added (formula drift, paid-leniency).
8. **§8 trimmed** — 1, 2, 6, 10 removed as answered; remainder renumbered; six new questions added, including the gamenet-points curve/cap and gamenet seat pricing, which are founder calls this revision deliberately does not pick numbers for.

## §1.5 — Do gamenet results earn national points? (supersedes §1.2's ranking-impact conclusion and answers §8.1)

> **Yes — through a fourth, separately-curved, separately-capped points term derived from
> admin-verified `GamenetResult` rows. Never through `app_placements`, never through
> `pointsForPlacement()`, never through a new `tier` value, and never by turning a `GamenetEvent`
> into an `app_events` row.**

### 1.5.1 Why the `tier: 'D'` route is worse than the original plan even claimed

The original §1.1 rejected tier-overloading on maintainability grounds. Verification since found three harder blockers:

1. **`event_tier` is a Postgres enum, not a text column.** `init.sql:20` declares `CREATE TYPE event_tier AS ENUM ('S','A','B','C')`. Adding `'D'` requires `ALTER TYPE … ADD VALUE` — the first non-idempotent DDL the self-heal block would ever carry (every statement in `persistence.ts:44-64` today is `CREATE TABLE/COLUMN IF NOT EXISTS`), and enum values can never be removed.
2. **A `'D'` tier silently evaluates to zero points in Postgres.** `points_for_placement()` (`init.sql:197-221`) is `CASE p_tier WHEN 'S' … WHEN 'C' THEN 0.3 END` with **no `ELSE`**. A `'D'` row returns `NULL`; `sum()` in the `leaderboard` view (`init.sql:223`) skips NULLs — a latent correctness bomb in a view whose own comment calls it the ONLY place points are computed.
3. **Widening the union reopens every §1.2 leak at once.** `EventTier` (`schema.ts:4`), `Event.tier` (`store.ts:497`), `TIER_MULTIPLIER`/`TIER_LABEL_FA` (`ranking.ts:25,32`), `EVENT_EDITABLE` (`store.ts:568`) — and then every inclusive read (`allEvents()`, `pendingRegistrations()`, the assistant's `contextBlock()`) needs a `tier !== 'D'` guard forever, for a change the founder only asked to affect *points*.

**Rejected.**

### 1.5.2 The finding that makes the safe route cheap

National points are already a sum of three independent terms, only one of which comes from placements — identical at four call sites: `app/page.tsx:29-35`, `app/leaderboard/page.tsx:45-52`, `app/me/page.tsx:28-33`, `app/players/[id]/page.tsx:21-28`:

```
points(u) = (u.bonusPoints ?? 0) + activityPointsOf(u) + Σ pointsForPlacement(pl.rank, ev.tier)
```

(A fifth site, `app/api/assistant/route.ts:86`, computes only the first two terms — a pre-existing inconsistency; see §7 row 13.)

So there is shipping precedent for national points that come from neither `app_placements` nor `app_events`: `bonusPoints` (`store.ts:43`, admin-set via `setUserBonusPoints`) and `activityPointsOf(u)` (`store.ts:125-135` — referral 50, complete profile 25, avatar 10, tickets ×15/×5). Gamenet points are the same *kind* of thing: derived, non-placement, supplementary.

### 1.5.3 Recommendation — a fourth derived term, `gamenetPointsOf(userId)`

1. **Satisfies the founder while changing nothing load-bearing** — zero edits to `pointsForPlacement()`, `TIER_MULTIPLIER`, `EventTier`, the `event_tier` enum, the SQL function, the `leaderboard` view, `app_placements`, `app_events`, or `bracket.ts`.
2. **Every §1.2 leak stays structurally closed** — `GamenetEvent` is still not an `app_events` row; only a *number*, computed on read, crosses the boundary.
3. **"Lower-trust" becomes a property of a purpose-built curve, not a multiplier bolted onto the platform's** — the platform curve is shaped for a 128-player vetted bracket; a café night gets its own short curve, honestly, rather than the same curve quietly muted.
4. **Derived means revocable** — un-verifying a gamenet event removes its points on the next render, no backfill, no stored rows to correct.

**Do not carry gamenet points in `bonusPoints`** — `setUserBonusPoints` *assigns*, it doesn't accumulate, so it would be destroyed by the next manual adjustment, unauditable, and impossible to revoke on un-verify. Keep it derived, like `activityPointsOf`.

### 1.5.4 The four dampers

1. **Admin-verified gate, not a discount** — only `GamenetResult` rows whose parent `GamenetEvent.status === 'verified'` count. `'reported'` counts for nothing; retroactive for free because points are derived.
2. **Its own short, flat curve** — top 3–4 places only, ceiling below the platform's lowest meaningful placement reward, so no amount of café winning can outrank showing up to one real event. Numbers are §8 new question 8 — founder's call.
3. **Participant-count scaling** — an 8-person night must not pay like a 64-person regional; scale the ceiling off `GamenetEvent.participantCount`, floored by `minParticipants`. Doubles as an anti-fraud lever: inflating participants means inflating the `GamenetEntry` roster the §7 row-2 flags already inspect.
4. **Per-player, per-window cap** — `docs/14-ranking-design.md:68` already asked for exactly this ("cap contribution from low-tier events, no farming") and it was never implemented. Gamenet points are the first place to honor it.

Discipline gate: only `GamenetEvent.discId` refs (`app_disciplines`) count — never the free-text `titles` column (§3.4).

### 1.5.5 Legibility

- `/me` and `/players/[id]` render a distinct «امتیاز گیم‌نتی» line — never merged into the placement total.
- A `GamenetResult` never produces a row in `honorsFor()`/`titleCounts()` (`ranking.ts:110-155`) — a café win is not a title.
- `playerCard()` (`lib/player-cards.ts`) stays driven off placement points only.

### 1.5.6 The one real cost — five duplicated formulas

Adding a term to five hand-copied loops without consolidating is how the leaderboard and the profile page end up disagreeing. **Consolidate into a single `nationalPointsOf(u)` in `lib/store.ts`/`lib/ranking.ts` as part of this same phase** — mechanical, five call sites, and it fixes `app/api/assistant/route.ts:86`'s pre-existing omission of the placement term as a side benefit (a bug fix, not a regression).

### 1.5.7 Phase placement — 3.5, not 3

Strictly after Phase 3 (nothing to award until `GamenetEvent`/`GamenetResult` + verify exist), independent of Phase 4/5. Do not bundle into Phase 3 — Phase 3's pitch was "fully reversible, zero ranking impact, observe real behavior first." Ship Phase 3, let real gamenet events get verified, then calibrate the curve against real participant counts/frequency/roster quality. Guessing the curve before that data exists is guessing twice.

## §2.7 — Free-granted vs purchased quota (answers §8.2 and half of §8.11)

Two products, one mechanism. Free-granted quota is Phase 4 exactly as designed — no change. Purchased quota is additive.

**Data model** — split the count, keep `seats` as the single number the grant path reads:

```ts
// EventConfig (store.ts:1121) — still zero DDL on app_events
gamenetQuota?: Record<gamenetId, {
  seats: number            // TOTAL usable = grantedSeats + paidSeats. Grant path reads ONLY this.
  grantedSeats: number     // gifted by admin. No receipt, no payment row.
  paidSeats: number        // unlocked by a SETTLED payment. 0 until one is approved.
  paidRef?: string         // → app_gamenet_payments(id) that settled paidSeats
  stage: 'prelim' | 'final'
  minParticipants?: number
  note?: string
}>
```

Plus `app_gamenet_seeds.seat_source TEXT ('granted' | 'paid')`, frozen at grant time like `entry_stage` — so a later config edit can never reinterpret seats already in a drawn bracket, and reconciliation ("which used seats were paid for") stays possible.

**Payment — mirror registration, invent nothing.** `app_gamenet_payments (id, gamenet_id, comp_id, seats, amount, status pending|approved|rejected, reject_reason, decided_by, decided_at, created_at)` — the `Registration` status/`rejectReason` idiom. Proof image in its own blob table keyed by payment id, mirroring `app_receipts` (ids-only hydration, `hasReceipt`-style Set). Owner upload = copy of `app/api/register/receipt/route.ts`; admin approve/reject = copy of `app/api/admin/reg-approve/route.ts` **including its lock-on-draw 409 guard**.

**Non-negotiable: money buys seats, never verification or leniency.** A paid seat runs the identical `app_gamenet_seeds` pending→granted review — same proof photo, roster, `minParticipants` bar. No in-app refunds; revocation flags for manual out-of-app settlement.

**Phase placement, split by dependency:**
- **Phase 4.5 — purchased seat top-ups.** One table, one blob table, two near-copy routes, one owner screen. Follows Phase 4 (can't sell an unproven seat) but is small once Phase 4 exists.
- **Phase 6 — feeder-eligibility as a paid tier/subscription** (`docs/10-business-model.md:17`, R3) — changes *who may participate at all*, needs B2B pricing and an entitlement concept `gamenetQuota` doesn't have. Business decision, waits.

## §3.5 / §8.6 — Ownership and verification: confirmed, no change

**Decided 2026-07-31.** Any logged-in user may submit a gamenet; admin approval is the only gate. No national-ID/business-licence/signed-agreement requirement. Phase 1's admin-CRUD scope stands unrevised.

## §1.6 — Prelim host venue: the platform's own city bracket, physically hosted (answers §8.10)

Confirmed as option (b), and confirmed as the near-term need for «Gameland The Best»: each province gets one designated center, the platform's own prelim bracket runs there, the app announces where/when. **A label and a schedule on the existing city-grouped prelim mechanic — not a new entity, not a `GamenetEvent`, not a quota bridge, and `lib/bracket.ts` is untouched.** The founder's other case — a gamenet building/prizing its own separate competition — is unchanged and is exactly Phase 3+4.

### 1.6.1 The non-obvious constraint

`prelimGroupKeys()` (`store.ts:1186`) derives group keys **from `app_matches`** — they don't exist until after the draw, but venue announcement must happen *before* registration closes. Key the venue map off the same string format as `groupKeyOf()` (`bracket.ts:37-41`) instead — `${mode}:${value}` with `value` from `PROVINCE_NAMES`/`citiesOf()` (`lib/iran-geo.ts:42,44`) — available pre-draw.

### 1.6.2 Data model — `EventConfig` again, zero DDL

```ts
prelimVenues?: Record<groupKey, {   // groupKey = 'city:تهران' | 'province:اصفهان'
  gamenetId?: string        // preferred — inherits name/address/map_url/photos from the profile
  venueName?: string        // fallback: a hall, a club, a mall — no app_gamenets row
  venueAddress?: string
  mapUrl?: string
  fromDate?: string          // Jalali display string, same convention as Event.date
  toDate?: string
  scheduleNote?: string
  contactPhone?: string
}>
```

`gamenetId` is optional with a name/address fallback deliberately — a designated center is sometimes a real gamenet, sometimes a rented hall; requiring a gamenet row would either block the announcement or push the admin into fake gamenet rows polluting `/gamenets`.

### 1.6.3 Surfaces

- **Admin** — new section in `tournament-panel.tsx`, placed **above** the draw controls (pre-draw announcement, chronological ordering). City/province picker from `iran-geo.ts` + optional gamenet picker via `gamenetsByCity()` (`store.ts:871` — the second dead function this plan puts to work). New route `app/api/admin/prelim-venue/route.ts`, near-copy of `app/api/admin/qualify/route.ts`.
- **Public, pre-draw** — `app/competitions/[id]/page.tsx`: derive the viewer's group key from their own `user.city`/`user.province` under the event's `groupMode` (existing `myGroupLabel` only works post-draw off a match) and look it up in `prelimVenues`.
- **Public, post-draw** — `BracketView.tsx`'s `Scope` list (`:14,37-39`) gets the venue line under each scope header — purely additive.
- **Optional** — reverse link on the gamenet profile («میزبان مقدماتی …»).

### 1.6.4 It is a label, not a gate

Must not filter registration or touch `groupKeyOf()`/`distributeSeats()`/`generatePrelims()`. If "must physically attend your assigned venue" is ever wanted as an *enforced* rule, that's attendance verification — a different, larger feature (§8 new question 10).

### 1.6.5 Phase placement — ahead of Phase 3/4, split in two

1. It serves a live competition; Phases 3–5 serve a behavior that doesn't exist yet.
2. Risk profile closer to Phase 2 than Phase 4 — no new entity family, no bracket-engine change, no ranking impact, no fraud surface.
3. Cheapest possible test of the gamenet relationship the whole plan rests on.

- **Phase 0.5 — name-only venue announcement.** `venueName`/`venueAddress`/dates/schedule note. Depends on nothing — lives in `EventConfig`, which already persists today. Can ship before the gamenet persistence fix.
- **Phase 1.5 — link venues to real gamenet rows.** `gamenetId`, the `gamenetsByCity()` picker, the reverse profile link. Depends on Phase 0 + reads better after Phase 2.

## §6 — Phased rollout, revised order

- **Phase 0 — persistence + de-seeding** (unchanged). Wire `app_gamenets` into self-heal + `persist`. **Same change: delete `seedGamenets()`** (`store.ts:881`) or the two demo cafés become permanent prod rows.
- **Phase 0.5 (new) — prelim venue announcement, name-only.** No dependency on Phase 0 — ships immediately.
- **Phase 1 — ownership, lifecycle, admin CRUD** (unchanged).
- **Phase 1.5 (new) — link prelim venues to gamenet rows.**
- **Phase 2 — profile v2** (unchanged). Enriches Phase 1.5's display for free.
- **Phase 3 — gamenet competitions as declared containers** (unchanged). No bracket engine, zero ranking impact — ships before points so real data exists to calibrate against.
- **Phase 3.5 (new) — gamenet ranking points.** `gamenetPointsOf()` + `nationalPointsOf()` consolidation + the «امتیاز گیم‌نتی» line. Hard-depends on Phase 3.
- **Phase 4 — quota bridge, `prelim` stage, free-granted seats only** (unchanged). Zero lines changed in `bracket.ts`. Pilot with 2–3 gamenets, one discipline, one live competition.
- **Phase 4.5 (new) — purchased seat top-ups.** `app_gamenet_payments` + blob table, owner upload, admin settle. Grant path untouched.
- **Phase 5 — `final` stage grants** (unchanged). Only after Phase 4 has run through a real competition.
- **Phase 6 — demand-driven.** `bracket-core.ts` extraction, in-app venue brackets, feeder-eligibility as a paid entitlement, booking/reservations, map/geo discovery.

Dependencies: Phase 0.5 depends on nothing. Phase 1.5 hard-depends on Phase 0. Phase 2 hard-depends on Phase 0. Phase 3 depends on Phase 0+1. Phase 3.5 hard-depends on Phase 3 **and founder curve/cap numbers (§8 new Q8)**. Phase 4 hard-depends on Phase 3+1. Phase 4.5 hard-depends on Phase 4 **and founder gamenet pricing (§8 new Q9)**. Phase 5 hard-depends on Phase 4. Nothing depends on Phase 6.

## §7 — Risk table updates

| # | Risk | Stance |
|---|---|---|
| 3 (revised) | **Ranking pollution from café wins** | No longer structurally impossible — bounded and reversible instead. Points reach the ladder only via `gamenetPointsOf()` (§1.5), never `app_placements`/`app_events`/`pointsForPlacement()`/a new tier — so `honorsFor()`, `titleCounts()`, `playerCard()`, `allEvents()`, `pendingRegistrations()`, the paid queue and the assistant snapshot stay structurally blind. Four dampers: verified-gate (retroactive, derived), short capped curve, participant-scaled ceiling, per-player-per-window cap. Residual risk is inflation, not corruption — recalibration is a two-constant edit, no backfill. Displayed as a separate «امتیاز گیم‌نتی» line. |
| 13 (new) | **Points-formula drift across five call sites** | Hand-duplicated at 5 files, one of which (`assistant/route.ts:86`) already omits the placement term. Mandatory mitigation: consolidate into `nationalPointsOf(u)` in the same change as Phase 3.5 — required review item on that diff. |
| 14 (new) | **Purchased quota buying leniency** | Paid seats run the identical review as granted seats — same proof/roster/`minParticipants` bar, payment never shortcuts verification. `seat_source` frozen at grant time. Settlement inherits `reg-approve`'s lock-on-draw 409. No in-app refunds. |

## §8 — Open questions, trimmed and extended

*Answered and removed: gamenet points (→ §1.5), free vs purchased quota (→ §2.7), ownership (→ §3.5 confirmed), prelim-at-gamenet meaning (→ §1.6).*

Carried over unchanged: seat allocation policy (fixed/laddered/negotiated), whether gamenet seats count against the 6-سهم cap, whether two gamenets may feed the same player, whether a gamenet may charge in-app entry fees, whether gamenet competitions are publicly discoverable, whether auto-creating phone-only accounts for owner-supplied numbers is acceptable, and — sharpened by Answer 2 — whether feeder-*eligibility itself* should be a paid B2B tier.

**New, surfaced by this revision:**
1. **The gamenet points curve and cap** — numbers only the founder can set (§1.5 fixes the shape, not the numbers). Recommend deciding *after* Phase 3 produces real data.
2. **Gamenet seat pricing** — per-seat or bundle; blocks Phase 4.5.
3. **Is the assigned prelim venue a suggestion or a requirement?** Implemented as a pure label (§1.6.4) — enforcing physical attendance is a different, larger feature.
4. **What happens to gamenet points when a gamenet is later un-verified/de-listed?** Derived design removes them retroactively on next render — clean technically, visible to players as points disappearing. Acceptable, or does it need grandfathering?
5. **Can one player farm gamenet points across multiple venues** — same discipline/window, several gamenets? The per-player cap bounds the total; should there also be a per-venue-per-player limit?
6. **When a gamenet pays for a seat, does the player still owe the ticket price?** Phase 4 mints `freeAttempts = attempts` (owes nothing) — consistent if the gamenet paid in full; if it's only a discount, `paidAttempts` semantics get involved, and refund-on-cancellation needs an answer.

---

## Original plan (context and full reasoning — Revision A above takes precedence on conflicts)

Grounding note: the checkout matching all line numbers below is `~/gameland-work`. The stale
checkouts at `~/Projehacts/gameland` and `~/gameland` are behind it (no referral, no
`paidAttempts`, no admin hubs) — do not cross-reference line numbers against those.

---

## 0. Facts verified in the code before planning

| Fact | Evidence |
|---|---|
| `app_matches.comp_id` has a hard FK to `app_events(id)` | `web/lib/db/init.sql:123` |
| So do `app_registrations.comp_id` and `app_placements.comp_id` | `init.sql:108`, `:146` |
| Free/unpaid-but-approved tickets are already first-class | `Registration.freeAttempts`, `unpaidAttempts()` at `store.ts:1240`, consumed in `app/api/register/route.ts:40` |
| The final bracket is assembled from exactly one function's output | `computeQualifiers()` → `assembleFinal()`, `lib/bracket.ts:203`, `:227` |
| Per-event tournament knobs already live in a JSON blob on the event row, hydrated at boot | `EventConfig` (`store.ts:1121`), `persist.event.setConfig`, `loadEventConfig` (`store.ts:88`) |
| `finalize` rejects any player without an approved registration | `app/api/admin/finalize/route.ts` |
| National points join `placements` → `event.tier` | `pointsForPlacement()` used in leaderboard/home/me/players pages |
| `notif_type` and `user_role` are pgEnums — adding values is a sticky `ALTER TYPE`, unlike tables/columns | `schema.ts:20-22` |
| Two gamenet store functions are written but dead | `gamenetsForOwner()`, `gamenetsByCity()` — `store.ts:867`, `:871` |

**Correction to the founder's brief:** "max 3 seeds per player in the final" is not what the code
does. `computeQualifiers()` dedupes per user (`seen` Set, `bracket.ts:207`), so each player gets
exactly **one** final seat regardless of prelim wins. The 3-seed cap only lives in
`recordPrelimOutcome()` (`store.ts:723`), which no live route calls. Don't promise gamenets
"3 seeds per player," and don't "fix" the dedupe as a side effect of this feature.

**Trap created by the persistence fix:** `seedGamenets()` at `store.ts:881` creates two demo
gamenets on module load. Once gamenets get a write-through, those become permanent production
rows unless the IIFE is deleted in the same change.

---

## 1. Conceptual model — what a gamenet-hosted competition IS

### 1.1 The two candidate shapes

**Reuse `app_events` with `hostedByGamenetId` + `scope: 'gamenet'|'platform'`.** Rejected. Every
existing read is inclusive-by-default (`allEvents()`, `pendingRegistrations()`, the leaderboard
loop, the AI assistant's live snapshot) — a scope flag means ~12 call sites must each remember a
filter forever, in an app with no test suite. The failure mode isn't cosmetic: a forgotten filter
puts a café tournament on the national leaderboard, or fills the paid-registration queue with café
walk-ins. `tier` would also have to carry the gamenet/platform distinction — and `tier` is exactly
what multiplies ranking points. That coupling is the single most dangerous overload available.

**A fully separate entity family with its own copy of the engine.** Solves isolation, creates the
founder's other fear in code form: two bracket implementations that drift.

### 1.2 Recommendation — separate tables, shared algorithms (later), one narrow bridge

> A `GamenetEvent` is a venue-scoped competition record owned by a gamenet, in its own table family,
> that produces exactly one thing the platform consumes: a ranked, admin-verified list of players.
> It is never an `app_events` row.

Reasons, in order of force:
1. **Structural safety beats disciplined filtering.** If gamenet events aren't `app_events` rows, a
   gamenet result *cannot* reach `app_placements`, the leaderboard, `allEvents()`, or
   `pendingRegistrations()` — not because someone remembered a `WHERE`, but because the FK doesn't
   exist. Given a live app with real money and no tests, unforgettable protection beats DRY.
2. **The FK settles it anyway.** Reusing `app_matches` for a gamenet bracket means dropping
   `app_matches.comp_id → app_events(id)` — not a trade worth making for a café feature.
3. **Drift is avoidable without shared tables** — see §1.4.

### 1.3 The entity family

```
Gamenet            (existing app_gamenets, extended — §3)
 ├── GamenetPhoto      app_gamenet_photos      blob rows, ids-only in RAM
 ├── GamenetEvent        app_gamenet_events        le_*  — one venue competition
 │    ├── GamenetEntry   app_gamenet_entries       participants (user-linked OR guest)
 │    └── GamenetResult  app_gamenet_results       ranked finishers + proof ref
 └── GamenetSeed       app_gamenet_seeds       THE BRIDGE + audit spine (§2)
```

`GamenetEvent`: `id, gamenetId, discId? (ref app_disciplines, required to feed quota), title, heldOn,
format, status: draft|announced|running|reported|verified|rejected, rejectReason, feedsCompId?,
participantCount, note, createdAt`.

`GamenetEntry`: `id, gamenetEventId, userId?, guestName?, guestPhone?, createdAt` — the `userId?`/guest
split is what makes this usable at a real café: owner types names/phones, system links to an
existing account by phone when one exists.

`GamenetResult`: `id, gamenetEventId, entryId, rank, createdAt`. Deliberately separate from
`app_placements` — same shape, different table, zero ranking impact.

### 1.4 Sharing the engine without sharing tables

Do not refactor `lib/bracket.ts` in Phases 1–5 — it's the most load-bearing file in the app. If/when
gamenets want in-app bracket tooling (Phase 6), extract the *pure* parts (`shuffle`/`seedFrom`, the
tree-shape math in `buildTree()`, `resolveByes()`, `rankBracket()`'s loser-ordering) into
`lib/bracket-core.ts` as functions over plain arrays with an injected adapter. `bracket.ts` stays
the platform-flavoured caller; a new `gamenet-bracket.ts` becomes the venue-flavoured one. Until then,
gamenet events need no bracket at all (Phase 3).

---

## 2. The feeder / quota bridge — the crux

### 2.1 Design principles

1. Opt-in per (platform event × gamenet) — default zero, no implicit eligibility from `verified`.
2. Every seat is a row: who granted it, when, from which gamenet event, at which gamenet rank, which
   registration it produced.
3. The existing flow is extended at exactly two additive points — the tail of
   `computeQualifiers()` and one filter in the draw route. `setBracketQualify`, `assembleFinal`,
   `setFinalSeeding`, `generatePrelims`, `resolveByes`, `rankBracket` stay untouched.
4. The lock-on-draw invariant is reused verbatim: no seat can be granted/revoked once
   `matchesForComp(compId).length > 0`.

### 2.2 Where the permission lives — `EventConfig`, not a new table

Add one optional key to the existing per-event JSON blob (`store.ts:1121`, already the home of
`groupMode`/`qualify`/`finalSeeding`/`prizeSplit`):

```ts
gamenetQuota?: Record<gamenetId, {
  seats: number                      // hard cap of seats this gamenet may fill
  stage: 'prelim' | 'final'          // admission depth — §2.4
  minParticipants?: number           // credibility bar for their gamenet event
  note?: string                      // why this gamenet, for the audit trail
}>
```

Zero DDL on `app_events`, zero self-heal risk, reuses working read/write machinery, sits
semantically next to `qualify` (also an admin manually allocating advancement slots). New route
`app/api/admin/gamenet-quota/route.ts`, near-copy of `app/api/admin/qualify/route.ts`.

### 2.3 Where the audit lives — `app_gamenet_seeds`

```
app_gamenet_seeds
  id             TEXT PK              gs_*
  comp_id        TEXT NOT NULL        → app_events(id) ON DELETE CASCADE
  gamenet_id     TEXT NOT NULL        → app_gamenets(id) ON DELETE CASCADE
  gamenet_event_id TEXT                 → app_gamenet_events(id) ON DELETE SET NULL
  user_id        TEXT                 → app_users(id) ON DELETE SET NULL  (null until claimed)
  gamenet_rank     INTEGER NOT NULL     their placing at the gamenet's event (1 = winner)
  entry_stage    TEXT NOT NULL        'prelim' | 'final' — copied from config AT GRANT TIME
  status         TEXT NOT NULL        'pending' | 'granted' | 'rejected' | 'revoked'
  reject_reason  TEXT
  reg_id         TEXT                 the registration this seat minted
  decided_by     TEXT                 admin user id
  decided_at     TIMESTAMPTZ
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
```

Small table, hydrate fully. `entry_stage` is copied at grant time (not read live from config) so
a later config edit can never retroactively reinterpret seats already in a drawn bracket.

Plus two nullable columns on `Registration`, landed exactly like `free_attempts`/`reject_reason`:
`app_registrations.source TEXT` (`null | 'gamenet'`), `app_registrations.source_gamenet_id TEXT`.

### 2.4 The grant mechanism — two admission depths

**`stage: 'prelim'` (default; the only mode at launch).** On approval, the seat mints an approved
registration exactly as if the player had bought and paid:
- `attempts = 1` (or granted count, still bound by the 6-cap)
- `status = 'approved'`, `freeAttempts = attempts` → `unpaidAttempts()` returns 0, pay page shows
  nothing owed. **Reuses the referral-free-ticket semantics that already ship.**
- `source = 'gamenet'`, `sourceGamenetId = …`, notif via existing `'registration'` type.

From there, **nothing in the engine changes** — the player is an approved registration like any
other; `generatePrelims()`, `finalize`, everything just works. Zero lines changed in `bracket.ts`.

**`stage: 'final'` (Phase 5, later).** The gamenet's gamenet event *replaces* the prelim. One
additive tail on `computeQualifiers()`:

```ts
// lib/bracket.ts → computeQualifiers(compId), after the existing per-group/per-bracket loop:
for (const s of grantedGamenetSeeds(compId, 'final')) {
  if (!s.userId || seen.has(s.userId)) continue
  seen.add(s.userId)
  out.push({ userId: s.userId, groupKey: `gamenet:${s.gamenetId}`, bracket: 0, rank: s.gamenetRank })
}
```

Why this composes: `assembleFinal()` needs no edit (consumes `computeQualifiers()` output);
`finalSeeding` override still works (membership set built from the same output); `finalSize` cap
still applies; `prelimGroupKeys()` derives from matches, and external seats have no matches, so no
phantom bracket row appears in the qualify stepper; `qualifierCount` on `/admin/events/[id]`
already calls `computeQualifiers()`, so the admin sees gamenet seats in the pre-assembly count for
free.

**Required exclusion:** a `final`-stage grant also holds an approved registration (or `finalize`
rejects the eventual champion), so without a filter it would *also* get pulled into prelim seating.
Fix at the call site, not the engine:

```ts
// app/api/admin/draw/route.ts
const regs = approvedRegistrationsForComp(compId)
  .filter(r => !(r.source === 'gamenet' && seedStageFor(r.id) === 'final'))
```

### 2.5 Resolving a fed player to an account

Café players often have no account. Reuse `getOrCreateOtpUser()` (`store.ts:377`) — resolve by
`@tag`, then phone, then hold the seat `pending`/`user_id=null` and SMS an invite (Kavenegar). Seat
auto-claims on first OTP login; `profileCompletion()` still gates the draw like every other player.
Consent dimension (owner supplying a third party's phone) is an open question — §8.9.

### 2.6 End-to-end trace

```
ADMIN   /admin/events/[id] → «۴ · سهمیهٔ گیم‌نت‌ها» → add گیم‌نت پارادایس, seats 5, stage prelim
        → POST /api/admin/gamenet-quota → EventConfig.gamenetQuota (no new column)

OWNER   /gamenet → sees «تا ۵ بازیکن به FC26 جام زمستان بفرست»
        → creates GamenetEvent → adds entries → runs it at the venue
        → reports top 5 + photo of the final → app_gamenet_seeds × 5, status=pending

ADMIN   /admin/gamenets?tab=quota → review sheet: proof photo, participant count, five names,
        flags → approve / reject+reason

SYSTEM  per approved seat: resolve/mint user → mint approved registration (attempts 1,
        freeAttempts 1, source 'gamenet') → seed.status='granted', reg_id + decided_by/at
        recorded → notif to player + owner

DRAW    unchanged: generatePrelims() over approvedRegistrationsForComp()
BRACKET public bracket chips show «سهمیهٔ گیم‌نت پارادایس»
FINAL   unchanged. finalize() accepts them — they hold approved registrations.
```

---

## 3. Gamenet profile v2 — data model

### 3.1 Photos → dedicated blob table, ids-only in RAM

`app_gamenet_photos (id, gamenet_id, data_url, sort, created_at)`, served by
`app/api/gamenet-photo/[id]/route.ts` (copy of `news-image/[id]/route.ts`). Follow the
**avatars/receipts** pattern (hydrate ids only), **not** news (loads full `imageData` into RAM —
fine for dozens of items, not for hundreds of gamenets × up to 6 photos × ~200KB ≈ 240MB on a
single instance). Client-side compression: reuse `compress()` from `admin/news/client.tsx`
(max width 1280, JPEG q0.82) + the `MAX_IMG` server guard from `admin/news` route. Cap 6 photos.
Add a 640px/q0.70 cover derivative (`sort=-1`) so `/gamenets` list doesn't pull full-size images.

### 3.2 Setup (consoles/stations/capacity) → one JSON column + denormalized total

```
app_gamenets.setup      TEXT     -- JSON: { items: [{ kind, count, note? }] }
app_gamenets.capacity   INTEGER
app_gamenets.open_hours TEXT
app_gamenets.stations   INTEGER  -- KEEP, now derived = sum(items[].count)
```

`kind` catalog: `ps5 | ps4 | pc | xbox | vr | racing_sim | pool | board`. JSON because `setup` is
always read whole with the profile, same reasoning as `EventConfig`. Keeping `stations` as a
written-through derived total means `/gamenets` needs **no change** — non-breaking migration.

### 3.3 Features → curated chip catalog + one freeform note

```
app_gamenets.features TEXT NOT NULL DEFAULT ''  -- CSV of catalog keys
app_gamenets.notes    TEXT                       -- freeform, 240 chars
```

Catalog in `lib/gamenet-features.ts`: `cafe, counter, shop, vip_room, tournament_room,
streaming_setup, parking, ac, wifi, women_hours, late_night` — same shape as `DISC` in
`mock-data.ts`. Pure freeform is unfilterable; pure enum kills the long tail. Chips give filterable
facets; the note absorbs the rest.

### 3.4 Games → two layers, only one load-bearing

```
app_gamenet_games (gamenet_id, disc_id)   -- refs app_disciplines; drives eligibility
app_gamenets.titles TEXT                   -- CSV of free-text game titles, marketing only
```

**Feeder eligibility and prelim-hosting may only ever depend on `disc_id` refs, never on free
text.** Marketing catalog (COD, Minecraft, etc.) is broader than the 5 tournament disciplines and
will always be messy — keeping it cosmetic-only prevents any logic from accidentally string-
matching on it. Replaces the flat `disciplines` CSV read today by `gamenets/[id]/page.tsx` and
`gamenets/page.tsx` — keep that column written in parallel until nothing reads it.

### 3.5 Lifecycle & ownership — no enum changes

```
app_gamenets.status        TEXT NOT NULL DEFAULT 'pending'  -- pending|verified|rejected
app_gamenets.reject_reason TEXT
app_gamenets.verified      BOOLEAN   -- KEEP, derived = (status='verified')
app_gamenets.map_url       TEXT      -- Neshan/Balad link (Google Maps blocked in Iran)
app_gamenets.lat / .lng              -- optional, for a later map
```

Replace the bare boolean with the pending/verified/rejected+reason pattern registrations already
use, so the owner dashboard can show *why* it was rejected.

**Do not add a `gamenet` value to the `user_role` pgEnum.** Ownership is already expressible via
`ownerId` + the dead `gamenetsForOwner()` — this feature finally gives it a purpose. Permission =
"does this session own a verified gamenet," derived per request. No `ALTER TYPE`, no auth refactor.

---

## 4. Admin workflow

### 4.1 Split by kind of decision

- **Who may feed and how much → on the platform event page.** New «۴ · سهمیهٔ گیم‌نت‌ها» section in
  `app/admin/events/[id]/tournament-panel.tsx`, sibling to the existing «۳ · فینال», reusing its
  `Section`/`Stepper` primitives. It's a tournament-shape decision, same family as per-bracket
  qualify counts.
- **Review of submitted results → the gamenets hub, not the tournament page.** Turn
  `/admin/gamenets` into a `HubTabs` page: «گیم‌نت‌ها» (list + filter + edit + delete — none exist
  today) · «درخواست‌ها» (pending profile submissions/edits) · «مسابقات گیم‌نتی» · «سهمیه‌ها» (seed
  ledger + review queue). Result review is recurring relationship work at gamenet volume — folding
  it into the tournament page would turn a config screen into a review console. The event page
  instead shows a read-only stat linking into the ledger filtered by that event.

### 4.2 Reuse the review-sheet pattern exactly

Copy `app/admin/requests/request-list.tsx`: cards carry no action buttons, tap opens a portalled
bottom sheet, reject requires a reason (preset chips or free text), reason surfaces to the
submitter. CLAUDE.md explicitly warns against adding action buttons back to cards. Preset reasons
for seeds: «مدرک برگزاری ناکافی», «تعداد شرکت‌کننده کمتر از حد لازم», «بازیکنِ تکراری در دورهای
قبل», «هویت بازیکن تأیید نشد».

### 4.3 Admin hub tile + notifications

`/admin` گیم‌نت‌ها tile badge = pending profile submissions + pending seed submissions (existing
badge mechanism). Notifications reuse existing enum values — do not add `'gamenet'` to
`notif_type`: seat granted/rejected → `'registration'`, gamenet event verified → `'announcement'`,
qualified via gamenet → `'advance'`.

---

## 5. Gamenet-owner-facing UI

Entry point `/gamenet` — owns one gamenet → land in it; owns several → picker; owns none → the
existing `/gamenets/new` form. Linked from `/me` and from a "این گیم‌نتِ منه" CTA on the public
profile.

1. **Status banner** — pending / verified / rejected-with-reason, same grammar as a gamer's
   rejected-registration banner.
2. **پروفایل** — photos, setup builder, capacity, hours, feature chips, discipline chips + free
   titles, address + map link. Name/address/city edits re-enter review; photos/hours/features
   apply immediately (otherwise admin becomes a bottleneck on trivial edits).
3. **مسابقات گیم‌نتی من** — create (≤5 fields), manage roster (name+phone, autocomplete against
   existing users), report results (tap top-N from the already-entered roster), attach proof
   photo. **No bracket required to report a result** — the single most important frictionlessness
   decision in the plan.
4. **سهمیه‌های من** — "you may send N players to X" per eligible event, seats used/remaining, each
   submitted seat's status + rejection reason.
5. **آمار** — profile views (existing `app_track_events` pipeline), players sent, players who
   reached the final. Cheapest available anti-fraud incentive: a gamenet that pads results gets
   nothing to brag about.

UI constraints from CLAUDE.md, non-negotiable: portal every modal to `document.body`; sticky
headers use `env(safe-area-inset-top)`; `vh` not `dvh`; lists newest-first; self-hosted fonts; no
CDN.

---

## 6. Phased rollout

Risk rises monotonically toward `bracket.ts`; value is front-loaded.

- **Phase 0 — persistence + de-seeding** (already separately planned). Wire `app_gamenets` into
  self-heal + `persist`. **In the same change: delete `seedGamenets()`** or the two demo cafés
  become permanent prod rows. Everything below blocks on this.
- **Phase 1 — ownership, lifecycle, admin CRUD.** Status/rejectReason, admin edit/delete/filters,
  the review sheet, `gamenetsForOwner()` adopted, `/gamenet` console shell. Highest value per unit
  of risk — it's the trust substrate every later phase assumes, and touches nothing
  tournament-shaped.
- **Phase 2 — profile v2.** Photos, setup JSON, capacity/hours, features, discipline refs + free
  titles, map link. Zero coupling to the engine; delivers "we want their data" as its own founder
  goal.
- **Phase 3 — gamenet competitions as declared containers.** `GamenetEvent`/`Entry`/`Result` + proof
  blobs, owner create/manage/report, admin verify/reject. **No bracket engine.** No platform
  integration, no ranking impact — fully reversible, and lets the founder observe real gamenet
  behavior before anything touches a live tournament.
- **Phase 4 — the quota bridge, `prelim` stage only.** `EventConfig.gamenetQuota`,
  `app_gamenet_seeds`, the grant path, the ledger. **Zero lines changed in `bracket.ts`.** Pilot
  with 2–3 gamenets on one discipline of one live competition.
- **Phase 5 — `final` stage grants.** The `computeQualifiers()` tail + draw-route exclusion. Ship
  only after Phase 4 has run through a real competition — this is the only phase touching the
  engine.
- **Phase 6 — demand-driven.** `bracket-core.ts` extraction + in-app venue brackets,
  booking/reservations, paid B2B tiers, map/geo discovery. Build only what pilots ask for.

Dependencies: Phase 2 hard-depends on Phase 0 (durable rows for photos), soft-depends on Phase 1.
Phase 4 hard-depends on Phase 3 (nothing to feed from) and Phase 1 (only verified gamenets
eligible). Phase 5 hard-depends on Phase 4. Nothing depends on Phase 6.

---

## 7. Risks and design stance

| # | Risk | Stance |
|---|---|---|
| 1 | Quota fraud — fake gamenet event, seats to friends | Opt-in per (event×gamenet), explicit cap, default zero. Proof photo + roster required. `minParticipants` bar. Seats reviewed one by one, never bulk. |
| 2 | Owner self-dealing | Phone-verified accounts only; flag seats matching owner's phone or repeat top-N finishers across events (same idiom as AI-monitor anomaly flags). Flags inform, don't auto-reject. |
| 3 | Ranking pollution from café wins | Structural: `GamenetResult` has no FK to `app_events`, so `pointsForPlacement()` can never see it. Whether gamenet wins should ever earn points is §8.1. |
| 4 | Drift between gamenet/platform code paths | No bracket engine at all in Phases 3–5 — nothing to drift. If Phase 6 happens, share pure functions via `bracket-core.ts`, never a second `resolveByes()`. |
| 5 | Admin review workload | Review per gamenet-event batch (top-N inline), not per match. Eligibility is scarce by construction — admin opts in per gamenet per event, capping inbound volume. Preset reject reasons keep decisions to two taps. |
| 6 | Double-seating (final-stage player also drawn into prelims) | Explicit filter in `draw/route.ts` + existing `seen` dedupe in `computeQualifiers()`. Required review item on the Phase 5 diff. |
| 7 | Post-draw mutation | Reuse the lock invariant verbatim (`matchesForComp(compId).length > 0`). `entry_stage` frozen at grant time. |
| 8 | Memory blowup from photos | Ids-only hydration, on-demand serving + cache headers, 6-photo cap, client compression, separate cover derivative. (Precedent: the 7.4MB/12s home-page incident in CLAUDE.md.) |
| 9 | Identity/consent — owner enters a third party's phone | Seat stays pending/unclaimed until the player's own OTP login claims it. Platform never treats an owner-supplied phone as consent. Policy dimension — §8.9. |
| 10 | Fed players who never show, having paid nothing | Cap free seats as a field share; require a participation-confirm tap; admin can revoke pre-draw; track no-show rate per gamenet to inform future eligibility. |
| 11 | Scope creep into booking/payments | Explicitly out of scope through Phase 5 — gamenet entry money stays outside the app. Reopening pulls in the legal/gambling analysis in `docs/11-risks.md`. |
| 12 | Stale checkout rolling prod back | Not feature-specific but the highest-probability incident historically (CLAUDE.md §1) — `git fetch` + confirm not behind `origin/mvp` before every deploy, push after. |

---

## 8. Open questions for the founder

1. Do gamenet results ever earn national ranking points? Plan says no, structurally. If
   yes, gamenet events may need to become `app_events` rows after all — reversing §1.2.
2. Money direction on quota — "گاها بیاد یه سری سهمیه به ما عرضه کنه" reads as the gamenet
   supplying/selling quota; "سهمیه رایگان" reads as the platform granting it free. Two products, or
   one? If purchased, who pays whom, and does the player still owe a receipt?
3. Seat allocation policy — fixed per gamenet, laddered by gamenet participant count, or negotiated
   per event? Plan implements admin-set-per-event; a ladder is easy to add if the rule is stated.
4. Do gamenet seats count against the 6-سهم-per-discipline cap?
5. May two gamenets feed the same player into the same event? Current dedupe keeps one seat — is
   that the desired rule, or should the second submission be loudly rejected?
6. Who may own a gamenet — any authed user (today), or does verification require national ID /
   business licence / a signed agreement? Determines how strict Phase 1's review is.
7. May a gamenet charge an entry fee for a gamenet competition inside the app? Assumed no (cash
   out-of-app) — yes pulls in payments + `docs/11-risks.md`'s legal framing.
8. Are gamenet competitions publicly discoverable in-app ("tournaments near me"), or private to the
   venue and its own audience?
9. Is auto-creating a phone-only account for an owner-supplied player phone acceptable, or must the
   player self-register before a seat can be reserved for them?
10. Does "مسابقات مقدماتی توی اون شهر و اون گیم‌نت اتفاق میفته" mean (a) gamenets feed qualifiers
    into our prelims/final — this plan's Phase 4/5 — or (b) our own prelim brackets get physically
    hosted at a named gamenet, a smaller, different feature (a venue label on prelim brackets + a
    venue field on `EventConfig`, ~a day of work, could ship in Phase 1)? Often both are wanted.
11. Is feeder eligibility a paid B2B benefit (per `docs/10-business-model.md` R3 — gamenet
    subscription tiers) or free for all verified gamenets? Decides whether `gamenetQuota` needs an
    entitlement concept later.

---

### Critical files for implementation

- `web/lib/store.ts` — `EventConfig.gamenetQuota`, `Gamenet` v2 + new gamenet-event/seed entity
  families, `Registration.source`, delete `seedGamenets()`
- `web/lib/db/persistence.ts` — self-heal DDL for all new tables/columns, hydration loaders
  (ids-only for photo blobs), new `persist.gamenet*` namespaces
- `web/lib/bracket.ts` — Phase 5 only: the additive tail of `computeQualifiers()`; everything else
  stays byte-identical
- `web/app/admin/events/[id]/tournament-panel.tsx` — the «سهمیهٔ گیم‌نت‌ها» config section
- `web/app/api/admin/draw/route.ts` — the `final`-stage exclusion filter
- `web/app/admin/requests/request-list.tsx` — the review-sheet pattern to copy for every new
  approve/reject surface
