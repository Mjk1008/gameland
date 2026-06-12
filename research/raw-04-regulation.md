# RAW — Iran Esports/Gaming Regulation & Prize Law (research agent 4)

> ⚠️ KEYSTONE constraint. Not legal advice. Synthesized into [`../docs/11-risks.md`](../docs/11-risks.md) + [`../docs/03-pestel.md`](../docs/03-pestel.md). Confidence tags inline.

## 1. Gambling law (قمار) — CORE RISK [H]
- **Islamic Penal Code Art. 705–711.** Art. 705: gambling "by any means" criminal (1–6 mo prison or ≤74 lashes). Art. 708: running a gambling establishment 6 mo–2 yr.
- **2023–24 amendments:** explicitly extended to online/internet; large operators chargeable with **Ifsād fil-ardh (corruption on earth) = capital offense**.
- **No statutory "skill competition" safe harbor** in digital contexts. Only permitted wager-adjacent: horse/camel racing, archery (narrow, non-expandable).
- 2022 Guilan Univ. legal journal: sports betting doesn't *technically* meet Art. 705, but "no clear legal framework" exists → ambiguity itself is the risk.
- 2018 AG directive: computer-based betting on outcomes = gambling OR illegal property acquisition; medium irrelevant.
- **Paid-entry → pool → skill winner takes prize:** *could* be argued skill competition, but **high risk** — entry-funded prize pool is functionally a bet; no safe harbor; posture tightening.
- **Enforcement 10/10.** Nitro Bet (Mar 2024): 54 sites, 35,006 accounts, 1,200 gateways, 5 arrests. 2019: 61 sites blocked in 2 months.

## 2. Raffles / قرعه‌کشی [M]
- Iran has **no state lottery** (blanket prohibition). No documented permit pathway for private commercial online draws.
- **Fiqh safe harbor:** raffle permissible ONLY if entry free, OR prizes funded by sponsors/ads (not entry pool) with fees covering ops only. Paid-entry pool draw = haram + illegal.
- Exception: state automakers (Iran Khodro/SAIPA) run car قرعه‌کشی under Ministry of Industry oversight — *product-linked*, state-affiliated; not a model for private platforms.

## 3. IRCG & esports licensing [H]
- **IRCG (بنیاد ملی بازی‌های رایانه‌ای)**, Min. Culture affiliate (2007). Issues game distribution licenses, ESRA ratings, **بازیگاه (gaming venue) licenses**, runs national tournaments. Can ban titles.
- **Venue license EXPLICITLY prohibits "any betting, gambling, or payment obligations between players."** ← the ticket/chance prize-pool mechanic is exactly a payment obligation between players.
- **Competitions require SEPARATE authorization** from IRCG (no public process/fees found).
- Virtual game store license via Ebazi.org: domain verification + "only permitted games."
- State tournaments (IRCG Champions Cup) work because **prizes come from state/sponsors, not pooled entry fees.** ← the legal template.

## 4. Content/platform permits [H]
- **eNamad** (نماد اعتماد, Min. Industry, ~60-day) → prerequisite for **Samandehi** (ساماندهی, Min. Culture, site registration, prevents filtering).
- **ESRA** rating (~2 wk) + IRCG distribution license for games.
- Prohibited content (all platforms incl. Bazaar/Myket): **gambling**, intense violence, nudity, sexual, alcohol, anti-Islamic/state. (Clash of Clans banned.)

## 5. Filtering — reach [H]
- Blocked: Steam, Epic, Twitch, Discord, YouTube, Xbox, PlayStation, Instagram, Twitter/X, TikTok, (Google Play 2022–Dec 2024, WhatsApp). Dec 2024 council voted to unblock GP/WhatsApp — pending ratification, still inaccessible early 2025.
- Foreign games **double-blocked** (Iran filter + US OFAC: Steam/Epic/EA/Xbox/Riot disable Iranian accounts).
- **81–90% use VPNs** (Parliament Feb 2025); VPN market ~$1B/yr; "unauthorized" VPNs banned Feb 2024. **Jan 2026 total blackout rendered even VPNs useless** → connectivity fragility.

## 6. App distribution [H]
- Google Play: payments blocked (OFAC) even if filter lifted.
- **Cafe Bazaar:** ~90–97% Android share, 40–50M MAU, 1.5B downloads, ~30% commission + 9% VAT, Shetab only, **no gambling**.
- **Myket:** ~29M MAU, ~55M installs, ~15%, Shetab, no gambling.
- → paid-entry-prize mechanic visible in app = **rejected** at review.

## 7. Precedents
- Gambling enforcement aggressive (Nitro Bet; 2019 wave).
- **No documented case of an esports/fantasy platform shut for gambling** — but ≠ safe harbor (likely none scaled to enforcement size yet).
- Esports Insider (Jun 2026): Iran esports pain driven by **sanctions + filtering**, not (yet) domestic gambling enforcement.

## BIGGEST RISKS (ranked)
1. **Gambling classification (CRITICAL/existential)** — paid-entry prize pool = Art. 705; up to capital charge for large operators.
2. **IRCG ban on player payment obligations (HIGH)** — core mechanic can't get venue license as-is.
3. **App-store rejection (HIGH)** — Bazaar/Myket reject gambling mechanics.
4. **Filtering dependency (HIGH)** — blocked platforms + VPN illegality + blackout fragility.
5. **Raffle illegality (HIGH)** — no private-draw permit; only free/sponsor-funded.
6. **Payment infra (MED-HIGH)** — Shetab only; gambling-linked accounts blocked by CBI/FATA.
7. **US sanctions (MED)** — foreign-game access can vanish unilaterally.

## Mitigation patterns (from the data)
- **Decouple entry fee from prize pool**; prizes **sponsor/ad-funded**; entry = service/ops cost; explicit **skill** framing.
- **Non-convertible coin/wallet** (not cashable) avoids crypto/gambling-money classification.
- Partner with **IRCG/IESA** for legitimacy; pursue venue + per-competition authorization in the sponsor-funded form.
- **Offline-first + Iran-hosted + domestic/locally-licensed games** to sidestep filtering + foreign-game sanctions.

## Sources
dadista.org, g2g.news, igamingtoday, gamblingmaps.org, legalpilot, journalppw (raffle fiqh), seekersguidance, jsmd.guilan.ac.ir, en.ircg.ir/service (+/16), portal.ircg.ir/home/gnet_instruction, en.wikipedia (IRCG / Internet_censorship_in_Iran / Cafe_Bazaar), freedomhouse 2024, filter.watch, digitaliranproject, iranintl (VPN 81% / GP-WhatsApp / car lottery / gambling boom), siliconangle, tehrantimes + yogonet (Nitro Bet), esportsinsider 2026, unodc IPC PDF, portal.ir (samandehi), rtl-theme.
