# 11 — Risk Register

**Stage:** Plan · **Status:** ✅ complete (from [02](02-market-data.md)/[03](03-pestel.md) + [`research/raw-04-regulation.md`](../research/raw-04-regulation.md)).
Rated Likelihood × Impact (L/M/H). Ordered by severity.

| # | Risk | L | I | Mitigation |
|---|------|---|---|-----------|
| **R1** | 🚨 **Gambling classification.** Paid entry → prize pool → winner = IPC Art. 705 bet; capital-offense pathway for large operators. | H | **Existential** | **Decouple entry from prize.** Prizes **sponsor/state/ad-funded** (IRCG Champions-Cup template). Entry = skill-competition **service fee** / coin, never a stake. Explicit **skill** framing. Legal opinion + IRCG/IESA blessing **before** monetizing. |
| **R2** | **IRCG venue license bans player-to-player payment obligations** → core ticket/chance mechanic unlicensable as briefed. | H | H | Re-architect "chances" as **paid practice/attempts or coin-funded services**, not pooled stakes. Obtain **per-competition authorization** in sponsor-funded form. |
| **R3** | **App-store rejection** (Bazaar/Myket ban gambling mechanics). | H | H | Don't surface any entry-fee→prize mechanic in-app. Ship **web/PWA first**; app shows skill-competition + coins, prizes shown as sponsor-awarded. |
| **R4** | **Filtering / connectivity fragility** (blocked platforms, VPN illegality, total-blackout precedent). | H | H | **Offline-first**, Iran-hosted, low-data. Core flows survive without intl access; SMS fallback; venue-local operation during outages. |
| **R5** | **Raffle/قرعه‌کشی (قرعه براکت‌بندی) illegality** if paid. | M | H | Seeding/draws must be **deterministic/skill-based or free**; any draw prizes **sponsor-funded**, framed as promotion not lottery. |
| **R6** | **Payment infra** — Shetab only; gambling-linked accounts blocked by CBI/FATA; settlement to winners. | M | H | Clean **non-convertible coin wallet**; sponsor pays prizes directly/through compliant channel; keep transaction descriptors service-based; eNamad compliance. |
| **R7** | **Adoption inertia** — moving organizers/players off Instagram+Telegram+WhatsApp habit; Gameland's online reach ≈ 0. | H | M | **Integrate** (Telegram bot, WhatsApp links, Aparat) rather than replace. Bootstrap via **offline community + gamenet partnerships**. Migrate one flagship game first. |
| **R8** | **Direct competition — Marcoverse** (social+store+competitions) & **OxinGame** (venue brand). | M | M | Win on **offline-first cross-game identity + persistent ranking + gamenet network** none own. Speed on the gamenet wedge. |
| **R9** | **Currency volatility** (Rial −37%/yr) erodes pricing & planning. | H | M | Price in coins/Toman, frequent re-pricing; favor **B2B gamenet subscriptions** for revenue stability; avoid USD liabilities. |
| **R10** | **US sanctions on foreign games** (Riot/Valve/EA accounts disabled). | M | M | Center on **locally-accessible / offline console-PC play** at gamenets + domestically-licensed titles; treat foreign-online titles as bonus, not foundation. |
| **R11** | **Multi-account / integrity** without kernel anti-cheat (offline reality). | M | M | **Identity-at-registration** (phone/ID/gamenet vouching), human-verified honors, gamenet check-in — not online kernel AC. |
| **R12** | **Electricity / hardware (gamenet side)** — blackouts, import costs. | M | M | Platform-side resilience; position IRCG dedicated-internet hook; don't take on hardware capex. |

## Founder direction on legal (2026-06-12)
Per founder: competitions are already run widely (incl. IRCG), so **permits come later and are NOT a pre-build gate.** Accordingly R1/R2 are managed by **design**, not by a blocking gate: keep prizes **sponsor-funded** (never entry-pool), entry as a **skill-service**, coins **non-convertible**, and pursue IRCG/IESA alignment + permits **in parallel / as you scale**. The residual risk is real but **scales with cash-prize-pool size** — a qualified Iranian gaming lawyer's review is recommended **before monetizing prize pools at scale**, not before building the ranking/competition/notification MVP (which needs no prize money).
