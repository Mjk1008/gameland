# 19 — Real Event Model & Feature Spec (founder walkthrough, 2026-07-04)

**Stage:** Build · **Status:** 📝 spec for review · **Source:** founder voice walkthrough
**Supersedes the simplified model in** [`15-competition-engine`](15-competition-engine.md) / [`18-admin-panel-prd`](18-admin-panel-prd.md) where they conflict.

> This captures how Gameland tournaments *actually* run, so the admin panel and
> user flows build the right thing. Tags: **[EXISTS]** works today · **[GAP]** must build.

---

## 1. The real event model

An **event** (e.g. "FIFA 26 Championship") is **multi-stage and multi-location**:

- An event runs one or more **disciplines**.
- An event has **phases / periods (دوره)** — each phase has **its own date range and its own venue/city**.
- The signature structure (FIFA) is: **city preliminaries → central 128 final in Tehran**.

**Worked example (founder):**
- Overall event: **1–10 [month]**
- **Prelim phase:** 1–3, run **across provinces/cities** (each city its own venue).
- **Final phase:** 3–7, **128 players, Tehran**, one venue.

So an event is not a single bracket — it's: `Event → Phases(date+location) → City prelims → Brackets → Final(128)`.

### Why FIFA is the exception
They can't run a 1,000-person FIFA centrally in a few days, so FIFA **must** use city prelims that feed a central 128 final. Smaller disciplines (UFC, Tekken) may be single-stage. **FIFA-scale = multi-city prelim→final; others can be simpler.**

---

## 2. Disciplines (replaces current valorant/cs2/pubgm/fc catalog)

| id (proposed) | Label (fa) | Note |
|---|---|---|
| `fc26` | فیفا ۲۶ | flagship, uses full prelim→final |
| `pes21` | پ‌اِس ۲۱ | ⚠️ confirm exact name/version |
| `efootball` | ای‌فوتبال | |
| `ufc6` | یو‌اف‌سی ۶ | fighting |
| `tekken` | تی‌کی ۲۱ | ⚠️ confirm — "Tekken"? version? |

**[GAP]** current seed disciplines are FPS titles — must be replaced with the above.

---

## 3. Admin — event creation inputs

The create-event form must capture:

1. **Event name** — [EXISTS] title
2. **Overall date range** — [GAP] currently free-text `date`; need start/end
3. **Discipline(s)** — [EXISTS single] → [GAP] allow multiple per event
4. **Prize** (per event / per discipline?) — [EXISTS] single number
5. **Number of brackets** — [GAP] not captured (bracket engine hardcodes 6)
6. **Bracket seats / bracket size** — [GAP]
7. **Per-phase (period) date range + location** — [GAP] this is the big one: each phase (prelim, final) has its own dates + venue; prelims are **per city**
8. **Venue/location** — [GAP] not captured; **each discipline in each phase can be at a different place**
9. **Rules** — [GAP] **upload an `.md` file per event, or fall back to a default rules doc**
10. **FIFA exception handling** — prelim→final multi-city structure toggled when discipline needs it

**[EXISTS] already on the form:** tier (S/A/B/C for ranking), status, format text.

---

## 4. Admin — draw, brackets, live run

### 4.1 Draw (قرعه‌کشی) — must be hidden until revealed
- **[GAP]** Players must **not** see their bracket/opponent up front. Draw result is **private** until the admin **reveals/publishes** it.
- **[GAP]** Admin chooses **manual** draw or **automatic random** draw.
- **[EXISTS-partial]** random distribution exists (`lib/bracket.ts`) but not the hidden/reveal gate, not manual mode.

### 4.2 Ticket spreading rule (per prelim)
- A player buys **1–6 tickets**. **[EXISTS]** attempts 1–6.
- **[GAP]** In a **prelim**, a player's tickets must be **spread across different brackets** — two tickets of the same player never land in the same prelim bracket (they never face themselves in prelim). *(current draw spreads seats round-robin but doesn't enforce per-player no-collision.)*
- In the **final**, this exception does **not** apply — a player's tickets **can** meet.

### 4.3 Per-bracket advancement + green seats
- **[GAP]** Admin sets **how many advance from each bracket**.
- **[GAP]** When a bracket is shown, the **last N seats are highlighted green** (in the roadmap, if 8 advance, the final 8 seats are green) so everyone sees the advance line.

### 4.4 City advancement quota (prelim → 128 final)
- **[GAP]** Per city, the number advancing to the Tehran 128 is **proportional to turnout**.
  - Founder examples: Isfahan 100 players → **top 10**; Ahvaz 50 → **top 5** (≈10%).
  - ⚠️ **Decision:** fixed % (e.g. 10%) auto, or admin sets the quota per city/bracket?

### 4.5 Seed cap into the final
- **[GAP]** A player may hold **at most 3 seeds** in the 128 final (can appear up to 3× in the final bracket, from 3 different tickets). In prelim their tickets don't collide; in the final they can.

### 4.6 Live picking UI (projector / live event)
- **[GAP]** For live runs: from each bracket, a **dropdown of that bracket's players** to pick the winner.
- **[GAP]** After a pick, show **remaining players**; allow **remove/undo** a wrong pick.
- System advances the winner automatically. **[EXISTS-API]** `setMatchWinner` advances; **[GAP]** the live dropdown UI + undo.

---

## 5. The ticket / seed mechanic (precise restatement — the #1 asked question)

**What a ticket (سهم/بلیط) is:** a re-entry chance. New/nervous players get knocked out early; a ticket lets them try again in another bracket. Strong players buy more tickets to maximize getting their **full 3 seeds** into the final.

**Prelim day (per city):**
- Player's T tickets → placed in T **different** brackets.
- Each bracket is single-elim. Win your path to reach the bracket's **advance line** → that ticket becomes a **seed** to the 128 final.
- Lose in a bracket → that ticket is out; other tickets play on independently.
- Founder example (4 tickets): B1 lose game2 · B2 win 3+4 → advance · B3 win all → advance · B4 lose final → **2 of 4 tickets seeded** into Tehran.

**Final (128, Tehran):**
- Filled from city seeds (respecting per-city quota + **≤3 per player**).
- Single-elim to champion; a player's multiple seeds **may** meet.

**Ranking tie-in:** final placements feed `points_for_placement` × tier → leaderboard (already built, [`14`](14-ranking-design.md)).

---

## 6. User — profile (required complete before registration)

**[GAP]** current profile = name/tag/city/disc only. Required fields become:

1. **First name + last name** — [GAP] split (currently single `name`)
2. **Province + city** — [GAP] **cascading dropdown, full Iran provinces→cities dataset**
3. **Phone** (marked **has WhatsApp / Telegram**) — [EXISTS phone] + [GAP] messenger flag
4. **Disciplines played** (multi-select) — [GAP] (currently single primaryDisc)
5. **Nickname (اسم مستعار)** — [EXISTS] tag
6. **Gaming experience (years)** — [GAP]
7. **Team name** (optional) — [GAP]

Profile completion gate — **[EXISTS]** `userNeedsProfile` + `/welcome` (needs new fields wired).

---

## 7. User — registration flow

- Pick from **open events** — [EXISTS] open-event list.
- Choose **city** (which city prelim they join) — [GAP]
- Choose **which disciplines** of the event they enter — [GAP]
- Choose **ticket count 1–6** — [EXISTS] attempts picker.
- Free in V1 (sponsor-funded) — [EXISTS] just made free.

---

## 8. Home — promoter card

- **[GAP]** Per open event, a **promoter countdown card** showing:
  - **remaining capacity** (empty slots)
  - **countdown timer** to start.

---

## 9. What EXISTS vs GAP — summary

| Area | Exists | Gap |
|---|---|---|
| Event: name, tier, prize, status, single disc | ✓ | dates(range), multi-disc, brackets#, **phases(date+location)**, **rules.md upload** |
| Multi-city prelim → 128 final | — | **whole structure** |
| Draw | random spread | **hidden/reveal**, **manual mode**, **per-player no-collision** |
| Advance | — | **per-bracket count**, **green seats**, **city quota**, **≤3 seed cap** |
| Live run | winner API | **dropdown pick UI + undo** |
| Profile | name/tag/city/disc | **first/last**, **Iran province→city cascade**, **messenger flag**, **multi-disc**, **experience**, **team** |
| Registration | 1–6 tickets, free | **city select**, **discipline select** |
| Home | event cards | **promoter countdown + capacity card** |
| Ranking finish line | ✓ (built + verified) | (feeds from final placements) |

---

## 10. Open decisions (need founder input)

1. **First-event scope:** build the **full FIFA multi-city prelim→final** now, or launch first with a **single-stage smaller event** (e.g. UFC/Tekken, one venue) to validate, then add multi-city?
2. **City quota:** auto fixed % (≈10%) or **admin sets** advance count per city/bracket?
3. **Disciplines:** confirm exact names/versions — `pes21`? `tekken`(version)?
4. **Prize:** one number per event, or **per discipline / per phase**?
5. **Rules default:** ship a default `rules.md`, override by upload per event — confirm.

---

## 11. Proposed build order (after decisions)

1. **Profile v2** — split name, Iran province→city cascade, messenger flag, experience, team, multi-disc. *(unambiguous, needed for any registration; good first build)*
2. **Disciplines catalog** swap → football/fighting titles.
3. **Event model v2** — phases (date+location), brackets#, multi-disc, rules.md upload.
4. **Registration v2** — city + discipline + tickets.
5. **Draw v2** — hidden/reveal, manual|random, per-player no-collision, per-bracket advance + green seats.
6. **City quota + ≤3 seed cap + 128 final assembly.**
7. **Live picking UI** (dropdown + undo).
8. **Home promoter card.**
