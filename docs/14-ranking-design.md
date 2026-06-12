# 14 — Ranking System Design (focus #1)

**Stage:** Plan (design spec — not code) · **Status:** ✅ v1. Design for Gameland's #1 priority: a **trusted, offline-first, per-discipline national ranking**.

## Design goals
1. **Trusted** — community accepts it as "who's actually best."
2. **Offline-first** — computed from **organizer-entered results**, no live online match feed needed.
3. **Rewards both** big-title wins *and* consistency.
4. **Multi-account resistant** (offline reality — identity at registration).
5. **Transparent** — players can see exactly how points were earned.

## Model choice — points accumulation (not Elo, for now)
- **Chosen: rolling points-per-placement** (like ATP Race / Smoothcomp per-federation lists). Fits offline + organizer-entered results; transparent; simple to trust.
- **Not Elo/Glicko now:** those need head-to-head online match streams + are opaque to a lay community. Reserve **Elo/Glicko for the Phase-4 "ultimate"/online ranking** ([09](09-roadmap.md)).
- Reference analogs (see [01-benchmark](01-benchmark.md)): Smoothcomp (per-federation points), Tornelo/Challonge (Elo — deferred), ATP/FIDE (points + rating).

## Points formula
```
player_points(discipline) = Σ over events in the ranking window of
                            points(placement) × tier_multiplier(event)
```

### Placement curve (base = Major)
| placement | points |
|---|---|
| 1st | 1000 |
| 2nd | 800 |
| 3rd | 500 |
| 4th | 400 |
| 5–8 | 250 |
| 9–16 | 150 |
| 17–32 | 80 |
| 33–64 | 40 |
| 65–128 | 20 |

*(matches the brief's anchors 1000/800/500; smooth decay to the 128-player final.)*

### Tier multipliers
| tier | multiplier | example (champion pts) |
|---|---|---|
| **S — Major** | ×1.0 | 1000 |
| **A — Gameland-run / technical** | ×0.8 | 800 *(brief's "800-pt event")* |
| **B — All-Star (seasonal)** | ×0.5 | 500 → 2nd 300, 3rd 150, top-32 30 *(matches brief)* |
| **C — Local / minor** | ×0.3 | 300 |

→ Gameland assigns tier by **scale + technical-execution quality** (brief: events Gameland runs technically rank higher). Tier criteria documented per season.

## Window, seasons & decay
- **Rolling 52-week ranking** = "current form" (old results age out → rewards continued play).
- **All-time honors** kept forever on the [profile](06-personas.md) honors page (titles never expire) — separate from the rolling rank.
- Optional **seasonal snapshots** (champions of each season) for prestige.

## Leaderboard rules (from brief)
- **Top ~10 featured** (photo, headline stats); **everyone else listed** (name, #games, points).
- Per-discipline boards; a player can appear on multiple.
- Player page: rank, points, honors, titles, play-style, match/competition history.

## Tie-breaks (in order)
1. more events played → 2. higher-tier best placement → 3. head-to-head (if known) → 4. most recent title.

## Multi-account integrity (offline)
- **One ranking identity per person, keyed on phone number** (the 2k-gamer DB has phones). 
- Duplicate phone/name flagged; **organizer/gamenet vouching** at registration; manual merge.
- No kernel anti-cheat (offline) → integrity is **identity-at-registration**, per [11-R11](11-risks.md).

## Anti-gaming
- **Minimum N events** to appear ranked (avoid one-event flukes).
- Cap contribution from **low-tier (C)** events (no farming).
- **No pay-for-points** — points only from placements; prizes sponsor-funded ([11](11-risks.md)).

## Bootstrapping from historical data
- Ingest the **~2,000-gamer DB + past-competition results** ([13-data-intake](13-data-intake.md)) → **backfill the launch ranking + honors** so day-1 isn't a cold start.
- Assign historical events a tier retroactively (best-effort) for initial points.

## Open knobs to confirm with founder (later)
- Exact decay window (52w vs season). · Min-events threshold. · Tier criteria thresholds. · Whether all-star top-32=30 should scale by participant count.
