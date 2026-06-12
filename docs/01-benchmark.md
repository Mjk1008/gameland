# 01 — Competitive Benchmark

**Stage:** Benchmark (complete). **Platforms:** 11, across 4 clusters.
**Method:** each platform scored on organizer/player dimensions + **6 probes derived directly from the Gameland brief.**

### The 6 probes
- **(a)** paid retries / buy-multiple-entry tickets per player
- **(b)** multiple preliminary brackets feeding one final
- **(c)** rich player **honors/achievements** profile page
- **(d)** multi-account / smurf detection
- **(e)** persistent **OFFLINE** ranking ladder
- **(f)** venue / gaming-café network or directory

Legend: ✓ yes · ~ partial · ✗ no

## Master matrix

| Platform | Cluster | a | b | c | d | e | f |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|
| **Marcocial** | Iran / event | ~ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Start.gg | Esports hosting | ~ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Toornament | Esports hosting | ✗ | ✓ | ~ | ✗ | ~ | ✗ |
| Battlefy | Esports hosting | ~ | ✓ | ✗ | ~ | ✗ | ✗ |
| Challonge | Esports hosting | ~ | ✓ | ✗ | ✗ | ~ | ✗ |
| FACEIT | Identity / ranking | ✓ | ~ | ~ | **✓** | ✗ | ✗ |
| Op.gg | Identity / ranking | ✗ | ✗ | ~ | ✗ | ✗ | ✗ |
| Liquipedia | Identity / ranking | ✗ | ✗ | **✓** | ✗ | ✗ | ✗ |
| **Smoothcomp** | Offline / federation | ✓ | ✓ | ✓ | ~ | **✓** | ✓ |
| Tornelo | Offline / federation | ~ | ✗ | ✓ | ~ | **✓** | ~ |
| Playbook365 | Offline / federation | ✗ | ✓ | ~ | ~ | ✗ | ~ |

## Cluster A — Iran / event (the direct reference)

**Marcocial** (Iran). Integrated event platform: 3 products — *Meet* (video), *Class* (LMS), *Stage* (events). Stage's **Tournament** module = 96+ bracket models, real-time scoring, seeding. Social proof: 6,949+ events, 100,451+ participants, 99.99% uptime. Workflow: registration (custom forms, flexible ticketing) → promotion (SEO pages) → QR check-in → live execution → instant settlement → analytics. Smart SMS/email notifications. Public organizer pages at `/p/{handle}`. Pricing: tiered + commission + instant settlement. Roadmap: *Agora* community spaces, API marketplace, AI discovery.
- **Identity:** thin organizer/participant profiles. **Ranking:** none persistent. **Gap for us:** no rich player identity, no cross-event ranking, no gamenet/store/bot. *(Live tournament UX inferred from marketing — not directly observed.)*

## Cluster B — Esports tournament hosting

**Start.gg** (USA). Grassroots/FGC standard. Single/double-elim, Swiss, RR, FFA, ladder, multi-phase progressions. Profiles = results history (no honors page). Rankings = curated community lists (SSBMRank) + in-event ladder points, **no native ELO**. 6% platform fee on registrations. Strong offline heritage (check-in, station mgmt). `a:~ b:✓ c:✗ d:✗ e:✗ f:✗`

**Toornament** (France). Pro/white-label, API-first, ~20k orgs. All standard formats + multi-stage. Per-tournament profiles; advanced stats only on Game-Studio plans. **Circuit plan = persistent cross-event points ladder** (paid). Free ≤32p; €19/tournament boost; subscription tiers; 0% fee at Community+. Follow orgs/games. `a:✗ b:✓ c:~ d:✗ e:~ f:✗`

**Battlefy** (Canada). For publishers/brands (Riot, EA, Nintendo) + grassroots. Single/double-elim, Swiss, RR. Thin profiles (avatar, XP, registration history). No persistent ranking. Free community; ~$99+/mo enterprise. **Battlefy Shield** = mandatory game-account verification (limits but doesn't fully stop multi-acct). `a:~ b:✓ c:✗ d:~ e:✗ f:✗`

**Challonge** (USA). Simple bracket generator, broad reach, 25+ formats. **Challonge Ratings = ELO** (start 1000), **persistent within a community** (not global). Free + Premier (~$7–12/mo); $0.75/checkout (waived for Premier). Communities hub, Discord bot, email alerts (no SMS/push). Check-in + station mgmt. `a:~ b:✓ c:✗ d:✗ e:~ f:✗`

## Cluster C — Player identity / ranking

**FACEIT** (UK; ESL FACEIT Group / Saudi PIF). Third-party ranked matchmaking + competitive identity (CS2 primary). **ELO ladder** L1–10 + Challenger (top-1000/region), seasonal resets. **Best-in-class anti-cheat / smurf detection**: kernel AC + AI behavior + hardware fingerprint + video verification; banned 392k+ in 12 mo; multi-acct → permanent ban. Stats-rich profiles but **no bio/honors narrative**. Freemium ($6/mo Premium; per-event tournament tickets). Fully online. `a:✓ b:~ c:~ d:✓ e:✗ f:✗`

**Op.gg** (South Korea). Read-only stat aggregator (pulls game APIs). Rank/champion stats, match history, POG awards; esports pro profiles. **No own ranking** (mirrors official), **no enforcement**. TalkG community app (1.5M MAU), Duo/Clan finder. Freemium ($3/mo ad-free). Game-start push alerts. `a:✗ b:✗ c:~ d:✗ e:✗ f:✗`

**Liquipedia** (Team Liquid). Community-edited esports **encyclopedia** (60+ games). **Deepest identity of all** — but editorial & pros-only: legal name, aliases, nationality, team timeline, roles, **achievements table, awards, records, career earnings, annual rankings, gear/settings, media, trivia.** No ranking system of its own, no enforcement, no accounts/notifications. Free + programmatic ads. `a:✗ b:✗ c:✓ (richest) d:✗ e:✗ f:✗`

## Cluster D — Offline / federation analogs (most relevant structurally)

**Smoothcomp** (Sweden; combat sports — BJJ/grappling/kickboxing). End-to-end **offline** tournament platform. Formats incl. **multi-stage pool→bracket**, weight/belt/age divisions, auto-seeding with club separation. **On-site:** QR check-in (Smoothcomp ID), digital weigh-in, mat scheduling, **scoreboard desktop app (operator + spectator TV)**, public live brackets, email+SMS. Profiles: nationality, age, belt, academy, W/L, full history, **medal counts**, ranking points. **Persistent per-federation points ranking ladder.** **Federation platform** links multiple organizers + club/academy profiles. **Per-athlete credit** economics (~0.6–1.25 €/athlete). `a:✓ b:✓ c:✓ d:~ e:✓(per-fed) f:✓(fed+club)`

**Tornelo** (Australia; chess, FIDE-endorsed). Online + over-the-board. Swiss/RR, unlimited tiebreaks. **On-site:** digital check-in, auto board/table assignment, e-board integration, digital scoresheet tablets, arbiter dashboard, engine-correlation cheat detection. **Persistent global Elo rating** (recalculated post-event) + 15+ external federation ratings displayed. 10,000+ org pages. **Free platform**, transaction fee only (AUD $0.25 + 2.75%). `a:~ b:✗ c:✓ d:~ e:✓(Elo) f:~(orgs)`

**Playbook365** (USA; youth/amateur team sports; acq. by Travel+Leisure). All-in-one event mgmt + **hotel room-block housing**. 500+ bracket templates incl. pool→elim, drag-and-drop scheduling, eligibility enforcement. Player profiles + recruiting/scout tools. **No persistent cross-event ranking** (season standings only). Club-management + facility-management modules; large hotel network (not sports venues). Modular SaaS subscription. `a:✗ b:✓ c:~ d:~ e:✗ f:~(club+facility)`

## Whitespace map — where the landscape is empty

- **(f) Gaming-café network — zero in gaming.** Only adjacent verticals link clubs/federations/facilities (Smoothcomp, Tornelo, Playbook365). No gaming/esports platform has a venue/café network. → **biggest whitespace; Gameland-unique.**
- **(e) Persistent offline ranking — absent in esports.** Solved only in combat-sports/chess/community-ELO. Gameland's points-ladder model does not exist in gaming.
- **(c) Player honors page — only Liquipedia** (editorial, pros). No tournament host gives **amateur** players a self-serve honors page tied to the host's own events.
- **(a) The exact ticket/chance mechanic** (1–6 tickets, 6 prelims, 3 seeds → 128 final): **nobody native.** Closest: Smoothcomp (organizer-set max entries) + FACEIT (per-event tickets).
- **(d) Offline multi-account detection:** only FACEIT does smurf detection seriously, but **online/kernel-based** — does not transfer to offline café play (offline = identity-at-registration problem).
- **Store/marketplace + AI support bot:** in none of the 11 (outside their scope — these are commerce/support layers, not tournament features).

## 🔑 Key finding — structural twin = Smoothcomp, not FACEIT/Start.gg

Gaming copied the **online** model. Gameland's reality — **70% offline + persistent points ladder + club/café network + per-athlete economics** — maps to the **combat-sports** model (Smoothcomp), which already has: per-federation persistent ranking ✓, multi-stage pool→bracket ✓, offline check-in/weigh-in + scoreboard app ✓, club profiles linked to athletes ✓, per-athlete credit pricing ✓. The one thing **even Smoothcomp lacks = the café/venue network** — Gameland's defensible wedge.

## Monetization landscape (data)

| Model | Examples |
|---|---|
| Commission on registration | Start.gg 6% · Tornelo $0.25+2.75% · Challonge $0.75/checkout |
| Per-athlete credit | Smoothcomp ~0.6–1.25 € |
| Subscription | FACEIT $6/mo · Op.gg $3/mo · Challonge $7–12/mo · Toornament tiers |
| Free + ads | Liquipedia · Op.gg (base) |

→ Closest economic analog to an offline-heavy model: **per-athlete credit** (Smoothcomp). To be validated against Iran payment constraints (see [02](02-market-data.md)/[10](10-business-model.md)).

## Sources (representative)
Marcocial.com · about.smash.gg · help.start.gg · blog.toornament.com · help.battlefy.com · challonge.com/docs · support.faceit.com · op.gg · liquipedia.net · smoothcomp.com · tornelo.com · playbook365.com
*(Full per-platform source lists captured by the three benchmark research agents; can be exported to `research/` on request.)*
