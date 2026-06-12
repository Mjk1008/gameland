# Gameland — Strategy & Product Plan

> **Business 1 of 3.** An Iran-focused gaming **tournament + community platform**.
> Owner: **@Gamelandteam** (گیم‌لند). Reference benchmark: [marcocial.com](https://marcocial.com).
> Status: **PLANNING** — no app code yet. Build is the *last* phase.

This repo holds the full strategy and product plan for Gameland, produced **before** any code, using a fixed pipeline and a skill-based method.

## What Gameland is — the 4 pillars
1. **Gamer Bank** — a rich, professional profile for every player (city, contact, games, play-style, honors page e.g. "16× Iran champion").
2. **Tournament platform** — annual competition calendar, pro notifications, per-player bracket roadmap, multi-account detection, and a ticket/chance entry model (buy 1–6 tickets → 6 preliminary brackets → up to 3 seeds into a 128-player final).
3. **Network & commerce** — a gaming-café (گیم‌نت) network/directory, a store/marketplace (games, controllers, packages), and an AI support bot.
4. **Persistent ranking** — offline-first points ladder (champion 1000, 2nd 800, 3rd 500; all-star 500/300/150; top-32 = 30).

## Method — the pipeline
**Benchmark → Data → Idea → Plan → Build.** Build is last. We do not jump to solution before the plan is complete.

Each stage uses skills/frameworks: TAM-SAM-SOM, PESTEL, JTBD, proto-personas, positioning, opportunity-solution tree, PRD, roadmap, business model, risk register.

## Status — plan complete ✅ (build not started)
- [x] **Benchmark** — 11 platforms → [`docs/01`](docs/01-benchmark.md)
- [x] **Data** — Iran market / gamenet / payments / regulation / footprint → [`docs/02`](docs/02-market-data.md), [`docs/03`](docs/03-pestel.md) (raw in [`research/`](research/))
- [x] **Idea** — positioning / JTBD / personas / opportunity tree → [`docs/04`–`07`](docs/04-positioning.md)
- [x] **Plan** — PRD / roadmap / business model / risks / tech → [`docs/08`–`12`](docs/08-prd.md)
- [ ] **Build** — gated on Phase 0 legal opinion (see below)

## 🚨 Keystone finding (read first)
The briefed **"buy 1–6 chances/tickets for a prize competition"** mechanic = likely **illegal gambling** in Iran (IPC Art. 705; IRCG bans player-to-player payment obligations; app stores reject it). **It must be re-architected, not dropped:** sponsor-funded prizes (not entry pools) + skill-service entry + non-convertible coin wallet — the model IRCG's own Champions Cup uses. A lawyer's opinion is a **Phase 0 gate**. Full detail: [`docs/11-risks.md`](docs/11-risks.md).

Two more decisive findings: **(1)** Gameland's structural twin is **Smoothcomp** (combat-sports), not FACEIT/Start.gg ([`01`](docs/01-benchmark.md)); **(2)** the **gamenet network** is whitespace no competitor owns ([`02`](docs/02-market-data.md)) — the moat.

## Map of docs
| # | Doc | Stage | Framework |
|---|-----|-------|-----------|
| 00 | [Overview](docs/00-overview.md) | — | brief distilled |
| 01 | [Benchmark](docs/01-benchmark.md) | Benchmark | competitive matrix |
| 02 | [Market data](docs/02-market-data.md) | Data | market sizing |
| 03 | [PESTEL](docs/03-pestel.md) | Data | PESTEL |
| 04 | [Positioning](docs/04-positioning.md) | Idea | Moore positioning |
| 05 | [Jobs-to-be-done](docs/05-jtbd.md) | Idea | JTBD |
| 06 | [Personas](docs/06-personas.md) | Idea | proto-personas |
| 07 | [Opportunity tree](docs/07-opportunity-tree.md) | Idea | opportunity-solution tree |
| 08 | [PRD](docs/08-prd.md) | Plan | PRD |
| 09 | [Roadmap](docs/09-roadmap.md) | Plan | phased roadmap |
| 10 | [Business model](docs/10-business-model.md) | Plan | TAM-SAM-SOM + unit economics |
| 11 | [Risks](docs/11-risks.md) | Plan | risk register |
| 12 | [Tech approach](docs/12-tech-approach.md) | Plan→Build | reusable SaaS starter |
