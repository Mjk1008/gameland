# 12 — Tech Approach (plan only — build is last)

**Stage:** Plan → Build · **Status:** ⏳ pending Plan; **no code yet**

High-level approach (reusable across all 3 businesses — the "generator"):
- **Stack hypothesis:** Next.js (App Router) + Supabase (Postgres/Auth/RLS/Storage) + Tailwind + shadcn/ui + TypeScript.
- **Offline-first** considerations: low-bandwidth UI, resilient sync, SMS fallback for notifications (Iran connectivity).
- **Payments:** abstraction layer over Iranian gateways (ZarinPal/IDPay/Zibal) + wallet/coin model; Cafe Bazaar IAP for Android.
- **Core domain models:** Player, GamerProfile/Honors, Competition, Bracket, Ticket/Chance, Seed, RankingPoints, Gamenet, StoreItem.
- **Reusable starter:** this stack + auth + design tokens becomes the template forked for Business 2 & 3.

> Detailed architecture comes only after the plan (00–11) is locked. Do not start building before then.
