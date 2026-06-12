# 10 — Business Model

**Stage:** Plan · **Frameworks:** TAM-SAM-SOM + unit economics · **Status:** ✅ v1 (from [02](02-market-data.md)). Sizing is directional — primary data gaps flagged.

## TAM-SAM-SOM (directional; assumptions explicit)
> Iran market data is fuzzy; treat as order-of-magnitude, not precise. All [confidence: L–M].

- **TAM — all Iranian gamers & gaming spend.** ~34M gamers; gaming market ~$790–930M/yr (2024). The value pool Gameland touches = competition participation + gamenet time + gaming commerce.
- **SAM — competitive/organized-play segment + gamenets.** Gamers who play **daily (56%)** and engage organized competition + the **gamenet B2B layer** (hundreds licensed, thousands real). Rough serviceable population: **low-millions of "serious" players + ~several-thousand gamenets**. *(Assumption: ~5–15% of gamers are competition-oriented.)*
- **SOM — reachable in 1–3 yrs.** One flagship discipline (e.g. **eFootball/EA FC** — Gameland's offline strength) in Tehran + a few cities, seeded via Gameland's offline community + **partner gamenets**. Target order: **tens of thousands of active players + a few hundred gamenets**. *(Assumption: bootstrap is offline/partnership-led since online reach ≈ 0.)*

→ Precise sizing requires primary data (IRCG "Namaaye Baaz 1402", gamenet census, Gameland's own community numbers) — see data gaps in [02](02-market-data.md).

## Revenue streams (all legally re-architected — see [11-risks](11-risks.md) R1/R2)
1. **Sponsor-funded competitions** — brands fund prize pools; Gameland charges **sponsorship/production fees**. *(Legal template: IRCG Champions Cup. Prizes NOT from entry pool.)* — primary, lowest legal risk.
2. **Coin wallet (سکهٔ غیرقابل‌نقد)** — players buy non-convertible coins for **entry-as-service, extra attempts, cosmetics, store** — margin on coin sales. *(Not cashable → not gambling/crypto.)*
3. **Gamenet network (B2B)** — subscription/listing tiers for gamenets (profile, hosting tools, discovery, talent-scouting), + commission on bookings/events. — most **stable** revenue amid currency swings.
4. **Store / marketplace** — margin on IRCG-licensed games, controllers (دسته), packages. Supply/demand fees.
5. **Organizer SaaS** — paid tournament-management tools (brackets, notifications, roadmap) for third-party organizers.
6. **Featured ranking / data** — sponsored placements, anonymized gamenet/market data (B2B).

## Unit economics (hypothesis)
- **Player ARPU is micro** in USD (Rial reality) → volume + frequency game; coin top-ups small & repeated. Closest analog: **Smoothcomp per-athlete credit** (~0.6–1.25 €) — but Iran pricing far lower; rely on scale.
- **Gamenet subscription** = higher, more stable per-account revenue; anchor of early monetization.
- **Sponsor deals** = lumpy but high-margin; fund prizes + marketing.
- Payment cost: Shaparak gateway ~1% (cap ~800–4k T) — negligible per top-up; **coin wallet batches** top-ups to cut per-tx friction. Android store tax (Bazaar 30% / Myket 15%) avoided on **web/PWA**.

## Pricing hypothesis (to validate)
- **Players:** free to join + compete; **coins** for extra attempts/cosmetics/store. No pay-to-win, no stake-to-prize.
- **Gamenets:** freemium profile → paid tiers (hosting tools, featured, scouting).
- **Sponsors:** tiered competition-sponsorship packages.
- **Organizers:** SaaS subscription or per-event fee (service, not stake).

## Why this model fits the constraints
It **decouples revenue from the gambling line** (R1/R2), runs on **domestic rails** (coin wallet + Shaparak), earns **stable B2B income** from the **gamenet wedge** competitors ignore, and monetizes **micro** to fit Iranian incomes — while sponsor money (not players' stakes) funds the prizes that drive engagement.
