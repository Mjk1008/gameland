# 12 — Tech Approach (plan only — build is last)

**Stage:** Plan → Build · **Status:** ✅ v1 architecture intent; **no code until [Phase 0](09-roadmap.md) gate.**

## ⚠️ Critical constraint: foreign cloud is sanctioned/blocked
AWS/Azure/GCP — and therefore **hosted Supabase, Vercel, etc.** — are sanctioned and/or filtered for Iran ([02 §1](02-market-data.md), [raw-04](../research/raw-04-regulation.md)). The earlier "Supabase + Vercel" generator assumption **does not hold for an Iran-facing product.**

**Resolution:** keep the *patterns/skills*, change the *hosting target*:
- **Iran-hosted infra** — ArvanCloud / local VPS / domestic IaaS + domestic CDN.
- **Self-hosted open-source Supabase** (Postgres + GoTrue auth + PostgREST + Storage) on Iranian infra, **or** plain **Postgres + a Next.js/Node API** on Iranian hosting.
- **Domestic payment** (Shaparak gateway: ZarinPal/NextPay) + **non-convertible coin wallet**.
- **SMS provider** (domestic, e.g. Kavenegar) for notifications — not filtered IG/WhatsApp.

## Stack hypothesis (Iran-adapted)
- **Frontend:** Next.js (App Router) + Tailwind + shadcn/ui + TypeScript, **PWA**, **RTL/Persian**, low-bandwidth/offline-first.
- **Backend:** Postgres (self-hosted Supabase or plain) + RLS + Storage, on **Iranian cloud**.
- **Payments:** gateway abstraction (ZarinPal/NextPay) + coin-wallet ledger.
- **Notifications:** SMS-first (domestic) + in-app; optional Telegram bot bridge.
- **Mobile (later):** Android via Cafe Bazaar / Myket (web-wrapped or native); **iOS has no viable IAP path.**

## Core domain models
`Player` · `GamerProfile` · `Honor` · `Discipline`(game) · `Competition` · `PrelimBracket` · **`Entry`/`Attempt`** *(skill-service, NOT a stake)* · `Seed` · `Match` · `RankingPoints`(per discipline × event-tier) · `Gamenet` · `GamenetMembership` · `CoinWallet` · `CoinTxn`(non-convertible) · `Sponsor` · `Prize`(**sponsor-funded**) · `StoreItem` · `Notification`.

## Legal-by-design in the schema
- No `Entry.amount → Prize.pool` link. `Prize.fundedBy = Sponsor` enforced.
- `CoinTxn` non-convertible (no cash-out path) → not crypto/gambling money.
- `Entry` typed as service/attempt, not wager.

## Reusable "generator" (for Businesses 2 & 3)
The **Iran-adapted starter** — Next.js PWA + self-hosted Postgres/Supabase on Iranian cloud + Shaparak/coin-wallet + SMS + RTL design tokens + auth — becomes the **template forked** for the next two businesses. (This is the corrected generator: the *Iran hosting + payments + offline-first* layer is the reusable core, not foreign-cloud Supabase.)

## Build rule
Detailed architecture & code only **after** docs 00–11 are locked and the **legal gate** ([09 Phase 0](09-roadmap.md)) passes. Do not start building before then.
