# Gameland — Web (MVP scaffold)

Phase-1 MVP per [docs/09-roadmap](../docs/09-roadmap.md): **ranking · Gamer Bank · competition execution · notifications.**

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · Persian/RTL · in-memory seed data (Postgres comes next).

## Run

```bash
cd web
npm install
npm run dev          # http://localhost:3000
npm run ranking:demo # CLI demo of the ranking engine
```

## What's wired

- `lib/schema.ts` — full TS domain schema (Player, Competition, PrelimBracket, Attempt, Seed, MatchResult, RankingEntry, CoinTxn, Sponsor, Prize, Notification). Legal-by-design: prizes carry a sponsor id (R1); coins are non-convertible (R6).
- `lib/ranking.ts` — points × tier-multiplier engine ([docs/14](../docs/14-ranking-design.md)). 52-week rolling window; honors page; tie-breaks.
- `lib/competition-engine.ts` — 6 prelim → 128 final logic ([docs/15](../docs/15-competition-engine.md)). Caps: 6 attempts, 3 seeds. Per-player roadmap.
- `lib/notifications.ts` — SMS-first template registry (Kavenegar-shaped). Stub provider.
- `lib/seed.ts` — mock 36 players + 4 competitions (Amol-eFootball-flavored, matching the real Gameland).

## Pages

- `/` — landing + top-10 ranking + recent competitions
- `/leaderboard` — full national eFootball ranking
- `/players` · `/players/[id]` — Gamer Bank index + honors profile
- `/competitions` · `/competitions/[id]` — competition page with per-player roadmap

## Next iterations

1. **Persist:** Postgres (Drizzle) on Iranian cloud per [docs/12](../docs/12-tech-approach.md).
2. **Ingest** founder's ~2k-gamer DB (Excel + PDF) per [docs/13](../docs/13-data-intake.md).
3. **Auth + organizer admin UI** (result entry).
4. **Coin wallet** (Shaparak gateway: ZarinPal/NextPay) + sponsor-funded prize flow.
5. **SMS provider** (Kavenegar) wired to live triggers.
