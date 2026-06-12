# 08 — PRD (v1)

**Stage:** Plan · **Status:** ✅ v1 (built on Idea phase). Engineering-oriented; **no code until [09 Phase 0](09-roadmap.md) legal gate passes.**

## Problem
Iran's competitive gaming community (mostly **offline**, ~70%) has no digital home: wins don't persist, there's no trusted national ranking, competitions are coordinated chaotically over WhatsApp/Telegram, and the gamenets that host offline play are an unorganized, invisible layer. Existing players (Marcoverse, OxinGame, Marcocial) solve fragments — none own cross-game identity + ranking + the gamenet network, and online stake-to-prize models risk the gambling line.

## Target users
[Personas](06-personas.md): Competitor (P1), Rising player (P2), Organizer (P3), Gamenet owner (P4), Fan (P5).

## Goals & success metrics
- **North Star:** monthly **active competitors** (players who appear in ≥1 ranked competition / 90 days).
- Supporting: # ranked competitions run · # players with a populated honors profile · # partner gamenets · notification-driven reduction in "repeat questions" · ranking-trust (survey).
- Guardrail: **zero gambling-law exposure** (no entry-funded prize pools; sponsor-funded prizes only).

## Scope
**In (MVP, Phase 1):** Gamer Bank profiles · honors page · national ranking (organizer-entered offline results) · competition **info + notifications + calendar** · per-player bracket roadmap (read-only) · one flagship discipline (eFootball/EA FC).
**In (Phase 2+):** legally-reframed competition engine (skill-service entry, sponsor prizes) · multi-account integrity · gamenet directory + tools · store · AI bot · online ranking.
**Out (for now):** entry-funded cash prizes (illegal) · foreign-game-server dependency · iOS IAP · crypto.

## Epics & key stories (Gherkin-style)

**E1 — Gamer Bank**
- As a player, I can create a profile (city, contact, disciplines, play-style, nickname) so I'm discoverable.
- *Given* I've competed, *when* results are recorded, *then* my honors/record updates automatically.

**E2 — National Ranking**
- As the community, I can see a per-discipline leaderboard (top ranked + everyone listed) so "who's best" is trusted.
- *Given* an event of tier T, *when* it finishes, *then* placement points apply per the [ranking spec](#ranking-points-spec).

**E3 — Competition info & notifications**
- As a registrant, I receive (SMS-first) every detail: schedule, format, rules, my next match.
- *Given* a schedule change, *when* it's published, *then* all affected players are notified — no WhatsApp needed.

**E4 — Competition engine (Phase 2, post-legal)**
- As an organizer, I can run **6 preliminary brackets → final (128)** with player **attempts** (the "chances" model) **framed as a skill-service**, prizes **sponsor-funded**.
- As a player, I see my roadmap: where I am, who I face, wins-to-advance, my seeds toward the final.
- *Guardrail:* no player-to-player payment obligation; entry = service fee / coins ([11-R1/R2](11-risks.md)).

**E5 — Multi-account integrity**
- As an organizer, duplicate/multi-accounts are flagged at **registration** (phone/ID/gamenet vouching), since offline play has no kernel anti-cheat.

**E6 — Gamenet network (Phase 2)**
- As a gamenet owner, I get a profile + hosting tools + discovery; as a player, I find venues & events near me.

**E7 — Store & E8 — AI support bot** (Phase 3+).

## Ranking points spec (from brief)
- Major: 1st **1000**, 2nd **800**, 3rd **500**, … down to top-64/128.
- All-Star (smaller seasonal): 1st **500**, 2nd **300**, 3rd **150**, top-32 **30**.
- **Event-tier multiplier** (technical-quality/Gameland-run scaling, e.g. an 800-pt event).
- Offline ranking first; online/"ultimate" ranking deferred ~1 yr.

## Non-functional requirements
- **Offline-first / low-bandwidth** (4–4.8 Mbps, 136–146 ms): PWA, resilient sync, graceful degradation during blackouts.
- **SMS-first notifications** (don't depend on filtered IG/WhatsApp).
- **Iran-hosted** infra (sanctioned foreign cloud) — see [12](12-tech-approach.md).
- **Persian / RTL**, mobile-first; Android via Bazaar/Myket later.
- **Legal-by-design:** entry ≠ stake; prizes sponsor-funded; non-convertible coins.

## Open questions / assumptions to validate
1. **Legal opinion** on the reframed entry/prize model (gate). 2. Gameland's **actual community size** (interviews). 3. Flagship discipline confirm (eFootball vs FIFA vs PUBG). 4. Gamenet willingness-to-pay. 5. IRCG/IESA partnership feasibility.
