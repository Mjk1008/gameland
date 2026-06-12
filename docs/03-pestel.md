# 03 — PESTEL Analysis (Iran)

**Stage:** Data · **Framework:** PESTEL · **Status:** ✅ complete (from [02-market-data](02-market-data.md)).
Each force → **implication for Gameland**.

## Political
- **Sanctions (US/OFAC)** cut off international payments, cloud (AWS/Azure/GCP), and foreign game services. → must be **fully domestic-hosted**, domestic-payment, local-store.
- **State stance on gaming is supportive-in-principle:** minister wants gaming "recognized as a profession"; IRCG actively promotes the industry. → legitimacy is available **if** you play inside the IRCG/IESA system.
- **Filtering policy** (Supreme Cyberspace Council) is volatile (Google Play/WhatsApp unblock voted Dec 2024, not implemented). → don't depend on any filtered channel for core flows.
- **IRCG / IESA are gatekeepers AND potential partners.** → partnership is both a moat and a risk-reducer.

## Economic
- **Severe inflation; Rial −37% vs USD in 2024 alone.** Hardware priced in USD → constant repricing. → price in coins/Toman with frequent adjustment; avoid USD-denominated commitments.
- **Low disposable income** (PS5 ≈ 10–12 months' wages). → mass monetization must be **micro** (small coin top-ups), not big upfront spend.
- **Gaming spend is resilient** (low-cost escapism) even in downturns; gamenets give access without owning hardware. → demand floor exists.
- **Gamenet economics fragile** (rent, hardware import, electricity). → B2B tools must clearly raise gamenet revenue/utilization.

## Social
- **Youth-heavy, avg age 25–29, female share rising to ~41%.** → design for young, increasingly mixed-gender audience.
- **Strong offline + community gaming culture**; competitions are social events. → offline-first is a *cultural* fit, not just a constraint.
- **Dark-social behavior:** Telegram + WhatsApp + Aparat + Instagram. → meet users in those channels; integrate, don't replace overnight.
- **Distrust of formal/online systems & multi-accounting norm.** → identity/anti-cheat and trust-building are product-critical.

## Technological
- **Low bandwidth (4–4.8 Mbps), high latency (136–146 ms), ~64–90% VPN use.** → offline-first, low-data UI, SMS fallback.
- **Sanctioned cloud** → Iran-hosted infrastructure required.
- **Mobile-first (96% usage), Android ~84%** → mobile/PWA primary; Cafe Bazaar/Myket for Android.
- **Blackout risk** (Jan 2026 total outage). → must degrade gracefully / work offline at venues.

## Environmental
- **Structural electricity deficit (~14,000 MW), rolling blackouts.** → gamenet operations (and any on-site tooling) need offline resilience; not a core platform blocker but a partner-side risk.

## Legal
- 🚨 **Gambling law (IPC 705)** — paid-entry prize pools = existential risk. **Keystone.**
- **IRCG licensing** (venue + per-competition + game distribution) bans player-to-player payment obligations.
- **eNamad + Samandehi** mandatory for online commerce/site.
- **Content rules** ban gambling/violence/etc.; **raffles** prohibited unless free/sponsor-funded.
→ full treatment in [11-risks](11-risks.md); reshapes [10-business-model](10-business-model.md).

## Net read
The macro-environment **forces** an offline-first, domestically-hosted, micro-monetized, IRCG-aligned, sponsor-prize model — which happens to align with Gameland's existing offline community. The constraints are real but **convert into differentiation** competitors haven't solved.
