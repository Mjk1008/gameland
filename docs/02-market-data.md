# 02 — Market Data (Iran)

**Stage:** Data · **Status:** ✅ complete (5 research streams) · Raw sources in [`../research/`](../research/).
Confidence tags [H/M/L]. USD ≈ 700–750k Toman (mid-2025, volatile). Many Iran figures are estimates — gaps flagged.

---

## §1 — Gaming & esports market

- **~34M gamers** (IRCG 2022) [M]; minister cited 30M [H]. Penetration ~34–40% of population. Trajectory 23M(2015)→34M(2022).
- **Market revenue 2024: ~$790M–$930M** [M]; **mobile ~65%** ($605M). 2018 official split: hardware 53%, mobile 25%, console/PC small.
- **Platform usage** (IRCG 2022, multi-select): mobile **96%**, console **88%**, PC **59%**. Mobile dominance is **economic** (console/PC priced via gray market). Revenue ~65% mobile.
- **Demographics:** avg age **25–29** (rising from ~19 in 2018); **38–41% female**; concentrated **Alborz/Tehran** (no city % public).
- **Popular games:** PC — eFootball/PES, CS, CoD, EA FC/FIFA; mobile huge. Esports-active: **CS2, eFootball, Mobile Legends, Dota 2, VALORANT**.
- **Esports reality:** governed by **IESA** (IESF rep). International earnings inflated by chess (Firouzja, plays for France). **Formal domestic viewership tiny** (Iran CS2 event peaked **248 viewers**) — but real grassroots activity lives on Aparat/Telegram, untracked. → audience is **engaged-but-dark**, not measured.
- **Infra (decisive):** avg **4–4.8 Mbps**, **136–146 ms** latency; **~64–90% use VPN**; sanctions block AWS/Azure/GCP, Steam/PSN/Xbox; can't publish to Google Play/App Store → **local stores (Cafe Bazaar 56M users, Myket)**.

→ **Implication:** mobile-first reach + **offline-first** architecture are mandatory, not stylistic. Console/PC gaming is premium/gray-market → concentrated in **gamenets**.

---

## §2 — Gamenet (گیم‌نت) landscape

- **Count:** 302 **licensed** (IRCG registry, undercount) [H]; ~12,709 cafenet+gamenet (Bankyab) [M]; Tehran ~2,000 with ~90% unlicensed [L]. Old کافی‌نت declining; premium گیم‌سنتر rising.
- **Model:** hourly rental — PC 30–50k T/hr, PS5 90–150k T/hr (VIP→200k). 3–5× price rise in 2–3 yrs. Scale: 6–8 systems (provincial) → 38–60 PCs + console room (premium Tehran).
- **Licensing:** dual — **IRCG بازیگاه license** + **اتحادیه/صنف** business permit. Strict (≥25m², ESRA-only games, **separate per-tournament permit**, no café combo).
- **Role:** gamenets = **primary physical esports infrastructure**; grassroots LAN tournaments. Infinity (Tehran) markets as pro-team training facility.
- **Whitespace:** **NO franchise network** (only Sicily, 2 branches), **NO independent trade association**, directories fragmented (Balad.ir best). [H]
- **Korea reference:** PC-bangs peaked ~25,000 (2009) → ~8,152 (2023), −62%. Viable at national-network scale, vulnerable to mobile shift; F&B now a key supplement.

→ **Implication:** gamenets are an **unorganized, ungoverned, fragmented** layer that is *already* the offline esports backbone → a natural network/distribution wedge with no incumbent aggregator.

---

## §3 — Payments & monetization

- **International rails ALL dead** (Stripe/PayPal/Visa/MC/SWIFT/Apple/Google Pay) [H].
- **Domestic = Shaparak/Shetab.** Gateways: ZarinPal (1%, cap ~3–4k T), **NextPay** (1%, cap 800 T), IDPay, Zibal (0.5–1%), Vandar, Jibit (0.5%). Fees tiny in USD. T+1 settlement.
- **Requirements:** Iranian entity/ID + bank account (Shaba) + tax code + **eNamad** + **Samandehi**; **games sold online need IRCG license**.
- **Mobile IAP:** Google Play/App Store dead. **Cafe Bazaar** (~90–97% Android, 30% + 9% VAT) / **Myket** (15%). **iOS: no domestic path.** Android ~84% of market.
- **Wallet/coin (سکه) pattern is standard & advantageous:** top up once via Shaparak → spend internal coins (smooths micropayments, avoids per-tx fees). **Non-convertible coins are NOT regulated as crypto.**
- **Crypto = banned** for domestic payment.

→ **Implication:** monetization = **Shaparak + non-convertible coin wallet** (mirrors Smoothcomp per-athlete credit). Web/PWA avoids the 15–30% store tax; Bazaar/Myket reach the mass Android base at that cost.

---

## §4 — Regulation & legal (summary; full register in [11-risks](11-risks.md))

🚨 **Keystone constraint.**
- **Gambling (IPC Art. 705):** paid-entry → prize-pool → winner = functionally a bet. **No skill-competition safe harbor** in law. 2023–24 amendments cover online + add capital-offense pathway for large operators. Enforcement 10/10.
- **IRCG venue license explicitly bans "any betting, gambling, or payment obligations between players."** The ticket/chance prize-pool mechanic, as briefed, **cannot be licensed as-is**.
- **Raffle/قرعه‌کشی:** no private-draw permit; permissible only **free-entry or sponsor-funded** prizes.
- **App stores reject** gambling mechanics; **filtering** blocks foreign platforms; VPN dependency is fragile (Jan 2026 blackout).
- ✅ **Legal template (IRCG's own Champions Cup):** **prizes funded by sponsors/state, not by pooled entry fees**; entry = service/skill, not a stake; **non-convertible coins**.

→ **Implication:** the revenue model must **decouple entry from prize**, fund prizes via **sponsors**, frame entry as a **skill-competition service**, and pursue **IRCG/IESA partnership** for legitimacy. This reshapes [10-business-model](10-business-model.md) and [09-roadmap](09-roadmap.md).

---

## §5 — Gameland footprint & competitors

- **Gameland footprint: real but research-invisible** [founder-stated]. Founder reports **~60K Instagram followers** (@gamelandteam) + a **promo network of allied gamers**, and a **~2,000-gamer database** (Excel + PDF: phone, first/last name, discipline) from past competitions. Public research tools couldn't index it (IG filtered, dark-social) — but the audience is real. (Earlier "near-zero" read was a tooling blind spot, now corrected.) Brand clashes exist (gamelandstudio.com etc.) but **name = Gameland is fixed.**
  - → **Warm launch base:** ~60K IG + influencer promo + ~2k contactable gamers + (later) gamenets. Not a cold start.
- **Direct competitors:**
  - **Marcoverse (مارکوورس)** — sharpest threat: gamer **social network + store + team registration + competitions**, FIFA "50M Cup" with in-person prelims in **6 cities**. Sister product of Marcocial.
  - **OxinGame** — dominant brand: physical complexes (Tehran/Isfahan/Ahvaz), **@oxingame 70K**, CS2 prize 300M T.
  - ICG (200M+ T festivals), Iran-Esport.ir (PUBG, 150M T leagues), Bazichi (grassroots PUBG), BATTLEGAME, Iran Game Tour.
  - Official: IESA, IRESL (virtual football league), Eligo, IRCG Champions Cup, ESPL.
- **Market is fragmented by single game** (PUBG / CS / FIFA silos). **No one owns cross-game persistent identity + ranking + gamenet network** → confirms the whitespace from [01-benchmark](01-benchmark.md).
- **Standard workflow:** Instagram (announce) → Telegram (register/brackets) → WhatsApp (coordinate) → Aparat (stream).

→ **Implication:** position explicitly against **Marcoverse** (online-social) and **OxinGame** (venue-brand); win on **offline-first cross-game identity + ranking + the gamenet network** none of them own. Bootstrap via Gameland's **~60K IG + gamer-promo network + the 2k-gamer DB** (warm base; IG via ubiquitous VPN), then gamenets.

---

## Top data-driven implications (carried into Idea & Plan)
1. **Offline-first + mobile** is mandatory (infra/sanctions/filtering).
2. **Monetization must be legally re-architected** (sponsor-funded prizes + coin wallet + skill framing). Keystone.
3. **Gamenet network = the defensible wedge** (no aggregator exists; gamenets are the offline backbone).
4. **Cross-game persistent identity + ranking** is unclaimed in Iran.
5. **GTM = warm base, not cold:** ~60K IG + gamer-promo network + ~2k-gamer DB (seed the Gamer Bank/ranking) → then gamenets. (IG filtered but reached via ubiquitous VPN.)
6. Compete head-on with **Marcoverse**; differentiate from **OxinGame**.
